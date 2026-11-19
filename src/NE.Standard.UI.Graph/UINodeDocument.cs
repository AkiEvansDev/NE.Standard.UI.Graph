using System;
using System.Collections;
using System.Collections.Generic;
using System.Text.Json;
using System.Text.Json.Serialization;
using NE.Standard.UI.Abstractions.Recursive;

namespace NE.Standard.UI.Graph;

/// <summary>
/// What a node canvas holds: nodes, edges between their pins, groups, and the inputs set out as the sheet's parameters. One JSON
/// object, committed whole by a save.
/// </summary>
[method: JsonConstructor]
public sealed class UINodeDocument(UINode[]? nodes = null, UINodeEdge[]? edges = null, UIGraphGroup[]? groups = null, string? key = null, UINodeParameter[]? parameters = null) : IEquatable<UINodeDocument>
{
    /// <summary>
    /// Gets the empty document.
    /// </summary>
    public static UINodeDocument Empty { get; } = new();

    /// <summary>
    /// Gets the nodes on the canvas.
    /// </summary>
    public UINode[] Nodes { get; } = UIGraphDraftSupport.Present(nodes);

    /// <summary>
    /// Gets the edges between the nodes' pins.
    /// </summary>
    public UINodeEdge[] Edges { get; } = UIGraphDraftSupport.Present(edges);

    /// <summary>
    /// Gets the groups, each a frame that carries the nodes inside it.
    /// </summary>
    public UIGraphGroup[] Groups { get; } = UIGraphDraftSupport.Present(groups);

    /// <summary>
    /// Gets what the application calls this document — a build's id, a file's name — sent back by the canvas as it was given.
    /// </summary>
    /// <remarks>So a save names the document it was made from, even when another has taken its place on the canvas since.</remarks>
    public string? Key { get; } = key;

    /// <summary>Gets the inputs the viewer set out as the sheet's parameters, in the order they were added.</summary>
    /// <remarks>
    /// Each is edited in a <see cref="NodesParametersComponent"/> as well as on its node. As it came off the
    /// wire; read them through <see cref="UINodeCatalog.ParametersOf"/>, which passes over one whose node is gone, whose input is
    /// wired or has no field.
    /// </remarks>
    public UINodeParameter[] Parameters { get; } = UIGraphDraftSupport.Present(parameters);

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

        nodes[at] = new UINode(node.Id, node.Type, node.X, node.Y, node.Title, node.Color, node.Pinned, node.Collapsed, values, node.Width, node.Height, node.Enabled);

        return new UINodeDocument(nodes, Edges, Groups, Key, Parameters);
    }

    /// <inheritdoc />
    public bool Equals(UINodeDocument? other)
        => ReferenceEquals(this, other)
            || (other is not null
                && string.Equals(Key, other.Key, StringComparison.Ordinal)
                && UIGraphDraftSupport.Same(Nodes, other.Nodes)
                && UIGraphDraftSupport.Same(Edges, other.Edges)
                && UIGraphDraftSupport.Same(Groups, other.Groups)
                && UIGraphDraftSupport.Same(Parameters, other.Parameters));

    /// <inheritdoc />
    public override bool Equals(object? obj)
        => obj is UINodeDocument other && Equals(other);

    /// <inheritdoc />
    public override int GetHashCode()
        => HashCode.Combine(Nodes.Length, Edges.Length, Groups.Length, Key, Parameters.Length);
}

/// <summary>
/// One input set out as a parameter of the sheet: the node's id and the name of its input pin.
/// </summary>
[method: JsonConstructor]
public sealed class UINodeParameter(string node, string pin) : IEquatable<UINodeParameter>
{
    /// <summary>
    /// Gets the id of the node the input is on.
    /// </summary>
    public string Node { get; } = node;

    /// <summary>
    /// Gets the name of the input pin.
    /// </summary>
    public string Pin { get; } = pin;

    /// <inheritdoc />
    public bool Equals(UINodeParameter? other)
        => ReferenceEquals(this, other)
            || (other is not null
                && string.Equals(Node, other.Node, StringComparison.Ordinal)
                && string.Equals(Pin, other.Pin, StringComparison.Ordinal));

    /// <inheritdoc />
    public override bool Equals(object? obj)
        => obj is UINodeParameter other && Equals(other);

    /// <inheritdoc />
    public override int GetHashCode()
        => HashCode.Combine(Node, Pin);
}

