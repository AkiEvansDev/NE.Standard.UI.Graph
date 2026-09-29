using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using NE.Standard.UI.Shell.Runtime;

namespace DemoApp.Graph.Planner;

/// <summary>
/// The planner's two files, read back with everything checked — a file is the viewer's, so nothing in it is trusted to be in range, to
/// name what exists or to be what it says. The catalogue is a zip as EndfieldGraph's is, <c>manifest.json</c> beside an
/// <c>icons/</c> folder of the resources' pictures; the builds, which carry none, are one JSON file. A reason a file is refused is a
/// key of the demo's words, shown in the page's language.
/// </summary>
public static class PlannerFiles
{
    public const string ResourcesFileName = "planner-resources.zip";
    public const string ResourcesContentType = "application/zip";
    public const string ResourcesAccept = ".zip,application/zip";
    public const string BuildsFileName = "planner-builds.json";
    public const string BuildsContentType = "application/json";
    public const string BuildsAccept = ".json,application/json";

    private const string ResourcesFormat = "ne-planner-resources";
    private const string BuildsFormat = "ne-planner-builds";
    private const string ManifestName = "manifest.json";
    private const string IconsFolder = "icons/";
    private const int Version = 1;
    private const int MaxName = 100;
    private const int MaxId = 64;

    /// <summary>The most the manifest is read to, whatever the archive claims: what it unpacks to is not taken on trust.</summary>
    private const long MaxManifestBytes = 16 * 1024 * 1024;

