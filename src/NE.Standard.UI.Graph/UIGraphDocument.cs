using System.Text.Json.Serialization;

namespace NE.Standard.UI.Graph;

/// <summary>
/// The graph's document: the layout from <see cref="UIGraphDocumentBase"/>, plus the draft of node changes. Nodes and links are
/// the bound collection's, not the document's; an unplaced node is placed by the layout.
/// </summary>
[method: JsonConstructor]
public sealed class UIGraphDocument(UIGraphPlacement[]? nodes = null, UIGraphRoute[]? edges = null, UIGraphGroup[]? groups = null, UIGraphDraft? draft = null)
    : UIGraphDocumentBase(nodes, edges, groups)
{
    /// <summary>
    /// Gets the empty document.
    /// </summary>
    public static UIGraphDocument Empty { get; } = new();

    /// <summary>
    /// Gets what the viewer changed about the nodes since the last save, for the application to apply.
    /// </summary>
    public UIGraphDraft Draft { get; } = draft ?? UIGraphDraft.Empty;

    /// <summary>
    /// The same layout with the draft taken off — what an application puts back once it has applied the draft to its nodes.
    /// </summary>
    public UIGraphDocument WithoutDraft()
        => new(Nodes, Edges, Groups);
}

/// <summary>
/// Where one node stands, and what the viewer made of it on the canvas.
/// </summary>
[method: JsonConstructor]
public sealed class UIGraphPlacement(string id, double x = 0, double y = 0, bool pinned = false)
{
    /// <summary>
    /// Gets the key of the node placed.
    /// </summary>
    public string Id { get; } = id;

    /// <summary>
    /// Gets the node's left edge on the canvas.
    /// </summary>
    public double X { get; } = x;

    /// <summary>
    /// Gets the node's top edge on the canvas.
    /// </summary>
    public double Y { get; } = y;

    /// <summary>
    /// Gets whether the node is pinned: it does not move, and neither Arrange nor its group carries it.
    /// </summary>
    public bool Pinned { get; } = pinned;
}

/// <summary>
/// The points one edge is bent through, in order along it.
/// </summary>
[method: JsonConstructor]
public sealed class UIGraphRoute(string id, UIGraphPoint[]? points = null)
{
    /// <summary>
    /// Gets the key of the link the edge draws.
    /// </summary>
    public string Id { get; } = id;

    /// <summary>
    /// Gets the reroute points, in order along the edge.
    /// </summary>
    public UIGraphPoint[] Points { get; } = points ?? [];
}