/// <summary>
/// One node on the canvas: which kind it is, where it stands, and what its inputs were set to.
/// </summary>
[method: JsonConstructor]
public sealed class UINode(string id, string type, double x = 0, double y = 0, string? title = null, string? color = null, bool pinned = false, bool collapsed = false, IReadOnlyDictionary<string, object?>? values = null, double? width = null, double? height = null, bool enabled = true) : IEquatable<UINode>
{
    internal const int MaxValueElements = 1024;
    internal const int MaxValueDepth = 16;

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
    public IReadOnlyDictionary<string, object?> Values { get; } = NormalizeValues(values);

    /// <summary>
    /// Gets how wide the viewer dragged the node, in canvas units; unset, the kind's own least width.
    /// </summary>
    public double? Width { get; } = width;

    /// <summary>
    /// Gets how tall the viewer dragged the node, in canvas units; unset, as tall as its contents make it.
    /// </summary>
    public double? Height { get; } = height;

    /// <summary>
    /// Gets whether the node takes part in a run; turned off from its menu, a run passes it over, and an input it feeds takes its
    /// own value, as though unwired. Saved, so a reloaded sheet keeps it off.
    /// </summary>
    public bool Enabled { get; } = enabled;

    private static IReadOnlyDictionary<string, object?> NormalizeValues(IReadOnlyDictionary<string, object?>? values)
    {
        if (values is null)
            return new Dictionary<string, object?>(StringComparer.Ordinal);

        var hasJsonElement = false;

        foreach (KeyValuePair<string, object?> entry in values)
        {
            if (entry.Value is JsonElement)
            {
                hasJsonElement = true;
                break;
            }
        }

        if (!hasJsonElement && RecursiveValueCoercion.IsWithinLimits(values, MaxValueElements, MaxValueDepth + 1))
            return values;

        var budget = MaxValueElements;
        Dictionary<string, object?> normalized = new(Math.Min(values.Count, MaxValueElements), StringComparer.Ordinal);

        foreach (KeyValuePair<string, object?> entry in values)
        {
            if (--budget < 0)
            {
                if (normalized.Count < MaxValueElements * 2)
                    normalized[entry.Key] = RecursiveValuePastLimits.Instance;

                continue;
            }

            normalized[entry.Key] = entry.Value is JsonElement element
                ? ObjectToInferredTypesConverter.ToInferredValue(element, ref budget, MaxValueDepth)
                : RecursiveValueCoercion.IsWithinBudget(entry.Value, ref budget, MaxValueDepth)
                    ? entry.Value
                    : RecursiveValuePastLimits.Instance;
        }

        return normalized;
    }

    /// <inheritdoc />
    public bool Equals(UINode? other)
        => ReferenceEquals(this, other)
            || (other is not null
                && string.Equals(Id, other.Id, StringComparison.Ordinal)
                && string.Equals(Type, other.Type, StringComparison.Ordinal)
                && X.Equals(other.X)
                && Y.Equals(other.Y)
                && string.Equals(Title, other.Title, StringComparison.Ordinal)
                && string.Equals(Color, other.Color, StringComparison.Ordinal)
                && Pinned == other.Pinned
                && Collapsed == other.Collapsed
                && Nullable.Equals(Width, other.Width)
                && Nullable.Equals(Height, other.Height)
                && Enabled == other.Enabled
                && AreValueMapsEqual(Values, other.Values, 0));

    private static bool AreValueMapsEqual(IReadOnlyDictionary<string, object?> left, IReadOnlyDictionary<string, object?> right, int depth)
    {
        if (ReferenceEquals(left, right))
            return true;

        if (left.Count != right.Count || depth > MaxValueDepth)
            return false;

        foreach (KeyValuePair<string, object?> entry in left)
        {
            if (!right.TryGetValue(entry.Key, out var otherValue) || !ArePinValuesEqual(entry.Value, otherValue, depth + 1))
                return false;
        }

        return true;
    }

