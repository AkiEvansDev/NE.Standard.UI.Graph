using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;

namespace NE.Standard.UI.Graph;

/// <summary>
/// The disk as the file kinds reach it: a path on the server, absolute or relative to <see cref="BasePath"/>, and what may be read
/// or written (<see cref="Allow"/>).
/// </summary>
/// <remarks>
/// With no <see cref="Allow"/>, everything the process may touch. Registered by <c>services.AddGraphFiles(...)</c>; unregistered,
/// the file kinds reach nothing: a canvas is a page anyone viewing it drives, so the disk is opened to it on purpose or not at all.
/// </remarks>
public sealed class UINodeFiles
{
    /// <summary>The most bytes a file kind reads of one file unless the application says otherwise: 64 MB.</summary>
    public const long DefaultMaxReadBytes = 64L * 1024 * 1024;

    // As many links as a path may lead through before it is taken for a loop: what Linux allows.
    private const int MostLinks = 40;

    private static readonly UINodeFiles Closed = new() { IsClosed = true };

    // As the system compares names: on a case-sensitive disk `/srv/WORK` is another folder than `/srv/work`, which a check blind
    // to case would let by.
    private static readonly StringComparison NameComparison = OperatingSystem.IsWindows() || OperatingSystem.IsMacOS() ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal;

    /// <summary>
    /// Gets the folder a relative path is resolved against; empty, the process's current directory.
    /// </summary>
    public string BasePath { get; init; } = string.Empty;

    /// <summary>
    /// Gets the application's own check of a full path before a file kind reads or writes it; refused, the node fails with why.
    /// </summary>
    /// <remarks>
    /// The path is the one the file kind will open: full, and with every link along it followed (<see cref="RealPath"/>), so a link
    /// inside an allowed folder leads nowhere the check has not seen. A check comparing against folders does so by <see cref="IsInside"/>.
    /// </remarks>
    public Func<string, UINodeFileAccess, bool>? Allow { get; init; }

    /// <summary>Gets the most bytes a file kind reads of one file; a larger file fails the node.</summary>
    /// <remarks>A node holds what it reads in memory, and a page anyone viewing drives may name any file the check lets through.</remarks>
    public long MaxReadBytes { get; init; } = DefaultMaxReadBytes;

    /// <summary>Whether this is the stand-in for files no application registered, which refuses every path.</summary>
    private bool IsClosed { get; init; }

    /// <summary>
    /// The files the application registered for a run, or, with none registered, ones that refuse every path.
    /// </summary>
    public static UINodeFiles Of(UINodeRunContext context)
    {
        ArgumentNullException.ThrowIfNull(context);

        return context.Services?.GetService(typeof(UINodeFiles)) as UINodeFiles ?? Closed;
    }

    /// <summary>
    /// The full path on disk of a file or folder a node names, once the application's check lets <paramref name="access"/> through.
    /// </summary>
    public string Resolve(string path, UINodeFileAccess access = UINodeFileAccess.Read)
    {
        if (string.IsNullOrWhiteSpace(path))
            throw new InvalidOperationException("No path.");

        if (IsClosed)
            throw new UnauthorizedAccessException("The file kinds reach no disk until the application opens it to them: services.AddGraphFiles(new UINodeFiles { ... }).");

        var full = RealPath(Path.GetFullPath(path, string.IsNullOrEmpty(BasePath) ? Directory.GetCurrentDirectory() : BasePath));

        return Allow is null || Allow(full, access)
            ? full
            : throw new UnauthorizedAccessException($"The application does not let the file kinds {(access == UINodeFileAccess.Write ? "write" : "read")} '{path}'.");
    }

    /// <summary>
    /// The full path of a file or folder with every link along it followed — a symbolic link or a junction — the way the system
    /// will follow them to open it; what is not there yet is taken as named.
    /// </summary>
    /// <remarks>What <see cref="Allow"/> is given, and how an application names the folders its check compares against.</remarks>
    public static string RealPath(string path)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(path);

        var current = Path.GetFullPath(path);
        var at = Path.GetPathRoot(current)?.Length ?? 0;
        var followed = 0;

        while (at < current.Length)
        {
            var next = current.IndexOfAny([Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar], at);
            var end = next < 0 ? current.Length : next;
            var step = current[..end];

            if (end == at || LinkOf(step) is not { } target)
            {
                at = end + 1;
                continue;
            }

            if (++followed > MostLinks)
                throw new IOException($"Too many links along '{path}'.");

            // A link's target is taken from the folder the link stands in; and since the target may itself stand under a link,
            // the walk starts over from its root.
            var resolved = Path.GetFullPath(target, Path.GetDirectoryName(step) ?? step);

            current = next < 0 ? resolved : Path.GetFullPath(Path.Join(resolved, current[(next + 1)..]));
            at = Path.GetPathRoot(current)?.Length ?? 0;
        }