    private static readonly JsonSerializerOptions Options = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase, WriteIndented = true };

    /// <summary>The catalogue as a zip: every resource with its recipe in the manifest, each picture under <c>icons/</c> by its resource's id.</summary>
    public static byte[] WriteResources(IReadOnlyList<ResourceRecord> resources, IReadOnlyDictionary<string, PictureRecord> pictures)
    {
        ArgumentNullException.ThrowIfNull(resources);
        ArgumentNullException.ThrowIfNull(pictures);

        ResourceEntry[] entries = new ResourceEntry[resources.Count];
        using MemoryStream buffer = new();

        using (ZipArchive archive = new(buffer, ZipArchiveMode.Create, leaveOpen: true))
        {
            for (var i = 0; i < resources.Count; i++)
            {
                ResourceRecord resource = resources[i];
                string? image = null;

                if (pictures.TryGetValue(resource.Id, out PictureRecord? picture))
                {
                    image = IconsFolder + resource.Id + PlannerPictures.ExtensionOf(picture.ContentType);

                    // A picture is compressed already: storing it saves the work of squeezing it for nothing.
                    using Stream stream = archive.CreateEntry(image, CompressionLevel.NoCompression).Open();
                    stream.Write(picture.Bytes);
                }

                entries[i] = new ResourceEntry(resource.Id, resource.Name, resource.Icon, resource.Color, resource.Output, resource.Seconds, Amounts(resource.Ingredients), image);
            }

            using Stream manifest = archive.CreateEntry(ManifestName).Open();
            JsonSerializer.Serialize(manifest, new ResourcesFile(ResourcesFormat, Version, entries), Options);
        }

        return buffer.ToArray();
    }

    public static byte[] WriteBuilds(IReadOnlyList<BuildRecord> builds)
    {
        ArgumentNullException.ThrowIfNull(builds);

        BuildEntry[] entries = new BuildEntry[builds.Count];

        for (var i = 0; i < builds.Count; i++)
            entries[i] = new BuildEntry(builds[i].Id, builds[i].Name, Amounts(builds[i].Goals), builds[i].Period, builds[i].Objective, [.. builds[i].Bought ?? []], builds[i].Pinned);

        return JsonSerializer.SerializeToUtf8Bytes(new BuildsFile(BuildsFormat, Version, entries), Options);
    }

    /// <summary>Only the rows that name a resource: a row left unpicked is the page's, not the file's.</summary>
    private static AmountEntry[] Amounts(IReadOnlyList<AmountRecord> rows)
    {
        List<AmountEntry> amounts = new(rows.Count);

        foreach (AmountRecord row in rows)
        {
            if (row.ResourceId is { } resource)
                amounts.Add(new AmountEntry(resource, row.Amount));
        }

        return [.. amounts];
    }

    /// <summary>
    /// The catalogue a zip holds with its pictures, or the reason it is not one. An ingredient naming no resource of the file is dropped,
    /// and so is a picture that is too large or no picture at all — its resource keeps its glyph.
    /// </summary>
    public static (IReadOnlyList<ResourceRecord>? Resources, IReadOnlyDictionary<string, PictureRecord> Pictures, string? Error) ReadResources(byte[] content)
    {
        ArgumentNullException.ThrowIfNull(content);

        Dictionary<string, PictureRecord> pictures = new(StringComparer.Ordinal);

        try
        {
            using ZipArchive archive = new(new MemoryStream(content, writable: false), ZipArchiveMode.Read);

            ResourcesFile? file = archive.GetEntry(ManifestName) is { } manifest && ReadEntry(manifest, MaxManifestBytes) is { } json ? Read<ResourcesFile>(json) : null;

            if (file is null || file.Format != ResourcesFormat || file.Resources is null)
                return (null, pictures, "planner.file.not-resources");

            if (file.Version > Version)
                return (null, pictures, "planner.file.newer");

            List<ResourceRecord> resources = new(file.Resources.Length);
            HashSet<string> ids = new(StringComparer.Ordinal);

            foreach (ResourceEntry? entry in file.Resources)
            {
                if (entry is null || !IsId(entry.Id) || !ids.Add(entry.Id) || string.IsNullOrWhiteSpace(entry.Name))
                    return (null, pictures, "planner.file.bad-resource");

                // A glyph or a colour the planner does not offer falls back to its default rather than refusing the file.
                var icon = Array.Exists(PlannerCatalogue.Icons, known => known.Glyph == entry.Icon) ? entry.Icon : PlannerCatalogue.DefaultIcon;
                var color = Array.Exists(PlannerCatalogue.Colors, known => known.Color == entry.Color) ? entry.Color : null;
                var seconds = double.IsFinite(entry.Seconds) ? Math.Clamp(entry.Seconds, 0.1, 3600) : PlannerStore.DefaultSeconds;

                resources.Add(new ResourceRecord(entry.Id, Clip(entry.Name), icon, color, Math.Clamp(entry.Output, 1, 999), seconds, []));

                if (ReadPicture(archive, entry.Image) is { } picture)
                    pictures[entry.Id] = picture;
            }

            // A second pass, once every id of the file is known: a recipe may name a resource written after it.
            for (var i = 0; i < resources.Count; i++)
                resources[i] = resources[i] with { Ingredients = Rows(file.Resources[i]?.Ingredients, id => ids.Contains(id) && id != resources[i].Id, 1, 999) };

            return (resources, pictures, null);
        }
        catch (InvalidDataException)
        {
            return (null, pictures, "planner.file.not-resources");
        }
    }

    /// <summary>A picture the manifest names, when the archive holds it, it is small enough, and its bytes are a picture's.</summary>
    private static PictureRecord? ReadPicture(ZipArchive archive, string? path)
    {
        if (path is null || !path.StartsWith(IconsFolder, StringComparison.Ordinal) || archive.GetEntry(path) is not { } entry)
            return null;

        return ReadEntry(entry, PlannerPictures.MaxBytes) is { } bytes && PlannerPictures.Sniff(bytes) is { } type ? new PictureRecord(bytes, type) : null;
    }

    /// <summary>An entry's bytes, read no further than the limit: one that runs past it is refused, whatever size it claimed.</summary>
    private static byte[]? ReadEntry(ZipArchiveEntry entry, long limit)
    {
        using Stream stream = entry.Open();
        using MemoryStream buffer = new();

        var chunk = new byte[81920];
        int read;

        while ((read = stream.Read(chunk)) > 0)
        {
            if (buffer.Length + read > limit)
                return null;

            buffer.Write(chunk, 0, read);
        }

        return buffer.ToArray();
    }

    /// <summary>The builds a file holds, or the reason it is not one; a goal's resource is checked against the catalogue when it is taken in.</summary>
    public static (IReadOnlyList<BuildRecord>? Builds, string? Error) ReadBuilds(byte[] content)
    {
        BuildsFile? file = Read<BuildsFile>(content);

        if (file is null || file.Format != BuildsFormat || file.Builds is null)
            return (null, "planner.file.not-builds");

        if (file.Version > Version)
            return (null, "planner.file.newer");

        List<BuildRecord> builds = new(file.Builds.Length);
        HashSet<string> ids = new(StringComparer.Ordinal);

        foreach (BuildEntry? entry in file.Builds)
        {
            if (entry is null || !IsId(entry.Id) || !ids.Add(entry.Id) || string.IsNullOrWhiteSpace(entry.Name))
                return (null, "planner.file.bad-build");

            // A file from before the plan's settings travelled counts a minute, as the page then did; one from before the pin, unpinned.
            string[] bought = [.. (entry.Bought ?? []).Where(IsId)];

            builds.Add(new BuildRecord(entry.Id, Clip(entry.Name), Rows(entry.Goals, IsId, 0.01, 100000), entry.Period ?? UIProductionPeriod.Minute, entry.Objective ?? UIProductionObjective.LeastRaw, bought, entry.Pinned == true));
        }

        return (builds, null);
    }

    /// <summary>
    /// The one file a picker uploaded, read whole out of the framework's upload store, or the reason there is none. The size is the
    /// framework's to limit (<c>UIFileOptions.MaxFileSize</c>): the upload endpoint refuses a larger file before it is kept.
    /// </summary>
    public static async Task<(byte[]? Content, string? Error)> ReadUploadAsync(UIContext context, string? selectionId, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(context);

        if (string.IsNullOrWhiteSpace(selectionId))
            return (null, "planner.file.none");

        UIUploadSelection selection = await context.Uploads.GetSelectionAsync(context.Handle, selectionId, cancellationToken).ConfigureAwait(false);

        if (selection.Files.Length == 0)
            return (null, "planner.file.none");

        UIUploadedFile upload = await context.Uploads.OpenAsync(context.Handle, selection.Files[0].FileId, cancellationToken: cancellationToken).ConfigureAwait(false);

        await using (upload.ConfigureAwait(false))
        {
            using MemoryStream buffer = new();
            await upload.Content.CopyToAsync(buffer, cancellationToken).ConfigureAwait(false);

            return (buffer.ToArray(), null);
        }
    }

    private static T? Read<T>(byte[] content)
        where T : class
    {
        try
        {
            return JsonSerializer.Deserialize<T>(content, Options);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    /// <summary>The rows whose resource passes, each given a fresh row id and its amount put in range.</summary>
    private static AmountRecord[] Rows(AmountEntry?[]? entries, Predicate<string> named, double least, double most)
    {
        if (entries is null)
            return [];

        List<AmountRecord> rows = new(entries.Length);

        foreach (AmountEntry? entry in entries)
        {
            if (entry?.Resource is { } resource && named(resource) && double.IsFinite(entry.Amount) && entry.Amount > 0)
                rows.Add(new AmountRecord(PlannerDatabase.NewId(), resource, Math.Clamp(entry.Amount, least, most)));
        }

        return [.. rows];
    }

    /// <summary>
    /// A key as the planner makes them: letters, digits, dashes and underscores, which a picture's address carries as they are, and
    /// never starting as a craft's key does, which would give one resource's recipe the key of another resource.
    /// </summary>
    private static bool IsId(string? id)
        => !string.IsNullOrWhiteSpace(id)
            && id.Length <= MaxId
            && id.All(static character => char.IsAsciiLetterOrDigit(character) || character is '-' or '_')
            && !id.StartsWith(PlannerCatalogue.CraftPrefix, StringComparison.Ordinal);

    private static string Clip(string name)
    {
        var trimmed = name.Trim();

        return trimmed.Length <= MaxName ? trimmed : trimmed[..MaxName];
    }

    private sealed record ResourcesFile(string? Format, int Version, ResourceEntry?[]? Resources);

    private sealed record ResourceEntry(string Id, string Name, string Icon, string? Color, int Output, double Seconds, AmountEntry?[]? Ingredients, string? Image);

    private sealed record BuildsFile(string? Format, int Version, BuildEntry?[]? Builds);

    private sealed record BuildEntry(string Id, string Name, AmountEntry?[]? Goals, UIProductionPeriod? Period = null, UIProductionObjective? Objective = null, string[]? Bought = null, bool? Pinned = null);

    private sealed record AmountEntry(string Resource, double Amount);
}
