using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace NE.Standard.UI.Graph;

/// <summary>
/// What a node canvas holds: nodes, edges between their pins, groups, and the inputs set out as the sheet's parameters. One JSON
/// object, committed whole by a save.
/// </summary>
[method: JsonConstructor]
public sealed class UINodeDocument(UINode[]? nodes = null, UINodeEdge[]? edges = null, UIGraphGroup[]? groups = null, string? key = null, UINodeParameter[]? parameters = null)
{
    /// <summary>
    /// Gets the empty document.
    /// </summary>
    public static UINodeDocument Empty { get; } = new();

    /// <summary>
    /// Gets the nodes on the canvas.
    /// </summary>
    public UINode[] Nodes { get; } = Present(nodes);

    /// <summary>
    /// Gets the edges between the nodes' pins.
    /// </summary>
    public UINodeEdge[] Edges { get; } = Present(edges);

    /// <summary>
    /// Gets the groups, each a frame that carries the nodes inside it.
    /// </summary>
    public UIGraphGroup[] Groups { get; } = Present(groups);

    /// <summary>
    /// Gets what the application calls this document — a build's id, a file's name — sent back by the canvas as it was given.
    /// </summary>
    /// <remarks>So a save names the document it was made from, even when another has taken its place on the canvas since.</remarks>
    public string? Key { get; } = key;

    /// <summary>Gets the inputs the viewer set out as the sheet's parameters, in the order they were added.</summary>
    /// <remarks>
    /// Each is edited in the parameters panel as well as on its node (<c>NodesComponent.ShowParameters</c>). As it came off the
    /// wire; read them through <see cref="UINodeCatalog.ParametersOf"/>, which passes over one whose node is gone, whose input is
    /// wired or has no field.
    /// </remarks>
    public UINodeParameter[] Parameters { get; } = Present(parameters);

    /// <summary>The entries of a list as the wire may send it: none for none, and an entry sent as nothing left out.</summary>
    private static TEntry[] Present<TEntry>(TEntry[]? entries)
        where TEntry : class
        => entries is null ? [] : Array.TrueForAll(entries, static entry => entry is not null) ? entries : Array.FindAll(entries, static entry => entry is not null);

    /// <summary>
    /// The same document under another key — how an application names the document it puts on the canvas.
    /// </summary>
    public UINodeDocument WithKey(string? key)
        => new(Nodes, Edges, Groups, key, Parameters);

    /// <summary>
    /// The same document with these inputs as its parameters — how an application sets a sheet's parameters out before the viewer
    /// sees it.
    /// </summary>
    /// <remarks>An input of a node the document lacks, or one an edge feeds, is refused: a wired input's value is the wire's.</remarks>
    public UINodeDocument WithParameters(params UINodeParameter[] parameters)
    {
        ArgumentNullException.ThrowIfNull(parameters);

        foreach (UINodeParameter parameter in parameters)
        {
            ArgumentNullException.ThrowIfNull(parameter, nameof(parameters));

            if (!Array.Exists(Nodes, node => string.Equals(node.Id, parameter.Node, StringComparison.Ordinal)))
                throw new ArgumentException($"The document has no node '{parameter.Node}' for the parameter '{parameter.Pin}'.", nameof(parameters));

            if (IsFed(parameter.Node, parameter.Pin))
                throw new ArgumentException($"The input '{parameter.Pin}' of node '{parameter.Node}' is wired, so it cannot be a parameter.", nameof(parameters));
        }

        return new(Nodes, Edges, Groups, Key, parameters);
    }

    /// <summary>Whether an edge feeds one input of one node.</summary>
    internal bool IsFed(string nodeId, string pinName)
        => Array.Exists(Edges, edge => string.Equals(edge.ToNode, nodeId, StringComparison.Ordinal) && string.Equals(edge.ToPin, pinName, StringComparison.Ordinal));

    /// <summary>
    /// A copy of the document with one pin of one node set to a value — a node's state as a run left it, say; the document itself
    /// when no node has the id.
    /// </summary>
    public UINodeDocument WithValue(string nodeId, string pinName, object? value)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(nodeId);
        ArgumentException.ThrowIfNullOrWhiteSpace(pinName);

        var at = Array.FindIndex(Nodes, node => string.Equals(node.Id, nodeId, StringComparison.Ordinal));

        if (at < 0)
            return this;

        UINode node = Nodes[at];
        UINode[] nodes = [.. Nodes];
        Dictionary<string, object?> values = new(node.Values, StringComparer.Ordinal) { [pinName] = value };

        nodes[at] = new UINode(node.Id, node.Type, node.X, node.Y, node.Title, node.Color, node.Pinned, node.Collapsed, values, node.Width, node.Height);

        return new UINodeDocument(nodes, Edges, Groups, Key, Parameters);
    }
}

/// <summary>
/// One input set out as a parameter of the sheet: the node's id and the name of its input pin.
/// </summary>
[method: JsonConstructor]
public sealed class UINodeParameter(string node, string pin)
{
    /// <summary>
    /// Gets the id of the node the input is on.
    /// </summary>
    public string Node { get; } = node;

    /// <summary>
    /// Gets the name of the input pin.
    /// </summary>
    public string Pin { get; } = pin;
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
