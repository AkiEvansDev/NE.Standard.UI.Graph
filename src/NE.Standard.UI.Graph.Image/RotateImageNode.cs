using System.Threading;
using System.Threading.Tasks;
using NE.Standard.UI.Primitives.Constants;
using SkiaSharp;

namespace NE.Standard.UI.Graph.Image;

/// <summary>
/// How far a picture is turned: a quarter either way or a half, so no pixel is resampled.
/// </summary>
public enum ImageRotation
{
    /// <summary>A quarter turn clockwise.</summary>
    Clockwise = 0,

    /// <summary>A half turn.</summary>
    Half = 1,

    /// <summary>A quarter turn counterclockwise.</summary>
    Counterclockwise = 2,
}

/// <summary>
/// The picture turned by a quarter or a half.
/// </summary>
[GraphNode(Key = NodeKey, Category = ImageNodes.Category, Title = "Rotate", Description = "Turns the picture by a quarter or a half.", Icon = UIGlyphs.RotateRight, Color = ImageNodes.Color)]
public sealed class RotateImageNode : IGraphNodeAsync
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "image.rotate";

    /// <summary>Gets or sets the address of the picture.</summary>
    [GraphInput(Title = "Image", PinOnly = true, Required = true, Image = true)]
    public string? Image { get; set; }

    /// <summary>Gets or sets how far it is turned.</summary>
    [GraphInput(Title = "Turn", NoPin = true)]
    public ImageRotation Turn { get; set; } = ImageRotation.Clockwise;

    /// <summary>Gets or sets the address of the turned picture.</summary>
    [GraphOutput(Title = "Image", Image = true)]
    public string? Result { get; set; }

    /// <inheritdoc/>
    public async ValueTask ExecuteAsync(UINodeRunContext context, CancellationToken cancellationToken = default)
        => Result = await ImageWork.TransformAsync(context, Image, Rotate, cancellationToken).ConfigureAwait(false);

    private SKBitmap Rotate(SKBitmap source)
    {
        var quarter = Turn != ImageRotation.Half;
        var width = quarter ? source.Height : source.Width;
        var height = quarter ? source.Width : source.Height;
        var degrees = Turn switch
        {
            ImageRotation.Half => 180f,
            ImageRotation.Counterclockwise => -90f,
            _ => 90f
        };

        return ImageWork.Draw(width, height, canvas =>
        {
            // About the new picture's centre, with the old one drawn centred on it.
            canvas.Translate(width / 2f, height / 2f);
            canvas.RotateDegrees(degrees);
            canvas.DrawBitmap(source, -source.Width / 2f, -source.Height / 2f, ImageWork.PixelForPixel);
        });
    }
}
