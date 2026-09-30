using System.IO;
using SkiaSharp;

namespace DemoApp.Nodes;

/// <summary>
/// The folder the demo's file kinds start from and the only one they reach, under the system's temporary folder: <c>in</c>, which the demo fills with a few
/// pictures of its own drawing on start, so the repository carries no picture files, and which every page reads and none writes;
/// and <c>out</c>, where each page's sheet writes into a folder of its own, which no other page reaches.
/// </summary>
internal static class DemoFolders
{
    public const string In = "in";
    public const string Out = "out";

    private static readonly (string Name, SKColor Ground, SKColor Mark)[] Samples =
    [
        ("dawn.png", new SKColor(0xE0, 0x7A, 0x5F), new SKColor(0xF2, 0xCC, 0x8F)),
        ("sea.png", new SKColor(0x3D, 0x5A, 0x80), new SKColor(0x98, 0xC1, 0xD9)),
        ("moss.png", new SKColor(0x81, 0xB2, 0x9A), new SKColor(0xF4, 0xF1, 0xDE)),
        ("dusk.png", new SKColor(0x3D, 0x40, 0x5B), new SKColor(0xE0, 0x7A, 0x5F))
    ];

    public static string Root { get; } = Path.Combine(Path.GetTempPath(), "ne-nodes-demo");

    /// <summary>Makes <c>in</c> and draws its pictures, once, as the application starts.</summary>
    public static void Prepare()
    {
        var input = Path.Combine(Root, In);

        _ = Directory.CreateDirectory(input);

        foreach ((var name, SKColor ground, SKColor mark) in Samples)
        {
            var path = Path.Combine(input, name);

            if (!File.Exists(path))
                File.WriteAllBytes(path, Draw(ground, mark));
        }
    }

    /// <summary>What one page's file kinds reach: <c>in</c> to read, and the page's own folder under <c>out</c> to read and write.</summary>
    /// <remarks>
    /// The base folder only resolves a relative path; the check is what keeps an absolute one, `..` or a link from the rest of the
    /// disk, and one page's sheet from another's pictures.
    /// </remarks>
    public static UINodeFiles For(string page)
    {
        var input = Path.Combine(Root, In);
        var own = Path.GetFullPath(page, Root);

        return new UINodeFiles
        {
            BasePath = Root,
            Allow = (path, access) => UINodeFiles.IsInside(path, own) || (access == UINodeFileAccess.Read && UINodeFiles.IsInside(path, input))
        };
    }

    /// <summary>A ground with a sun and a hill on it: enough shape that a resize, a crop or a blur shows.</summary>
    private static byte[] Draw(SKColor ground, SKColor mark)
    {
        using SKBitmap bitmap = new(480, 320);

        using (SKCanvas canvas = new(bitmap))
        using (SKPaint paint = new() { Color = mark, IsAntialias = true })
        {
            canvas.Clear(ground);
            canvas.DrawCircle(340, 110, 56, paint);
            canvas.DrawOval(new SKRect(-80, 220, 360, 420), paint);
        }

        using SKData png = bitmap.Encode(SKEncodedImageFormat.Png, 100);

        return png.ToArray();
    }
}