    private static bool ArePinValuesEqual(object? left, object? right, int depth)
    {
        if (ReferenceEquals(left, right))
            return true;

        if (left is null || right is null || depth > MaxValueDepth + 1)
            return false;

        if (left is string leftText && right is string rightText)
            return string.Equals(leftText, rightText, StringComparison.Ordinal);

        if (left is bool leftFlag && right is bool rightFlag)
            return leftFlag == rightFlag;

        if (TryCompareNumbers(left, right, out var numbersEqual))
            return numbersEqual;

        if (left is IReadOnlyDictionary<string, object?> leftMap && right is IReadOnlyDictionary<string, object?> rightMap)
            return AreValueMapsEqual(leftMap, rightMap, depth);

        if (left is IList leftList && right is IList rightList)
            return AreValueListsEqual(leftList, rightList, depth);

        return left.Equals(right);
    }

    private static bool TryCompareNumbers(object left, object right, out bool equal)
    {
        if (TryReadDecimal(left, out var leftDecimal))
        {
            if (TryReadDecimal(right, out var rightDecimal))
            {
                equal = leftDecimal == rightDecimal;
                return true;
            }

            if (TryReadDouble(right, out var rightDouble))
            {
                equal = AreDecimalAndDoubleEqual(leftDecimal, rightDouble);
                return true;
            }

            equal = false;
            return true;
        }

        if (TryReadDouble(left, out var leftDouble))
        {
            if (TryReadDouble(right, out var rightDouble))
            {
                equal = leftDouble.Equals(rightDouble);
                return true;
            }

            if (TryReadDecimal(right, out var rightDecimal))
            {
                equal = AreDecimalAndDoubleEqual(rightDecimal, leftDouble);
                return true;
            }

            equal = false;
            return true;
        }

        equal = false;
        return false;
    }

    private static bool TryReadDecimal(object value, out decimal number)
    {
        switch (value)
        {
            case sbyte v:
                number = v;
                return true;
            case byte v:
                number = v;
                return true;
            case short v:
                number = v;
                return true;
            case ushort v:
                number = v;
                return true;
            case int v:
                number = v;
                return true;
            case uint v:
                number = v;
                return true;
            case long v:
                number = v;
                return true;
            case ulong v:
                number = v;
                return true;
            case decimal v:
                number = v;
                return true;
            default:
                number = default;
                return false;
        }
    }

    private static bool TryReadDouble(object value, out double number)
    {
        switch (value)
        {
            case float v:
                number = v;
                return true;
            case double v:
                number = v;
                return true;
            default:
                number = default;
                return false;
        }
    }

    private static bool AreDecimalAndDoubleEqual(decimal exact, double floating)
    {
        if (!double.IsFinite(floating))
            return false;

        try
        {
            return (decimal)floating == exact && (double)exact == floating;
        }
        catch (OverflowException)
        {
            return false;
        }
    }

    private static bool AreValueListsEqual(IList left, IList right, int depth)
    {
        if (left.Count != right.Count)
            return false;

        for (var i = 0; i < left.Count; i++)
        {
            if (!ArePinValuesEqual(left[i], right[i], depth + 1))
                return false;
        }

        return true;
    }

    /// <inheritdoc />
    public override bool Equals(object? obj)
        => obj is UINode other && Equals(other);

    /// <inheritdoc />
    public override int GetHashCode()
        => HashCode.Combine(Id, Type, X, Y, Pinned, Collapsed, Enabled, Values.Count);
}

/// <summary>
/// One connection: an output pin of one node feeding an input pin of another, through the points the viewer dragged.
/// </summary>
[method: JsonConstructor]
public sealed class UINodeEdge(string id, string fromNode, string fromPin, string toNode, string toPin, UIGraphPoint[]? points = null) : IEquatable<UINodeEdge>
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

    /// <inheritdoc />
    public bool Equals(UINodeEdge? other)
        => ReferenceEquals(this, other)
            || (other is not null
                && string.Equals(Id, other.Id, StringComparison.Ordinal)
                && string.Equals(FromNode, other.FromNode, StringComparison.Ordinal)
                && string.Equals(FromPin, other.FromPin, StringComparison.Ordinal)
                && string.Equals(ToNode, other.ToNode, StringComparison.Ordinal)
                && string.Equals(ToPin, other.ToPin, StringComparison.Ordinal)
                && UIGraphDraftSupport.Same(Points, other.Points));

    /// <inheritdoc />
    public override bool Equals(object? obj)
        => obj is UINodeEdge other && Equals(other);

    /// <inheritdoc />
    public override int GetHashCode()
        => HashCode.Combine(Id, FromNode, FromPin, ToNode, ToPin, Points.Length);
}
