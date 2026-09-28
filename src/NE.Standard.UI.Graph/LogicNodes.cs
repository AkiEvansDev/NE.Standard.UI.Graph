using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using NE.Standard.UI.Primitives.Constants;

namespace NE.Standard.UI.Graph;

/// <summary>
/// One of two values, picked by a yes or no: <c>Yes</c> when it is on, <c>No</c> when it is off. Both come from the run — the sheet
/// runs the branch not taken too.
/// </summary>
[GraphNode(Key = NodeKey, Category = UINodeKinds.LogicCategory, Title = "Choose", Description = "Hands on one of two values, by a yes or no.", Icon = UIGlyphs.Route, Color = UINodeKinds.AnyColor)]
public sealed class ChooseNode : IGraphNode
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "graph.choose";

    /// <summary>Gets or sets which of the two is handed on: on, <see cref="Yes"/>.</summary>
    [GraphInput(Title = "When")]
    public bool When { get; set; }

    /// <summary>Gets or sets the value handed on when it is on.</summary>
    [GraphInput(Title = "Yes", PinOnly = true)]
    public object? Yes { get; set; }

    /// <summary>Gets or sets the value handed on when it is off.</summary>
    [GraphInput(Title = "No", PinOnly = true)]
    public object? No { get; set; }

    /// <summary>Gets or sets the value picked.</summary>
    [GraphOutput(Title = "Result", TypeOf = nameof(Yes))]
    public object? Result { get; set; }

    /// <inheritdoc/>
    public void Execute(UINodeRunContext context)
        => Result = When ? Yes : No;
}

/// <summary>
/// Whether every yes or no wired in is on; with none wired in, yes, as nothing stands against it.
/// </summary>
[GraphNode(Key = NodeKey, Category = UINodeKinds.LogicCategory, Title = "And", Description = "Yes when every yes or no wired in is on.", Icon = UIGlyphs.JoinInner, Color = UINodeKinds.LogicColor)]
public sealed class AndNode : IGraphNode
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "graph.and";

    /// <summary>Gets or sets the yeses and noes to weigh.</summary>
    [GraphInput(Title = "Values", Multiple = true, Description = "Every yes or no wired in; none at all counts as yes.")]
    public bool[] Values { get; set; } = [];

    /// <summary>Gets or sets whether every one is on.</summary>
    [GraphOutput(Title = "Result")]
    public bool Result { get; set; }

    /// <inheritdoc/>
    public void Execute(UINodeRunContext context)
        => Result = Array.TrueForAll(Values, static value => value);
}

/// <summary>
/// Whether any yes or no wired in is on; with none wired in, no, as nothing is on.
/// </summary>
[GraphNode(Key = NodeKey, Category = UINodeKinds.LogicCategory, Title = "Or", Description = "Yes when any yes or no wired in is on.", Icon = UIGlyphs.JoinFull, Color = UINodeKinds.LogicColor)]
public sealed class OrNode : IGraphNode
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "graph.or";

    /// <summary>Gets or sets the yeses and noes to weigh.</summary>
    [GraphInput(Title = "Values", Multiple = true, Description = "Every yes or no wired in; none at all counts as no.")]
    public bool[] Values { get; set; } = [];

    /// <summary>Gets or sets whether any one is on.</summary>
    [GraphOutput(Title = "Result")]
    public bool Result { get; set; }

    /// <inheritdoc/>
    public void Execute(UINodeRunContext context)
        => Result = Array.Exists(Values, static value => value);
}

/// <summary>
/// A yes or no turned the other way.
/// </summary>
[GraphNode(Key = NodeKey, Category = UINodeKinds.LogicCategory, Title = "Not", Description = "Turns a yes into a no and a no into a yes.", Icon = UIGlyphs.Block, Color = UINodeKinds.LogicColor)]
public sealed class NotNode : IGraphNode
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "graph.not";

    /// <summary>Gets or sets the yes or no to turn.</summary>
    [GraphInput(Title = "Value")]
    public bool Value { get; set; }

    /// <summary>Gets or sets the other way.</summary>
    [GraphOutput(Title = "Result")]
    public bool Result { get; set; }

    /// <inheritdoc/>
    public void Execute(UINodeRunContext context)
        => Result = !Value;
}

