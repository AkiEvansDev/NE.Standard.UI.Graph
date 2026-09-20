using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace NE.Standard.UI.Graph;

/// <summary>
/// What a node canvas holds: nodes, edges between their pins, and groups. One JSON object, committed whole by a save.
/// </summary>
[method: JsonConstructor]
public sealed class UINodeDocument(UINode[]? nodes = null, UINodeEdge[]? edges = null, UIGraphGroup[]? groups = null)
{
    /// <summary>
    /// Gets the empty document.
    /// </summary>
    public static UINodeDocument Empty { get; } = new();

    /// <summary>
    /// Gets the nodes on the canvas.
    /// </summary>
    public UINode[] Nodes { get; } = nodes ?? [];

    /// <summary>
    /// Gets the edges between the nodes' pins.
    /// </summary>
    public UINodeEdge[] Edges { get; } = edges ?? [];

    /// <summary>
    /// Gets the groups, each a frame that carries the nodes inside it.
    /// </summary>
    public UIGraphGroup[] Groups { get; } = groups ?? [];
}

/// <summary>
/// One node on the canvas: which kind it is, where it stands, and what its inputs were set to.
/// </summary>
[method: JsonConstructor]
public sealed class UINode(string id, string type, double x = 0, double y = 0, string? title = null, string? color = null, bool pinned = false, bool collapsed = false, IReadOnlyDictionary<string, object?>? values = null, double? width = null, double? height = null)
{
    /// <summary>
    /// Gets the node's own id, unique in the document; an edge names it.
    /// </summary>
    public string Id { get; } = id;

    /// <summary>
    /// Gets the key of the node kind, as the catalogue lists it.
    /// </summary>
    public string Type { get; } = type;

    /// <summary>
    /// Gets the node's left edge on the canvas.
    /// </summary>
    public double X { get; } = x;

    /// <summary>
    /// Gets the node's top edge on the canvas.
    /// </summary>
    public double Y { get; } = y;

    /// <summary>
    /// Gets the title the viewer gave it; unset, the kind's own title is shown.
    /// </summary>
    public string? Title { get; } = title;

    /// <summary>
    /// Gets the node's colour, as <c>UIThemeColor</c> writes one; unset, the kind's own.
    /// </summary>
    public string? Color { get; } = color;

    /// <summary>
    /// Gets whether the node is pinned: it does not move, and its group does not carry it.
    /// </summary>
    public bool Pinned { get; } = pinned;

    /// <summary>
    /// Gets whether the node is folded to its head, body hidden and pins gathered on the head's edges. Saved, so a reloaded sheet
    /// returns folded as the viewer left it.
    /// </summary>
    public bool Collapsed { get; } = collapsed;

    /// <summary>
    /// Gets the values of the inputs the viewer filled in, by pin name. A pin an edge feeds carries no value here.
    /// </summary>
    public IReadOnlyDictionary<string, object?> Values { get; } = values ?? new Dictionary<string, object?>(StringComparer.Ordinal);

    /// <summary>
    /// Gets how wide the viewer dragged the node, in canvas units; unset, the kind's own least width.
    /// </summary>
    public double? Width { get; } = width;

    /// <summary>
    /// Gets how tall the viewer dragged the node, in canvas units; unset, as tall as its contents make it.
    /// </summary>
    public double? Height { get; } = height;
}

/// <summary>
/// One connection: an output pin of one node feeding an input pin of another, through the points the viewer dragged.
/// </summary>
[method: JsonConstructor]
public sealed class UINodeEdge(string id, string fromNode, string fromPin, string toNode, string toPin, UIGraphPoint[]? points = null)
{
    /// <summary>
    /// Gets the edge's own id.
    /// </summary>
    public string Id { get; } = id;

    /// <summary>
    /// Gets the id of the node the edge leaves.
    /// </summary>
    public string FromNode { get; } = fromNode;

    /// <summary>
    /// Gets the name of the output pin the edge leaves.
    /// </summary>
    public string FromPin { get; } = fromPin;

    /// <summary>
    /// Gets the id of the node the edge enters.
    /// </summary>
    public string ToNode { get; } = toNode;

    /// <summary>
    /// Gets the name of the input pin the edge enters.
    /// </summary>
    public string ToPin { get; } = toPin;

    /// <summary>
    /// Gets the reroute points the viewer added, in order along the edge.
    /// </summary>
    public UIGraphPoint[] Points { get; } = points ?? [];
}
