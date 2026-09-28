using System.Threading;
using System.Threading.Tasks;
using NE.Standard.UI.Primitives.Constants;
using SkiaSharp;

namespace NE.Standard.UI.Graph.Image;

/// <summary>
/// The pixel size of the picture that reaches it, read off the file's header without decoding the picture.
/// </summary>
[GraphNode(Key = NodeKey, Category = ImageNodes.Category, Title = "Image size", Description = "The width and height of the picture that reaches it.", Icon = UIGlyphs.Straighten, Color = ImageNodes.Color)]
public sealed class ImageSizeNode : IGraphNodeAsync
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "image.size";

    /// <summary>Gets or sets the address of the picture.</summary>
    [GraphInput(Title = "Image", PinOnly = true, Required = true, Image = true)]
    public string? Image { get; set; }

    /// <summary>Gets or sets its width, in pixels.</summary>
    [GraphOutput(Title = "Width")]
    public int Width { get; set; }

    /// <summary>Gets or sets its height, in pixels.</summary>
    [GraphOutput(Title = "Height")]
    public int Height { get; set; }

    /// <inheritdoc/>
    public async ValueTask ExecuteAsync(UINodeRunContext context, CancellationToken cancellationToken = default)
    {
        UINodeImageFile file = await ImageWork.ReadFileAsync(context, Image, cancellationToken).ConfigureAwait(false);

        using SKCodec codec = ImageWork.OpenCodec(file);

        // The size as the picture is seen, not as it is stored: a photograph taken on its side stands up everywhere else.
        var sideways = ImageWork.IsSideways(codec.EncodedOrigin);

        Width = sideways ? codec.Info.Height : codec.Info.Width;
        Height = sideways ? codec.Info.Width : codec.Info.Height;
    }
}
