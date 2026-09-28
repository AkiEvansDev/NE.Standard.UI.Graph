using System;
using System.Threading;
using System.Threading.Tasks;
using NE.Standard.UI.Primitives.Constants;

namespace NE.Standard.UI.Graph.Image;

/// <summary>
/// A picture file from the server's disk (<see cref="UINodeFiles"/>), kept in the image store for the picture kinds.
/// </summary>
[GraphNode(Key = NodeKey, Category = ImageNodes.Category, Title = "Load image", Description = "Reads a picture file into the image store.", Icon = UIGlyphs.FileOpen, Color = ImageNodes.Color, AlwaysRuns = true)]
public sealed class LoadImageNode : IGraphNodeAsync
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "image.load";

    /// <summary>Gets or sets the file, by its path on the server.</summary>
    [GraphInput(Title = "Path", Required = true, MaxLength = 260)]
    public string Path { get; set; } = string.Empty;

    /// <summary>Gets or sets the address of the picture read.</summary>
    [GraphOutput(Title = "Image", Image = true)]
    public string? Result { get; set; }

    /// <inheritdoc/>
    public async ValueTask ExecuteAsync(UINodeRunContext context, CancellationToken cancellationToken = default)
    {
        var bytes = await UINodeFiles.Of(context).ReadAsync(Path, cancellationToken).ConfigureAwait(false);
        var name = System.IO.Path.GetFileName(Path);
        // By its first bytes, not its name: a file that is no picture is refused rather than kept and served back.
        var contentType = ImageWork.Sniff(bytes) ?? throw new InvalidOperationException($"'{name}' is not a picture (PNG, JPEG, GIF, WebP or BMP).");

        Result = await ImageWork.StoreOf(context).WriteAsync(new UINodeImageFile(bytes, contentType, name), cancellationToken).ConfigureAwait(false);
    }
}

/// <summary>
/// A picture from the image store written to a folder on the server's disk, under the name given with the extension
/// its format has.
/// </summary>
[GraphNode(Key = NodeKey, Category = ImageNodes.Category, Title = "Save image", Description = "Writes the picture into a folder.", Icon = UIGlyphs.Save, Color = ImageNodes.Color, AlwaysRuns = true)]
public sealed class SaveImageNode : IGraphNodeAsync
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "image.save";

    /// <summary>Gets or sets the address of the picture.</summary>
    [GraphInput(Title = "Image", PinOnly = true, Required = true, Image = true)]
    public string? Image { get; set; }

    /// <summary>Gets or sets the folder it is written into, by its path on the server.</summary>
    [GraphInput(Title = "Folder", Required = true, MaxLength = 260)]
    public string Folder { get; set; } = string.Empty;

    /// <summary>Gets or sets the file's name, its extension set by the picture's format; empty, the name the picture came with.</summary>
    [GraphInput(Title = "Name", MaxLength = 120, Description = "The extension follows the picture's format; empty, the name it came with.")]
    public string Name { get; set; } = string.Empty;

    /// <summary>Gets or sets whether a file already there is replaced; otherwise the node fails rather than lose it.</summary>
    [GraphInput(Title = "Replace", NoPin = true)]
    public bool Overwrite { get; set; }

    /// <summary>Gets or sets the file written, by its path on the server.</summary>
    [GraphOutput(Title = "Path")]
    public string Path { get; set; } = string.Empty;

    /// <inheritdoc/>
    public async ValueTask ExecuteAsync(UINodeRunContext context, CancellationToken cancellationToken = default)
    {
        UINodeImageFile file = await ImageWork.ReadFileAsync(context, Image, cancellationToken).ConfigureAwait(false);
        var name = string.IsNullOrWhiteSpace(Name) ? file.FileName ?? "image" : Name;

        name = System.IO.Path.ChangeExtension(System.IO.Path.GetFileName(name), ImageWork.ExtensionOf(file.ContentType));
        Path = await UINodeFiles.Of(context).WriteAsync(Folder, name, file.Bytes, Overwrite, cancellationToken).ConfigureAwait(false);
    }
}
