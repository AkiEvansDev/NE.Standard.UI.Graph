using System;
using System.Threading;
using System.Threading.Tasks;
using NE.Standard.UI.Primitives.Constants;
using SkiaSharp;

namespace NE.Standard.UI.Graph.Image;

/// <summary>
/// A rectangle cut out of the picture; one reaching past its edges is cut back to them.
/// </summary>
[GraphNode(Key = NodeKey, Category = ImageNodes.Category, Title = "Crop", Description = "Cuts a rectangle out of the picture.", Icon = UIGlyphs.Crop, Color = ImageNodes.Color)]
public sealed class CropImageNode : IGraphNodeAsync
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "image.crop";

    /// <summary>Gets or sets the address of the picture.</summary>
    [GraphInput(Title = "Image", PinOnly = true, Required = true, Image = true)]
    public string? Image { get; set; }

    /// <summary>Gets or sets the rectangle's left edge, in pixels from the picture's.</summary>
    [GraphInput(Title = "Left", Min = 0, Unit = "px")]
    public int Left { get; set; }

    /// <summary>Gets or sets the rectangle's top edge, in pixels from the picture's.</summary>
    [GraphInput(Title = "Top", Min = 0, Unit = "px")]
    public int Top { get; set; }

    /// <summary>Gets or sets the rectangle's width, in pixels.</summary>
    [GraphInput(Title = "Width", Min = 1, Unit = "px")]
    public int Width { get; set; } = 256;

    /// <summary>Gets or sets the rectangle's height, in pixels.</summary>
    [GraphInput(Title = "Height", Min = 1, Unit = "px")]
    public int Height { get; set; } = 256;

    /// <summary>Gets or sets the address of the cut-out picture.</summary>
    [GraphOutput(Title = "Image", Image = true)]
    public string? Result { get; set; }

    /// <inheritdoc/>
    public async ValueTask ExecuteAsync(UINodeRunContext context, CancellationToken cancellationToken = default)
        => Result = await ImageWork.TransformAsync(context, Image, Crop, cancellationToken).ConfigureAwait(false);

    private SKBitmap Crop(SKBitmap source)
    {
        SKRectI kept = SKRectI.Intersect(SKRectI.Create(Math.Max(0, Left), Math.Max(0, Top), Math.Max(1, Width), Math.Max(1, Height)), SKRectI.Create(0, 0, source.Width, source.Height));

        if (kept.IsEmpty)
            throw new InvalidOperationException($"The rectangle lies outside the {source.Width} × {source.Height} px picture.");

        return ImageWork.Draw(kept.Width, kept.Height, canvas => canvas.DrawBitmap(source, kept, new SKRect(0, 0, kept.Width, kept.Height), ImageWork.PixelForPixel));
    }
}
