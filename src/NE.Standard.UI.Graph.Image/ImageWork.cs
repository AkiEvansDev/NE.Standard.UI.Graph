using System;
using System.Runtime.InteropServices;
using System.Threading;
using System.Threading.Tasks;
using SkiaSharp;

namespace NE.Standard.UI.Graph.Image;

/// <summary>
/// What every picture kind does around its own step: decoding the picture that reached it, and encoding and keeping the new one.
/// </summary>
internal static class ImageWork
{
    /// <summary>What a lossy format is written at when the kind asks for no quality of its own.</summary>
    public const int DefaultQuality = 90;

    /// <summary>How a picture is drawn at its own size, turned by quarters or mirrored: every pixel lands on one, so none is blended.</summary>
    public static readonly SKSamplingOptions PixelForPixel = new(SKFilterMode.Nearest);

    /// <summary>The file one address names in the application's store.</summary>
    public static async ValueTask<UINodeImageFile> ReadFileAsync(UINodeRunContext context, string? address, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(address))
            throw new InvalidOperationException("No picture reached the node.");

        return await StoreOf(context).ReadAsync(address, cancellationToken).ConfigureAwait(false)
            ?? throw new InvalidOperationException($"The image store holds no picture at {address}.");
    }

    /// <summary>The store the run was handed; a run without one is a host that forgot to register it.</summary>
    public static IUINodeImageStore StoreOf(UINodeRunContext context)
        => context.Services?.GetService(typeof(IUINodeImageStore)) as IUINodeImageStore
        ?? throw new InvalidOperationException("No image store: register one (services.AddGraphImages(), or an IUINodeImageStore of the application's own) and hand the runner the services.");

    /// <summary>Reads the picture, makes a new one of it, and keeps that in the old one's format; answers the new one's address.</summary>
    public static ValueTask<string> TransformAsync(UINodeRunContext context, string? address, Func<SKBitmap, SKBitmap> transform, CancellationToken cancellationToken)
        => TransformAsync(context, address, transform, null, null, DefaultQuality, cancellationToken);

    /// <summary>Reads the picture, makes a new one of it, and keeps that in the format given, or the old one's.</summary>
    /// <remarks>
    /// <paramref name="share"/>, given the picture's size as seen, answers the least share of it the step needs, so a picture that
    /// will come out smaller is decoded smaller where its format allows.
    /// </remarks>
    public static async ValueTask<string> TransformAsync(UINodeRunContext context, string? address, Func<SKBitmap, SKBitmap> transform, Func<SKSizeI, double>? share, SKEncodedImageFormat? format, int quality, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(context);

        UINodeImageFile file = await ReadFileAsync(context, address, cancellationToken).ConfigureAwait(false);
        UINodeImageLimits limits = UINodeImageLimits.Of(context);
        SKEncodedImageFormat read;
        SKData encoded;

        // One turn a picture, process-wide: each holds several full-size bitmaps until it is encoded.
        using (await limits.EnterAsync(cancellationToken).ConfigureAwait(false))
        using (SKCodec codec = OpenCodec(file))
        using (SKBitmap source = Decode(codec, limits.MaxPixels, share))
        using (SKBitmap result = transform(source))
        {
            read = codec.EncodedFormat;
            encoded = Encode(result, format ?? read, quality);
        }

        using (encoded)
        {
            UINodeImageFile written = new(encoded.ToArray(), ContentTypeOf(Writable(format ?? read)), file.FileName);

            return await StoreOf(context).WriteAsync(written, cancellationToken).ConfigureAwait(false);
        }
    }

    /// <summary>A decoder over one file; a file that is not a picture SkiaSharp reads says so.</summary>
    [System.Diagnostics.CodeAnalysis.SuppressMessage("Reliability", "CA2000:Dispose objects before losing scope", Justification = "The codec takes the stream over and closes it with itself.")]
    public static SKCodec OpenCodec(UINodeImageFile file)
    {
        ArgumentNullException.ThrowIfNull(file);

        // The kept array itself where the file is one whole array, as a store's usually is: a picture is read on every run.
        var bytes = MemoryMarshal.TryGetArray(file.Bytes, out ArraySegment<byte> kept) && kept.Array is not null && kept.Offset == 0 && kept.Count == kept.Array.Length
            ? kept.Array
            : file.Bytes.ToArray();

        // SkiaSharp answers a file it cannot read with a result, whatever its annotations say of the codec.
        SKCodec codec = SKCodec.Create(new SKMemoryStream(bytes), out SKCodecResult result);

        return result == SKCodecResult.Success
            ? codec
            : throw new InvalidOperationException($"The file is not a picture this node can read ({result}).");
    }

    /// <summary>
    /// The picture decoded, at the least size <paramref name="share"/> allows where the format decodes smaller, and turned the way
    /// its file says it is seen.
    /// </summary>
    /// <remarks>
    /// A phone's photograph taken on its side stands up. A picture of more than <paramref name="maxPixels"/> once decoded is
    /// refused before a pixel is allocated.
    /// </remarks>
    public static SKBitmap Decode(SKCodec codec, long maxPixels, Func<SKSizeI, double>? share = null)
    {
        ArgumentNullException.ThrowIfNull(codec);

        SKEncodedOrigin origin = codec.EncodedOrigin;
        var sideways = IsSideways(origin);
        SKSizeI size = DecodedSize(codec, sideways, share);

        if ((long)size.Width * size.Height > maxPixels)
            throw new InvalidOperationException($"The picture is {codec.Info.Width} by {codec.Info.Height}: more pixels than a picture kind decodes ({maxPixels:N0}).");

        // Four bytes a pixel whatever the file holds, which is what the pixel cap counts on.
        SKImageInfo info = new(size.Width, size.Height, SKImageInfo.PlatformColorType, codec.Info.AlphaType == SKAlphaType.Opaque ? SKAlphaType.Opaque : SKAlphaType.Premul);
        SKBitmap decoded = SKBitmap.Decode(codec, info) ?? throw new InvalidOperationException("The picture could not be decoded.");

        if (origin is SKEncodedOrigin.TopLeft or 0)
            return Settled(decoded);

        using (decoded)
        {
            var width = decoded.Width;
            var height = decoded.Height;

            return Settled(Draw(sideways ? height : width, sideways ? width : height, canvas =>
            {
                canvas.SetMatrix(OriginMatrix(origin, width, height));
                canvas.DrawBitmap(decoded, 0, 0, PixelForPixel, null);
            }));
        }
    }

    /// <summary>
    /// The size a picture is decoded at: its own, or the codec's nearest smaller scale that still gives the step twice its share.
    /// </summary>
    /// <remarks>Twice, so the step's own resampling has pixels to work from.</remarks>
    private static SKSizeI DecodedSize(SKCodec codec, bool sideways, Func<SKSizeI, double>? share)
    {
        SKSizeI stored = codec.Info.Size;

        if (share is null)
            return stored;

        var wanted = share(sideways ? new SKSizeI(stored.Height, stored.Width) : stored) * 2;

        if (!double.IsFinite(wanted) || wanted >= 1 || wanted <= 0)
            return stored;

        SKSizeI scaled = codec.GetScaledDimensions((float)wanted);

        // The codec may round below the share asked for; the picture's own size is the safe answer then.
        return scaled.Width > 0 && scaled.Height > 0 && scaled.Width >= stored.Width * wanted && scaled.Height >= stored.Height * wanted ? scaled : stored;
    }

    /// <summary>
    /// A decoded picture no step changes, marked so: drawing a bitmap Skia may otherwise alter copies its pixels first, which for a
    /// photograph is another full picture in memory.
    /// </summary>
    private static SKBitmap Settled(SKBitmap bitmap)
    {
        bitmap.SetImmutable();

        return bitmap;
    }

    /// <summary>Whether a picture stored that way is seen with its width and height the other way round.</summary>
    public static bool IsSideways(SKEncodedOrigin origin)
        => origin is SKEncodedOrigin.LeftTop or SKEncodedOrigin.RightTop or SKEncodedOrigin.RightBottom or SKEncodedOrigin.LeftBottom;

    /// <summary>Where each stored pixel lands in the picture as seen: Skia's own table (SkEncodedOriginToMatrix), for a stored size.</summary>
    private static SKMatrix OriginMatrix(SKEncodedOrigin origin, int width, int height)
        => origin switch
        {
            SKEncodedOrigin.TopRight => new SKMatrix(-1, 0, width, 0, 1, 0, 0, 0, 1),
            SKEncodedOrigin.BottomRight => new SKMatrix(-1, 0, width, 0, -1, height, 0, 0, 1),
            SKEncodedOrigin.BottomLeft => new SKMatrix(1, 0, 0, 0, -1, height, 0, 0, 1),
            SKEncodedOrigin.LeftTop => new SKMatrix(0, 1, 0, 1, 0, 0, 0, 0, 1),
            SKEncodedOrigin.RightTop => new SKMatrix(0, -1, height, 1, 0, 0, 0, 0, 1),
            SKEncodedOrigin.RightBottom => new SKMatrix(0, -1, height, -1, 0, width, 0, 0, 1),
            SKEncodedOrigin.LeftBottom => new SKMatrix(0, 1, 0, -1, 0, width, 0, 0, 1),
            _ => SKMatrix.Identity
        };

    /// <summary>The picture encoded; JPEG has no transparency, so a picture going out as one is laid on white rather than on black.</summary>
    private static SKData Encode(SKBitmap bitmap, SKEncodedImageFormat format, int quality)
    {
        SKEncodedImageFormat written = Writable(format);

        if (written == SKEncodedImageFormat.Jpeg && bitmap.AlphaType != SKAlphaType.Opaque && !bitmap.IsImmutable)
        {
            using SKCanvas canvas = new(bitmap);

            // Behind what is there, in place: no second picture.
            canvas.DrawColor(SKColors.White, SKBlendMode.DstOver);
        }

        return bitmap.Encode(written, Math.Clamp(quality, 1, 100)) ?? throw new InvalidOperationException("The picture could not be encoded.");
    }

    /// <summary>The format a picture is written in: SkiaSharp writes PNG, JPEG and WebP, so a GIF or a BMP read goes out as PNG.</summary>
    private static SKEncodedImageFormat Writable(SKEncodedImageFormat format)
        => format is SKEncodedImageFormat.Jpeg or SKEncodedImageFormat.Webp ? format : SKEncodedImageFormat.Png;

    private static string ContentTypeOf(SKEncodedImageFormat format)
        => format switch
        {
            SKEncodedImageFormat.Jpeg => "image/jpeg",
            SKEncodedImageFormat.Webp => "image/webp",
            _ => "image/png"
        };

    /// <summary>The media type a picture file's first bytes say it is, or null for a file that is none the kinds read.</summary>
    public static string? Sniff(ReadOnlySpan<byte> bytes)
    {
        if (bytes.StartsWith((ReadOnlySpan<byte>)[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))
            return "image/png";

        if (bytes.StartsWith((ReadOnlySpan<byte>)[0xFF, 0xD8, 0xFF]))
            return "image/jpeg";

        if (bytes.StartsWith("GIF87a"u8) || bytes.StartsWith("GIF89a"u8))
            return "image/gif";

        if (bytes.Length >= 12 && bytes.StartsWith("RIFF"u8) && bytes[8..12].SequenceEqual("WEBP"u8))
            return "image/webp";

        return bytes.Length >= 26 && bytes.StartsWith("BM"u8) ? "image/bmp" : null;
    }

    /// <summary>The extension a picture of a media type is saved under.</summary>
    public static string ExtensionOf(string contentType)
        => contentType switch
        {
            "image/jpeg" => ".jpg",
            "image/webp" => ".webp",
            "image/gif" => ".gif",
            "image/bmp" => ".bmp",
            _ => ".png"
        };

    /// <summary>A new picture of the size given, drawn by one call onto a clear canvas.</summary>
    public static SKBitmap Draw(int width, int height, Action<SKCanvas> draw)
    {
        ArgumentNullException.ThrowIfNull(draw);

        SKBitmap target = new(new SKImageInfo(Math.Max(1, width), Math.Max(1, height), SKImageInfo.PlatformColorType, SKAlphaType.Premul));

        using SKCanvas canvas = new(target);

        canvas.Clear(SKColors.Transparent);
        draw(canvas);

        return target;
    }
}
