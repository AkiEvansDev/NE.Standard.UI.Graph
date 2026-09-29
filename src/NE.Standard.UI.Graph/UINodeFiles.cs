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
    private static readonly UINodeFiles Closed = new() { IsClosed = true };

    /// <summary>
    /// Gets the folder a relative path is resolved against; empty, the process's current directory.
    /// </summary>
    public string BasePath { get; init; } = string.Empty;

    /// <summary>
    /// Gets the application's own check of a full path before a file kind reads or writes it; refused, the node fails with why.
    /// </summary>
    public Func<string, UINodeFileAccess, bool>? Allow { get; init; }

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

        var full = Path.GetFullPath(path, string.IsNullOrEmpty(BasePath) ? Directory.GetCurrentDirectory() : BasePath);

        return Allow is null || Allow(full, access)
            ? full
            : throw new UnauthorizedAccessException($"The application does not let the file kinds {(access == UINodeFileAccess.Write ? "write" : "read")} '{path}'.");
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
                // A pattern may lead out of the folder (`../*`), so each file answers to the check, not the folder alone — as its
                // full path, since the enumeration hands the steps back unresolved.
                if (Allow is null || Allow(Path.GetFullPath(file), UINodeFileAccess.Read))
                    _ = found.Add(Path.Join(folder, Path.GetRelativePath(full, file)));
            }
        }

        return [.. found];
    }

    /// <summary>
    /// The bytes of a file a node names.
    /// </summary>
    public Task<byte[]> ReadAsync(string path, CancellationToken cancellationToken = default)
    {
        var full = Resolve(path);

        return File.Exists(full)
            ? File.ReadAllBytesAsync(full, cancellationToken)
            : throw new InvalidOperationException($"There is no file '{path}'.");
    }

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
