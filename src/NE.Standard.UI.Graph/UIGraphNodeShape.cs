namespace NE.Standard.UI.Graph;

/// <summary>
/// How a graph's node is drawn.
/// </summary>
public enum UIGraphNodeShape
{
    /// <summary>A card: the icon or picture, the title and the line under it, and the badge at its end.</summary>
    Card,

    /// <summary>A circle holding the node's picture, or its icon when it has none, with the title standing under it and as its tooltip.</summary>
    Icon
}
