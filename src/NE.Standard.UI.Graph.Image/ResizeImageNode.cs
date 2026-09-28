using System;
using System.Threading;
using System.Threading.Tasks;
using NE.Standard.UI.Primitives.Constants;
using SkiaSharp;

namespace NE.Standard.UI.Graph.Image;

/// <summary>
/// How a picture meets the size a resize asks for.
/// </summary>
public enum ImageResizeMode
{
    /// <summary>Takes both numbers as they are, stretching the picture if its proportions differ.</summary>
    Stretch = 0,

    /// <summary>Keeps the proportions and fits inside the size: one side meets it, the other comes out shorter.</summary>
    Contain = 1,

    /// <summary>Keeps the proportions and covers the size, cutting what overhangs it off both ends.</summary>
    Cover = 2,
}

/// <summary>
/// The picture at a new size, resampled.
/// </summary>
[GraphNode(Key = NodeKey, Category = ImageNodes.Category, Title = "Resize", Description = "Resamples the picture to a new size.", Icon = UIGlyphs.AspectRatio, Color = ImageNodes.Color)]
public sealed class ResizeImageNode : IGraphNodeAsync
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "image.resize";

    /// <summary>The largest side a resize makes, in pixels.</summary>
    public const int MaxSide = 8192;

    /// <summary>Gets or sets the address of the picture.</summary>
    [GraphInput(Title = "Image", PinOnly = true, Required = true, Image = true)]
    public string? Image { get; set; }

    /// <summary>Gets or sets the width asked for, in pixels.</summary>
    [GraphInput(Title = "Width", Min = 1, Max = MaxSide, Unit = "px")]
    public int Width { get; set; } = 640;

    /// <summary>Gets or sets the height asked for, in pixels.</summary>
    [GraphInput(Title = "Height", Min = 1, Max = MaxSide, Unit = "px")]
    public int Height { get; set; } = 480;

    /// <summary>Gets or sets how the picture meets that size.</summary>
    [GraphInput(Title = "Mode", NoPin = true)]
    public ImageResizeMode Mode { get; set; } = ImageResizeMode.Contain;

    /// <summary>Gets or sets the address of the resized picture.</summary>
    [GraphOutput(Title = "Image", Image = true)]
    public string? Result { get; set; }

    /// <inheritdoc/>
    public async ValueTask ExecuteAsync(UINodeRunContext context, CancellationToken cancellationToken = default)
        => Result = await ImageWork.TransformAsync(context, Image, Resize, Share, null, ImageWork.DefaultQuality, cancellationToken).ConfigureAwait(false);

    /// <summary>
    /// How much of a picture of that size the resize draws from: the side that meets the size asked for decides, the smaller share
    /// for Contain (the other side comes out shorter) and the larger for Cover and Stretch (the other side is cut or squeezed).
    /// </summary>
    private double Share(SKSizeI seen)
    {
        var across = Math.Clamp(Width, 1, MaxSide) / (double)Math.Max(1, seen.Width);
        var down = Math.Clamp(Height, 1, MaxSide) / (double)Math.Max(1, seen.Height);

        return Mode == ImageResizeMode.Contain ? Math.Min(across, down) : Math.Max(across, down);
    }

    private SKBitmap Resize(SKBitmap source)
    {
        var width = Math.Clamp(Width, 1, MaxSide);
        var height = Math.Clamp(Height, 1, MaxSide);
        SKRect from = new(0, 0, source.Width, source.Height);

        if (Mode == ImageResizeMode.Contain)
        {
            var scale = Math.Min(width / (double)source.Width, height / (double)source.Height);

            width = Math.Max(1, (int)Math.Round(source.Width * scale));
            height = Math.Max(1, (int)Math.Round(source.Height * scale));
        }
        else if (Mode == ImageResizeMode.Cover)
        {
            // The part of the picture with the proportions asked for, as large as fits, centred.
            var scale = Math.Max(width / (double)source.Width, height / (double)source.Height);
            var keptWidth = (float)(width / scale);
            var keptHeight = (float)(height / scale);

            from = SKRect.Create((source.Width - keptWidth) / 2, (source.Height - keptHeight) / 2, keptWidth, keptHeight);
        }

        using SKImage image = SKImage.FromBitmap(source);

        return ImageWork.Draw(width, height, canvas => canvas.DrawImage(image, from, new SKRect(0, 0, width, height), new SKSamplingOptions(SKCubicResampler.Mitchell)));
    }
}
