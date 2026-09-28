using System.Threading;
using System.Threading.Tasks;
using NE.Standard.UI.Primitives.Constants;
using SkiaSharp;

namespace NE.Standard.UI.Graph.Image;

/// <summary>
/// The picture in shades of grey, each pixel as bright as it looked in colour.
/// </summary>
[GraphNode(Key = NodeKey, Category = ImageNodes.Category, Title = "Greyscale", Description = "Turns the picture into shades of grey.", Icon = UIGlyphs.FilterBlackWhite, Color = ImageNodes.Color)]
public sealed class GrayscaleImageNode : IGraphNodeAsync
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "image.grayscale";

    // Each channel's share of how bright a colour looks (Rec. 709 luma), so a grey keeps the brightness its colour had.
    private static readonly float[] Luma =
    [
        0.2126f, 0.7152f, 0.0722f, 0, 0,
        0.2126f, 0.7152f, 0.0722f, 0, 0,
        0.2126f, 0.7152f, 0.0722f, 0, 0,
        0, 0, 0, 1, 0
    ];

    /// <summary>Gets or sets the address of the picture.</summary>
    [GraphInput(Title = "Image", PinOnly = true, Required = true, Image = true)]
    public string? Image { get; set; }

    /// <summary>Gets or sets the address of the grey picture.</summary>
    [GraphOutput(Title = "Image", Image = true)]
    public string? Result { get; set; }

    /// <inheritdoc/>
    public async ValueTask ExecuteAsync(UINodeRunContext context, CancellationToken cancellationToken = default)
        => Result = await ImageWork.TransformAsync(context, Image, Grey, cancellationToken).ConfigureAwait(false);

    private static SKBitmap Grey(SKBitmap source)
        => ImageWork.Draw(source.Width, source.Height, canvas =>
        {
            using SKColorFilter filter = SKColorFilter.CreateColorMatrix(Luma);
            using SKPaint paint = new() { ColorFilter = filter };

            canvas.DrawBitmap(source, 0, 0, ImageWork.PixelForPixel, paint);
        });
}
