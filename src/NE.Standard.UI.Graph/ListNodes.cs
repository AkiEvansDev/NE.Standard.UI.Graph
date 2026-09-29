using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using NE.Standard.UI.Primitives.Constants;

namespace NE.Standard.UI.Graph;

/// <summary>One item of a list, by its place: 0 the first, and below zero counted from the end, -1 the last.</summary>
/// <remarks>A place past either end finds nothing, which <see cref="Found"/> says, rather than failing the run.</remarks>
[GraphNode(Key = NodeKey, Category = UINodeKinds.ListsCategory, Title = "Item at", Description = "One item of a list, by its place.", Icon = UIGlyphs.ListNumbered, Color = UINodeKinds.AnyColor)]
public sealed class ItemAtNode : IGraphNode
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "graph.item-at";

    /// <summary>Gets or sets the list to take from.</summary>
    [GraphInput(Title = "List", PinOnly = true)]
    public object?[] List { get; set; } = [];

    /// <summary>Gets or sets the item's place: 0 the first, -1 the last.</summary>
    [GraphInput(Title = "Index", Description = "0 for the first; below zero counts from the end, -1 for the last.")]
    public int Index { get; set; }

    /// <summary>Gets or sets the item at that place; nothing when there is none.</summary>
    [GraphOutput(Title = "Item")]
    public object? Item { get; set; }

    /// <summary>Gets or sets whether the list has an item at that place.</summary>
    [GraphOutput(Title = "Found")]
    public bool Found { get; set; }

    /// <inheritdoc/>
    public void Execute(UINodeRunContext context)
    {
        // Widened first: -1 from an empty list, or int.MinValue from any, must land outside it rather than wrap back in.
        var place = Index < 0 ? (long)List.Length + Index : Index;

        Found = place >= 0 && place < List.Length;
        Item = Found ? List[place] : null;
    }
}

/// <summary>
/// How many items a list holds.
/// </summary>
[GraphNode(Key = NodeKey, Category = UINodeKinds.ListsCategory, Title = "Count", Description = "How many items a list holds.", Icon = UIGlyphs.Numbers, Color = UINodeKinds.AnyColor)]
public sealed class ListCountNode : IGraphNode
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "graph.list-count";

    /// <summary>Gets or sets the list to count.</summary>
    [GraphInput(Title = "List", PinOnly = true)]
    public object?[] List { get; set; } = [];

    /// <summary>Gets or sets how many items it holds.</summary>
    [GraphOutput(Title = "Count")]
    public int Count { get; set; }

    /// <inheritdoc/>
    public void Execute(UINodeRunContext context)
        => Count = List.Length;
}

