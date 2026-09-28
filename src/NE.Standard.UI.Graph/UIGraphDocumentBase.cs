namespace NE.Standard.UI.Graph;

/// <summary>
/// What every layered graph's document holds: node placement, edge bend points, and groups. The draft of node changes is each
/// document's own, since its shape is kind-specific.
/// </summary>
public abstract class UIGraphDocumentBase(UIGraphPlacement[]? nodes, UIGraphRoute[]? edges, UIGraphGroup[]? groups, string? key)
{
    /// <summary>
    /// Gets where each placed node stands, by the node's key.
    /// </summary>
    public UIGraphPlacement[] Nodes { get; } = nodes ?? [];

    /// <summary>
    /// Gets the reroute points of each bent edge, by the edge's key.
    /// </summary>
    public UIGraphRoute[] Edges { get; } = edges ?? [];

    /// <summary>
    /// Gets the groups, each a frame that carries the nodes inside it.
    /// </summary>
    public UIGraphGroup[] Groups { get; } = groups ?? [];

    /// <summary>
    /// Gets what the application calls this document — a build's id, a file's name — sent back by the canvas as it was given, so
    /// a save names the document it was made from even when another has taken its place on the canvas since.
    /// </summary>
    public string? Key { get; } = key;
}