/// <summary>
/// Whether two values of any type are the same: numbers as numbers, whole or not (2 is 2.0); texts character by character, a capital
/// and a small letter as one if asked; dates by the clock they read, a day at its midnight; lists item by item. Values of different
/// kinds — a number and a text that reads as it — are not the same.
/// </summary>
[GraphNode(Key = NodeKey, Category = UINodeKinds.LogicCategory, Title = "Equals", Description = "Whether two values of any type are the same.", Icon = UIGlyphs.Equal, Color = UINodeKinds.LogicColor)]
public sealed class EqualsNode : IGraphNode
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "graph.equals";

    /// <summary>Gets or sets the first value.</summary>
    [GraphInput(Title = "Left", PinOnly = true)]
    public object? Left { get; set; }

    /// <summary>Gets or sets the second value.</summary>
    [GraphInput(Title = "Right", PinOnly = true)]
    public object? Right { get; set; }

    /// <summary>Gets or sets whether a capital and a small letter count as one.</summary>
    [GraphInput(Title = "Ignore case", NoPin = true)]
    public bool IgnoreCase { get; set; }

    /// <summary>Gets or sets whether the two are the same.</summary>
    [GraphOutput(Title = "Result")]
    public bool Result { get; set; }

    /// <inheritdoc/>
    public void Execute(UINodeRunContext context)
        => Result = NodeValueEquality.Of(IgnoreCase).Equals(Left, Right);
}

/// <summary>
/// The one rule the node kinds hold two values the same by — <see cref="EqualsNode"/>'s, and <c>Distinct</c>'s through its hash.
/// </summary>
internal sealed class NodeValueEquality : IEqualityComparer<object?>
{
    private static readonly NodeValueEquality Exact = new(StringComparer.Ordinal);
    private static readonly NodeValueEquality AnyCase = new(StringComparer.OrdinalIgnoreCase);

    // Ordinal, as every text kind compares: a sheet must answer the same on a server of any culture.
    private readonly StringComparer _texts;

    private NodeValueEquality(StringComparer texts)
    {
        _texts = texts;
    }

    public static NodeValueEquality Of(bool ignoreCase)
        => ignoreCase ? AnyCase : Exact;

    public new bool Equals(object? x, object? y)
    {
        if (x is null || y is null)
            return x is null && y is null;

        if (TryNumber(x, out var left) && TryNumber(y, out var right))
            return left.Equals(right);

        if (x is string leftText && y is string rightText)
            return _texts.Equals(leftText, rightText);

        if (NodeDates.TryRead(x, out DateTime leftDate) && NodeDates.TryRead(y, out DateTime rightDate))
            return leftDate == rightDate;

        if (x is IEnumerable leftItems and not string && y is IEnumerable rightItems and not string)
            return SequenceEquals(leftItems, rightItems);

        return x.Equals(y);
    }

    /// <summary>Whether a value is one of the numbers, and its value as a double — 2 and 2.0 alike.</summary>
    public static bool TryNumber(object value, out double number)
    {
        if (UINodePinTypes.IsNumber(value.GetType()))
        {
            number = Convert.ToDouble(value, CultureInfo.InvariantCulture);
            return true;
        }

        number = 0;
        return false;
    }

    /// <summary>Whether two lists hold the same items in the same order, by this rule.</summary>
    private bool SequenceEquals(IEnumerable left, IEnumerable right)
    {
        IEnumerator rightItems = right.GetEnumerator();

        try
        {
            foreach (var item in left)
            {
                if (!rightItems.MoveNext() || !Equals(item, rightItems.Current))
                    return false;
            }

            return !rightItems.MoveNext();
        }
        finally
        {
            (rightItems as IDisposable)?.Dispose();
        }
    }

    public int GetHashCode(object? obj)
    {
        if (obj is null)
            return 0;

        if (obj is string text)
            return _texts.GetHashCode(text);

        if (obj is IEnumerable items)
        {
            HashCode hash = default;

            foreach (var item in items)
                hash.Add(GetHashCode(item));

            return hash.ToHashCode();
        }

        if (TryNumber(obj, out var number))
            return number.GetHashCode();

        return NodeDates.TryRead(obj, out DateTime date) ? date.GetHashCode() : obj.GetHashCode();
    }
}