/// <summary>The items of a list, one a run, in order.</summary>
/// <remarks>
/// Where it stands in the list is kept in the document and shown on the node, and its reset puts it back to the first; after the
/// last it starts over, or it ends a run of all. Its <see cref="Wrapped"/> wired into a counter's or another list's
/// <see cref="Advance"/> makes a loop inside a loop, as counters do.
/// </remarks>
[GraphNode(Key = NodeKey, Category = UINodeKinds.ListsCategory, Title = "For each", Description = "Hands out a list's items, one a run.", Icon = UIGlyphs.Repeat, Color = UINodeKinds.AnyColor)]
public sealed class ForEachNode : IGraphNode, IGraphNodeSequence
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "graph.for-each";

    /// <summary>Gets or sets the list to go through.</summary>
    [GraphInput(Title = "List", PinOnly = true)]
    public object?[] List { get; set; } = [];

    /// <summary>Gets or sets whether the list starts over after its last item rather than stopping there.</summary>
    [GraphInput(Title = "Start over", NoPin = true, Description = "After the last item, start again from the first rather than stopping.")]
    public bool Wrap { get; set; }

    /// <summary>Gets or sets whether this run moves on to the next item; wired from a counter's <c>Wrapped</c>, it moves once a round of that one.</summary>
    [GraphInput(Title = "Advance", Description = "Whether this run moves on to the next item; from a counter's Wrapped, once a round of that one.")]
    public bool Advance { get; set; } = true;

    /// <summary>Gets or sets where the next item stands in the list, 0 for the first: how many the runs have handed out since it last started over.</summary>
    [GraphInput(Title = "Taken", State = true, Min = 0, Description = "Where the next item stands, 0 for the first; the reset starts over.")]
    public int Taken { get; set; }

    /// <summary>Gets or sets the item this run handed out.</summary>
    [GraphOutput(Title = "Item")]
    public object? Item { get; set; }

    /// <summary>Gets or sets its place in the list, 0 for the first.</summary>
    [GraphOutput(Title = "Index")]
    public int Index { get; set; }

    /// <summary>Gets or sets whether this run handed out the last item, the list starting over or ending after it.</summary>
    [GraphOutput(Title = "Wrapped")]
    public bool Wrapped { get; set; }

    /// <inheritdoc/>
    public bool HasMore { get; private set; }

    /// <inheritdoc/>
    public void Execute(UINodeRunContext context)
    {
        var count = List.Length;

        if (count == 0)
            throw new InvalidOperationException("The list is empty: there is no item to hand out.");

        var place = Taken;

        if (place < 0 || place >= count)
        {
            if (!Wrap)
                throw new InvalidOperationException($"Every one of the {count} items is taken: reset the node to start over.");

            place = 0;
        }

        Item = List[place];
        Index = place;
        Wrapped = false;

        if (Advance)
        {
            place++;

            if (place == count)
            {
                Wrapped = true;

                if (Wrap)
                    place = 0;
            }
        }

        Taken = place;
        HasMore = Wrap || place < count;
    }
}

/// <summary>A list put in order, least first unless asked otherwise.</summary>
/// <remarks>
/// Numbers by their value, whole or not; texts character by character, as every text kind compares them, a capital and a small
/// letter as one if asked; dates by the clock they read. Items of different kinds stand apart, in that order — yes-or-noes before
/// numbers, numbers before dates, dates before texts — and items that come out the same keep the order they had.
/// </remarks>
[GraphNode(Key = NodeKey, Category = UINodeKinds.ListsCategory, Title = "Sort", Description = "Puts a list's items in order.", Icon = UIGlyphs.Sorted, Color = UINodeKinds.AnyColor)]
public sealed class SortNode : IGraphNode
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "graph.sort";

    /// <summary>Gets or sets the list to put in order.</summary>
    [GraphInput(Title = "List", PinOnly = true)]
    public object?[] List { get; set; } = [];

    /// <summary>Gets or sets whether the greatest item comes first.</summary>
    [GraphInput(Title = "Descending", NoPin = true)]
    public bool Descending { get; set; }

    /// <summary>Gets or sets whether a capital and a small letter count as one.</summary>
    [GraphInput(Title = "Ignore case", NoPin = true)]
    public bool IgnoreCase { get; set; }

    /// <summary>Gets or sets the list in order.</summary>
    [GraphOutput(Title = "Result", TypeOf = nameof(List))]
    public object?[] Result { get; set; } = [];

    /// <inheritdoc/>
    public void Execute(UINodeRunContext context)
    {
        NodeValueOrder order = NodeValueOrder.Of(IgnoreCase);

        // LINQ's order is stable, where Array.Sort's is not: items that come out the same keep their places.
        Result = Descending ? [.. List.OrderByDescending(static item => item, order)] : [.. List.OrderBy(static item => item, order)];
    }
}

/// <summary>
/// A list the other way round, its last item first.
/// </summary>
[GraphNode(Key = NodeKey, Category = UINodeKinds.ListsCategory, Title = "Reverse", Description = "Turns a list the other way round.", Icon = UIGlyphs.Sort, Color = UINodeKinds.AnyColor)]
public sealed class ReverseNode : IGraphNode
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "graph.reverse";

    /// <summary>Gets or sets the list to turn.</summary>
    [GraphInput(Title = "List", PinOnly = true)]
    public object?[] List { get; set; } = [];

    /// <summary>Gets or sets the list the other way round.</summary>
    [GraphOutput(Title = "Result", TypeOf = nameof(List))]
    public object?[] Result { get; set; } = [];

    /// <inheritdoc/>
    public void Execute(UINodeRunContext context)
    {
        var turned = new object?[List.Length];

        for (var i = 0; i < List.Length; i++)
            turned[i] = List[List.Length - 1 - i];

        Result = turned;
    }
}

