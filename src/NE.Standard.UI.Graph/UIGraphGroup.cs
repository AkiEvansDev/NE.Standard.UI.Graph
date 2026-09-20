using System.Text.Json.Serialization;

namespace NE.Standard.UI.Graph;

/// <summary>
/// A point on the canvas.
/// </summary>
public readonly record struct UIGraphPoint(double X, double Y);

/// <summary>
/// A coloured frame with a title that carries the items inside it when dragged.
/// </summary>
[method: JsonConstructor]
public sealed class UIGraphGroup(string id, double x, double y, double width, double height, string? title = null, string? color = null, bool pinned = false)
{
    /// <summary>
    /// Gets the group's own id.
    /// </summary>
    public string Id { get; } = id;

    /// <summary>
    /// Gets the frame's left edge.
    /// </summary>
    public double X { get; } = x;

    /// <summary>
    /// Gets the frame's top edge.
    /// </summary>
    public double Y { get; } = y;

    /// <summary>
    /// Gets the frame's width.
    /// </summary>
    public double Width { get; } = width;

    /// <summary>
    /// Gets the frame's height.
    /// </summary>
    public double Height { get; } = height;

    /// <summary>
    /// Gets the title drawn on the frame's band.
    /// </summary>
    public string? Title { get; } = title;

    /// <summary>
    /// Gets the frame's colour, as <c>UIThemeColor</c> writes one.
    /// </summary>
    public string? Color { get; } = color;

    /// <summary>
    /// Gets whether the frame is pinned: it is not dragged, and so carries none of the items inside it anywhere.
    /// </summary>
    public bool Pinned { get; } = pinned;
}
