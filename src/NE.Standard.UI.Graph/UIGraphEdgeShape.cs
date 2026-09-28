namespace NE.Standard.UI.Graph;

/// <summary>
/// How an edge is drawn between two pins.
/// </summary>
public enum UIGraphEdgeShape
{
    /// <summary>A curve leaving each pin sideways.</summary>
    Bezier,

    /// <summary>A straight line from pin to pin.</summary>
    Straight,

    /// <summary>Horizontal and vertical runs with square corners.</summary>
    Orthogonal
}
