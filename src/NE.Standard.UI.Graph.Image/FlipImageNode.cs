using System.Threading;
using System.Threading.Tasks;
using NE.Standard.UI.Primitives.Constants;
using SkiaSharp;

namespace NE.Standard.UI.Graph.Image;

/// <summary>
/// The picture mirrored left to right, top to bottom, or both.
/// </summary>
[GraphNode(Key = NodeKey, Category = ImageNodes.Category, Title = "Flip", Description = "Mirrors the picture left to right or top to bottom.", Icon = UIGlyphs.Flip, Color = ImageNodes.Color)]
public sealed class FlipImageNode : IGraphNodeAsync
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "image.flip";

    /// <summary>Gets or sets the address of the picture.</summary>
    [GraphInput(Title = "Image", PinOnly = true, Required = true, Image = true)]
    public string? Image { get; set; }

    /// <summary>Gets or sets whether left and right change places.</summary>
    [GraphInput(Title = "Left to right", NoPin = true)]
    public bool Horizontal { get; set; } = true;

    /// <summary>Gets or sets whether top and bottom change places.</summary>
    [GraphInput(Title = "Top to bottom", NoPin = true)]
    public bool Vertical { get; set; }

    /// <summary>Gets or sets the address of the mirrored picture.</summary>
    [GraphOutput(Title = "Image", Image = true)]
    public string? Result { get; set; }

    /// <inheritdoc/>
    public async ValueTask ExecuteAsync(UINodeRunContext context, CancellationToken cancellationToken = default)
        => Result = await ImageWork.TransformAsync(context, Image, Flip, cancellationToken).ConfigureAwait(false);

    private SKBitmap Flip(SKBitmap source)
        => ImageWork.Draw(source.Width, source.Height, canvas =>
        {
            canvas.Scale(Horizontal ? -1 : 1, Vertical ? -1 : 1, source.Width / 2f, source.Height / 2f);
            canvas.DrawBitmap(source, 0, 0, ImageWork.PixelForPixel);
        });
}
