using System.Threading;
using System.Threading.Tasks;
using NE.Standard.UI.Primitives.Constants;
using SkiaSharp;

namespace NE.Standard.UI.Graph.Image;

/// <summary>
/// A file format a picture can be written in.
/// </summary>
public enum ImageFileFormat
{
    /// <summary>PNG: lossless, with transparency.</summary>
    Png = 0,

    /// <summary>JPEG: lossy, for photographs, with no transparency.</summary>
    Jpeg = 1,

    /// <summary>WebP: lossy, smaller than JPEG at the same quality, with transparency.</summary>
    Webp = 2,
}

/// <summary>
/// The picture written again in another file format, at the quality asked for where the format is lossy.
/// </summary>
[GraphNode(Key = NodeKey, Category = ImageNodes.Category, Title = "Convert", Description = "Writes the picture in another format.", Icon = UIGlyphs.SwapHorizontal, Color = ImageNodes.Color)]
public sealed class ConvertImageNode : IGraphNodeAsync
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "image.convert";

    /// <summary>Gets or sets the address of the picture.</summary>
    [GraphInput(Title = "Image", PinOnly = true, Required = true, Image = true)]
    public string? Image { get; set; }

    /// <summary>Gets or sets the format it is written in.</summary>
    [GraphInput(Title = "Format", NoPin = true)]
    public ImageFileFormat Format { get; set; } = ImageFileFormat.Webp;

    /// <summary>Gets or sets the quality a lossy format is written at, from 1 to 100.</summary>
    [GraphInput(Title = "Quality", NoPin = true, Min = 1, Max = 100, VisibleWhen = nameof(Format), VisibleValues = [nameof(ImageFileFormat.Jpeg), nameof(ImageFileFormat.Webp)])]
    public int Quality { get; set; } = 85;

    /// <summary>Gets or sets the address of the written picture.</summary>
    [GraphOutput(Title = "Image", Image = true)]
    public string? Result { get; set; }

    /// <inheritdoc/>
    public async ValueTask ExecuteAsync(UINodeRunContext context, CancellationToken cancellationToken = default)
    {
        SKEncodedImageFormat format = Format switch
        {
            ImageFileFormat.Jpeg => SKEncodedImageFormat.Jpeg,
            ImageFileFormat.Webp => SKEncodedImageFormat.Webp,
            _ => SKEncodedImageFormat.Png
        };

        Result = await ImageWork.TransformAsync(context, Image, Copy, null, format, Quality, cancellationToken).ConfigureAwait(false);
    }

    private static SKBitmap Copy(SKBitmap source)
        => source.Copy();
}
