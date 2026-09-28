using System;
using System.Collections.Generic;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using NE.Standard.UI.Primitives.Constants;

namespace NE.Standard.UI.Graph;

/// <summary>
/// The files of a folder that match a pattern, one a run: the file it took last is kept in the document, so the next run takes
/// the one after it in name order — a file added or removed meanwhile moves no other — a run of all goes through every one, and
/// the node's reset starts it over.
/// </summary>
[GraphNode(Key = NodeKey, Category = UINodeKinds.FilesCategory, Title = "Files in folder", Description = "Hands out the folder's files, one a run.", Icon = UIGlyphs.FolderOpen, Color = FileColor, MinWidth = 15)]
public sealed class FilesInFolderNode : IGraphNode, IGraphNodeSequence
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "graph.files-in-folder";

    /// <summary>The colour the file kinds wear.</summary>
    public const string FileColor = "var(--ui-color-series-6)";

    /// <summary>Gets or sets the folder, by its path on the server.</summary>
    [GraphInput(Title = "Folder", Required = true, MaxLength = 260)]
    public string Folder { get; set; } = string.Empty;

    /// <summary>Gets or sets which files are taken — <c>*.png</c>, or several as <c>*.png;*.jpg</c>.</summary>
    [GraphInput(Title = "Filter", NoPin = true, MaxLength = 120)]
    public string Filter { get; set; } = "*";

    /// <summary>Gets or sets whether the folders inside it are gone through too.</summary>
    [GraphInput(Title = "Subfolders", NoPin = true)]
    public bool Subfolders { get; set; }

    /// <summary>Gets or sets how many files the runs have taken, which is where the next one is in the list.</summary>
    [GraphInput(Title = "Taken", State = true, Min = 0, Description = "How many files the runs have taken; the reset starts over.")]
    public int Taken { get; set; }

    /// <summary>Gets or sets the file the last run took, by the path it was handed out under; the next run takes the one after it.</summary>
    [GraphInput(Title = "Last", State = true, Hidden = true)]
    public string Last { get; set; } = string.Empty;

    /// <summary>Gets or sets the file this run took, by its path on the server.</summary>
    [GraphOutput(Title = "Path")]
    public string Path { get; set; } = string.Empty;

    /// <summary>Gets or sets its name, with its extension.</summary>
    [GraphOutput(Title = "Name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>Gets or sets how many files there are.</summary>
    [GraphOutput(Title = "Count")]
    public int Count { get; set; }

    /// <inheritdoc/>
    public bool HasMore { get; private set; }

    /// <inheritdoc/>
    public void Execute(UINodeRunContext context)
    {
        IReadOnlyList<string> files = UINodeFiles.Of(context).List(Folder, Filter, Subfolders);

        Count = files.Count;

        if (files.Count == 0)
            throw new InvalidOperationException($"No file in '{Folder}' matches '{Filter}'.");

        // By name rather than by place: the list is read afresh each run, and a place would shift under a file added before it.
        // None taken — a new node, or its count put back — starts from the first, whatever the last one was.
        var next = Taken <= 0 || string.IsNullOrEmpty(Last) ? 0 : After(files, Last);

        if (next >= files.Count)
            throw new InvalidOperationException($"Every one of the {files.Count} files is taken: reset the node to start over.");

        Path = files[next];
        Name = System.IO.Path.GetFileName(Path);
        Last = Path;
        Taken = Math.Max(0, Taken) + 1;
        HasMore = next + 1 < files.Count;

        context.Log($"{next + 1} of {files.Count}: {Name}.");
    }

    /// <summary>Where the first file past <paramref name="last"/> stands in the list, which is in ordinal name order.</summary>
    private static int After(IReadOnlyList<string> files, string last)
    {
        var at = 0;

        while (at < files.Count && string.CompareOrdinal(files[at], last) <= 0)
            at++;

        return at;
    }
}

/// <summary>
/// A text file read whole.
/// </summary>
[GraphNode(Key = NodeKey, Category = UINodeKinds.FilesCategory, Title = "Read text", Description = "Reads a text file.", Icon = UIGlyphs.Description, Color = FilesInFolderNode.FileColor, AlwaysRuns = true)]
public sealed class ReadTextNode : IGraphNodeAsync
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "graph.read-text";

    /// <summary>Gets or sets the file, by its path on the server.</summary>
    [GraphInput(Title = "Path", Required = true, MaxLength = 260)]
    public string Path { get; set; } = string.Empty;

    /// <summary>Gets or sets what the file holds.</summary>
    [GraphOutput(Title = "Text")]
    public string Text { get; set; } = string.Empty;

    /// <inheritdoc/>
    public async ValueTask ExecuteAsync(UINodeRunContext context, CancellationToken cancellationToken = default)
    {
        var bytes = await UINodeFiles.Of(context).ReadAsync(Path, cancellationToken).ConfigureAwait(false);

        Text = new UTF8Encoding(encoderShouldEmitUTF8Identifier: false).GetString(bytes).TrimStart('﻿');
    }
}

/// <summary>
/// A text written to a file.
/// </summary>
[GraphNode(Key = NodeKey, Category = UINodeKinds.FilesCategory, Title = "Write text", Description = "Writes a text into a file.", Icon = UIGlyphs.Save, Color = FilesInFolderNode.FileColor, AlwaysRuns = true)]
public sealed class WriteTextNode : IGraphNodeAsync
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "graph.write-text";

    /// <summary>Gets or sets what is written.</summary>
    [GraphInput(Title = "Text", PinOnly = true)]
    public string Text { get; set; } = string.Empty;

    /// <summary>Gets or sets the folder it is written into, by its path on the server.</summary>
    [GraphInput(Title = "Folder", Required = true, MaxLength = 260)]
    public string Folder { get; set; } = string.Empty;

    /// <summary>Gets or sets the file's name.</summary>
    [GraphInput(Title = "Name", Required = true, MaxLength = 120)]
    public string Name { get; set; } = "text.txt";

    /// <summary>Gets or sets whether a file already there is replaced; otherwise the node fails rather than lose it.</summary>
    [GraphInput(Title = "Replace", NoPin = true)]
    public bool Overwrite { get; set; }

    /// <summary>Gets or sets the file written, by its path on the server.</summary>
    [GraphOutput(Title = "Path")]
    public string Path { get; set; } = string.Empty;

    /// <inheritdoc/>
    public async ValueTask ExecuteAsync(UINodeRunContext context, CancellationToken cancellationToken = default)
        => Path = await UINodeFiles.Of(context).WriteAsync(Folder, Name, Encoding.UTF8.GetBytes(Text ?? string.Empty), Overwrite, cancellationToken).ConfigureAwait(false);
}