/// <summary>
/// A list with every item that repeats one before it left out, by the rule <see cref="EqualsNode"/> holds two values the same by;
/// the first of each stays where it stood.
/// </summary>
[GraphNode(Key = NodeKey, Category = UINodeKinds.ListsCategory, Title = "Distinct", Description = "Leaves out the items that repeat one before them.", Icon = UIGlyphs.Fingerprint, Color = UINodeKinds.AnyColor)]
public sealed class DistinctNode : IGraphNode
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "graph.distinct";

    /// <summary>Gets or sets the list to thin out.</summary>
    [GraphInput(Title = "List", PinOnly = true)]
    public object?[] List { get; set; } = [];

    /// <summary>Gets or sets whether a capital and a small letter count as one.</summary>
    [GraphInput(Title = "Ignore case", NoPin = true)]
    public bool IgnoreCase { get; set; }

    /// <summary>Gets or sets the list with each item once.</summary>
    [GraphOutput(Title = "Result", TypeOf = nameof(List))]
    public object?[] Result { get; set; } = [];

    /// <inheritdoc/>
    public void Execute(UINodeRunContext context)
    {
        HashSet<object?> seen = new(NodeValueEquality.Of(IgnoreCase));
        List<object?> kept = [];

        foreach (var item in List)
        {
            if (seen.Add(item))
                kept.Add(item);
        }

        Result = [.. kept];
    }
}

/// <summary>
/// The one order the node kinds put values in: a yes-or-no, then a number, a date, a text and anything else, each kind in its own
/// order, nothing before them all.
/// </summary>
internal sealed class NodeValueOrder : IComparer<object?>
{
    // The kinds of value in the order they stand in.
    private const int Nothing = 0;
    private const int Boolean = 1;
    private const int Number = 2;
    private const int Date = 3;
    private const int Text = 4;
    private const int Other = 5;

    private static readonly NodeValueOrder Exact = new(StringComparer.Ordinal);
    private static readonly NodeValueOrder AnyCase = new(StringComparer.OrdinalIgnoreCase);

    private readonly StringComparer _texts;

    private NodeValueOrder(StringComparer texts)
    {
        _texts = texts;
    }

    public static NodeValueOrder Of(bool ignoreCase)
        => ignoreCase ? AnyCase : Exact;

    public int Compare(object? x, object? y)
    {
        (var leftRank, var leftNumber, DateTime leftDate) = Read(x);
        (var rightRank, var rightNumber, DateTime rightDate) = Read(y);

        if (leftRank != rightRank)
            return leftRank.CompareTo(rightRank);

        return leftRank switch
        {
            Nothing => 0,
            Boolean or Number => leftNumber.CompareTo(rightNumber),
            Date => leftDate.CompareTo(rightDate),
            Text => _texts.Compare((string)x!, (string)y!),
            _ => string.CompareOrdinal(Convert.ToString(x, CultureInfo.InvariantCulture), Convert.ToString(y, CultureInfo.InvariantCulture))
        };
    }

    /// <summary>Which kind a value is, and its number or clock reading where it has one.</summary>
    private static (int Rank, double Number, DateTime Date) Read(object? value)
    {
        if (value is null)
            return (Nothing, 0, default);

        if (value is bool flag)
            return (Boolean, flag ? 1 : 0, default);

        if (NodeValueEquality.TryNumber(value, out var number))
            return (Number, number, default);

        if (NodeDates.TryRead(value, out DateTime date))
            return (Date, 0, date);

        return value is string ? (Text, 0, default) : (Other, 0, default);
    }
}