        return current;
    }

    /// <summary>Where a link leads, as it is written; null for anything that is no link, or nothing at all.</summary>
    private static string? LinkOf(string path)
        => Directory.Exists(path) ? new DirectoryInfo(path).LinkTarget : new FileInfo(path).LinkTarget;

    /// <summary>
    /// Whether a path is a folder or stands inside it: both named as <see cref="RealPath"/> names them, and compared as the system
    /// compares names — ignoring case on Windows and macOS, not elsewhere.
    /// </summary>
    /// <remarks>
    /// What a check (<see cref="Allow"/>) compares by. A path that only begins with the folder's name — <c>D:\Work2</c> against
    /// <c>D:\Work</c> — is not inside it, and neither is one a link inside the folder leads out of.
    /// </remarks>
    public static bool IsInside(string path, string folder)
    {
        var real = Path.TrimEndingDirectorySeparator(RealPath(path));
        var within = Path.TrimEndingDirectorySeparator(RealPath(folder));

        // A root keeps its separator when trimmed, and takes no second one.
        return string.Equals(real, within, NameComparison)
            || real.StartsWith(Path.EndsInDirectorySeparator(within) ? within : within + Path.DirectorySeparatorChar, NameComparison);
    }

    /// <summary>
    /// The files in a folder a node names that match a pattern — <c>*.png</c>, or several as <c>*.png;*.jpg</c> — in name order.
    /// </summary>
    /// <remarks>Named the way the folder was; hidden files and links left out.</remarks>
    public IReadOnlyList<string> List(string folder, string pattern, bool recursive)
    {
        var full = Resolve(folder);

        if (!Directory.Exists(full))
            throw new InvalidOperationException($"There is no folder '{folder}'.");

        EnumerationOptions options = new()
        {
            RecurseSubdirectories = recursive,
            IgnoreInaccessible = true,
            MatchCasing = MatchCasing.CaseInsensitive,
            // Links as well: a folder linked back into itself would never end a recursive walk.
            AttributesToSkip = FileAttributes.Hidden | FileAttributes.System | FileAttributes.ReparsePoint
        };

        SortedSet<string> found = new(StringComparer.Ordinal);

        foreach (var one in (string.IsNullOrWhiteSpace(pattern) ? "*" : pattern).Split(';', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            foreach (var file in Directory.EnumerateFiles(full, one, options))
            {
                // A pattern may lead out of the folder (`../*`, or through a link inside it), so each file answers to the check,
                // not the folder alone — as its real path, since the enumeration hands the steps back unresolved.
                if (Allow is null || Allow(RealPath(file), UINodeFileAccess.Read))
                    _ = found.Add(Path.Join(folder, Path.GetRelativePath(full, file)));
            }
        }

        return [.. found];
    }

    /// <summary>
    /// The bytes of a file a node names, at most <see cref="MaxReadBytes"/> of them.
    /// </summary>
    public async Task<byte[]> ReadAsync(string path, CancellationToken cancellationToken = default)
    {
        var full = Resolve(path);

        if (!File.Exists(full))
            throw new InvalidOperationException($"There is no file '{path}'.");

        FileStream stream = new(full, FileMode.Open, FileAccess.Read, FileShare.Read, 4096, useAsync: true);

        await using (stream.ConfigureAwait(false))
        {
            // The length a file states is only a start: a device says none and reads without end, and a file may grow meanwhile.
            var stated = stream.CanSeek ? stream.Length : 0;
            var most = (int)Math.Clamp(MaxReadBytes, 0, Array.MaxLength);

            if (stated > most)
                throw TooLarge(path);

            var bytes = new byte[stated];
            var one = new byte[1];
            var length = 0;

            while (true)
            {
                if (length == bytes.Length)
                {
                    // As long as it said, or longer: one byte more tells which before anything grows, and past the most, that
                    // the file is larger than a node may read.
                    if (await stream.ReadAsync(one, cancellationToken).ConfigureAwait(false) == 0)
                        return bytes;

                    if (length == most)
                        throw TooLarge(path);

                    Array.Resize(ref bytes, (int)Math.Min(Math.Max(length * 2L, 81920), most));
                    bytes[length++] = one[0];
                    continue;
                }

                var read = await stream.ReadAsync(bytes.AsMemory(length), cancellationToken).ConfigureAwait(false);

                if (read == 0)
                    return bytes[..length];

                length += read;
            }
        }
    }

    private InvalidOperationException TooLarge(string path)
        => new($"'{path}' is larger than the {MaxReadBytes} bytes a file kind reads of one file.");

    /// <summary>Writes a file into a folder a node names and answers the file's path, named the way the folder was.</summary>
    /// <remarks>
    /// Makes the folder if it is not there; a file already there is replaced only if <paramref name="overwrite"/> says so.
    /// </remarks>
    public async Task<string> WriteAsync(string folder, string name, ReadOnlyMemory<byte> bytes, bool overwrite, CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(folder);

        if (string.IsNullOrWhiteSpace(name) || name.IndexOfAny(['/', '\\']) >= 0 || name is "." or "..")
            throw new InvalidOperationException($"'{name}' is not a file name.");

        var path = Path.Join(folder, name);
        var full = Resolve(path, UINodeFileAccess.Write);

        _ = Directory.CreateDirectory(Path.GetDirectoryName(full)!);

        if (!overwrite && File.Exists(full))
            throw new InvalidOperationException($"'{path}' is already there; the node is not asked to replace it.");

        FileStream stream = new(full, overwrite ? FileMode.Create : FileMode.CreateNew, FileAccess.Write, FileShare.None, 4096, useAsync: true);

        await using (stream.ConfigureAwait(false))
            await stream.WriteAsync(bytes, cancellationToken).ConfigureAwait(false);

        return path;
    }
}

/// <summary>
/// What a file kind is about to do with a path, for the application's check (<see cref="UINodeFiles.Allow"/>).
/// </summary>
public enum UINodeFileAccess
{
    /// <summary>A file read, or a folder's files listed.</summary>
    Read,

    /// <summary>A file written.</summary>
    Write
}
