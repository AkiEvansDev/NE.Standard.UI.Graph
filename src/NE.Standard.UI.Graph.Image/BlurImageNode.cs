using System;
using System.Threading;
using System.Threading.Tasks;
using NE.Standard.UI.Primitives.Constants;
using SkiaSharp;

namespace NE.Standard.UI.Graph.Image;

/// <summary>
/// The picture blurred, by a Gaussian reaching as far as the radius asked for.
/// </summary>
[GraphNode(Key = NodeKey, Category = ImageNodes.Category, Title = "Blur", Description = "Blurs the picture.", Icon = UIGlyphs.Blur, Color = ImageNodes.Color)]
public sealed class BlurImageNode : IGraphNodeAsync
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "image.blur";

    /// <summary>Gets or sets the address of the picture.</summary>
    [GraphInput(Title = "Image", PinOnly = true, Required = true, Image = true)]
    public string? Image { get; set; }

    /// <summary>Gets or sets how far the blur reaches, in pixels.</summary>
    [GraphInput(Title = "Radius", Min = 0, Max = 100, Step = 0.5, Unit = "px")]
    public double Radius { get; set; } = 4;

    /// <summary>Gets or sets the address of the blurred picture.</summary>
    [GraphOutput(Title = "Image", Image = true)]
    public string? Result { get; set; }

    /// <inheritdoc/>
    public async ValueTask ExecuteAsync(UINodeRunContext context, CancellationToken cancellationToken = default)
        => Result = await ImageWork.TransformAsync(context, Image, Blur, cancellationToken).ConfigureAwait(false);

    private SKBitmap Blur(SKBitmap source)
    {
        // A Gaussian's reach is about three of its sigmas: the radius is what the viewer sees, so it is the reach.
        var sigma = (float)(double.IsFinite(Radius) ? Math.Clamp(Radius, 0, 100) / 3 : 0);

        return ImageWork.Draw(source.Width, source.Height, canvas =>
        {
            // Clamped at the edges, or the blur would draw the transparent outside of the picture into its border.
            using SKImageFilter filter = SKImageFilter.CreateBlur(sigma, sigma, SKShaderTileMode.Clamp, null);
            using SKPaint paint = new() { ImageFilter = filter };

            canvas.DrawBitmap(source, 0, 0, ImageWork.PixelForPixel, paint);
        });
    }
}
