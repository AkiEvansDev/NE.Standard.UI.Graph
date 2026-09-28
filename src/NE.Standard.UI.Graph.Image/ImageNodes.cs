using System;
using System.Collections.Generic;

namespace NE.Standard.UI.Graph.Image;

/// <summary>
/// The picture kinds, for a catalogue beside an application's own; they wear the core's own glyphs, so the host registers nothing
/// for them. A picture chosen on the node is the canvas's own <see cref="UINodeKinds"/> <c>ImageNode</c>, and a picture
/// is shown by its <c>DisplayNode</c>; the kinds here read and write through the application's <see cref="IUINodeImageStore"/>.
/// Loading and saving picture files on the server's disk are <see cref="FileKinds"/>, apart, since they reach the disk.
/// </summary>
public static class ImageNodes
{
    /// <summary>Where the kinds stand in the picker.</summary>
    public const string Category = "Image";

    /// <summary>The colour a picture kind wears: the canvas's own picture kind's, so a chain of pictures reads as one colour.</summary>
    public const string Color = "var(--ui-color-series-1)";

    /// <summary>Gets the picture kinds that work a picture in the image store, for <see cref="UINodeCatalog.FromTypes"/>.</summary>
    public static IReadOnlyList<Type> Kinds { get; } =
    [
        typeof(ImageSizeNode),
        typeof(ResizeImageNode),
        typeof(CropImageNode),
        typeof(RotateImageNode),
        typeof(FlipImageNode),
        typeof(GrayscaleImageNode),
        typeof(BlurImageNode),
        typeof(ConvertImageNode)
    ];

    /// <summary>
    /// Gets the picture kinds that load and save a file on the server's disk, for a catalogue that means to reach it: what they may
    /// touch is the application's to open (<c>services.AddGraphFiles(...)</c>), and unopened they reach nothing.
    /// </summary>
    public static IReadOnlyList<Type> FileKinds { get; } =
    [
        typeof(LoadImageNode),
        typeof(SaveImageNode)
    ];
}
