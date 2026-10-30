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
        var left = Math.Max(0, Left);
        var top = Math.Max(0, Top);

        if (left >= source.Width || top >= source.Height)
            throw new UINodeFailureException($"The rectangle lies outside the {source.Width} × {source.Height} px picture.");

        var width = Math.Min(Math.Max(1, Width), source.Width - left);
        var height = Math.Min(Math.Max(1, Height), source.Height - top);
        SKRectI kept = SKRectI.Create(left, top, width, height);

        return ImageWork.Draw(kept.Width, kept.Height, canvas => canvas.DrawBitmap(source, kept, new SKRect(0, 0, kept.Width, kept.Height), ImageWork.PixelForPixel));
    }
}
