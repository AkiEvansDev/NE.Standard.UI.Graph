using System;
using System.Collections.Generic;

namespace NE.Standard.UI.Graph;

/// <summary>
/// The node kinds the package offers every application: a value of each standard type filled in on the node, a text made of any
/// value and the kinds that join, split, replace, measure, search, recase, trim, slice, read as a number and match texts, the
/// logic that picks, weighs, turns and compares values, the lists taken from, counted, walked one item a run, sorted, turned and
/// thinned out, the dates moved, measured and taken apart, a view of whatever arrives, a note, a delay, a counter and the ranges that
/// nest counters in one node, a random number, and the reroute every catalogue carries by itself; and apart from them, the file
/// kinds, which reach the server's disk.
/// </summary>
public static class UINodeKinds
{
    /// <summary>Where the value kinds stand in the picker.</summary>
    public const string ValuesCategory = "Values";

    /// <summary>Where the kinds that make, cut and look through texts stand.</summary>
    public const string TextCategory = "Text";

    /// <summary>Where the kinds that pick, weigh and compare values stand.</summary>
    public const string LogicCategory = "Logic";

    /// <summary>Where the kinds that take from, walk and reorder lists stand.</summary>
    public const string ListsCategory = "Lists";

    /// <summary>Where the kinds that move, measure and take apart dates stand.</summary>
    public const string DatesCategory = "Dates";

    /// <summary>Where the kinds that shape the sheet rather than compute stand.</summary>
    public const string UtilitiesCategory = "Utilities";

    /// <summary>Where the file kinds stand.</summary>
    public const string FilesCategory = "Files";

    /// <summary>The colour a kind wears that works on whatever reaches it, as the universal pin does.</summary>
    public const string AnyColor = "var(--ui-text-muted)";

    /// <summary>The colour the text kinds wear: the text value's own, so a text's kinds read as one family.</summary>
    public const string TextColor = "var(--ui-color-series-5)";

    /// <summary>The colour the kinds that answer yes or no wear: the yes-or-no value's own.</summary>
    public const string LogicColor = "var(--ui-color-series-4)";

    /// <summary>The colour the date kinds wear: the date value's own.</summary>
    public const string DateColor = "var(--ui-color-series-8)";

    /// <summary>Gets every common kind but the reroute, for a catalogue: <c>UINodeCatalog.FromTypes([.. UINodeKinds.Common, typeof(MyNode)])</c>.</summary>
    public static IReadOnlyList<Type> Common { get; } =
    [
        typeof(NumberNode),
        typeof(TextNode),
        typeof(DateNode),
        typeof(YesNoNode),
        typeof(ImageNode),
        typeof(ToTextNode),
        typeof(JoinNode),
        typeof(SplitNode),
        typeof(ReplaceNode),
        typeof(TextLengthNode),
        typeof(ContainsNode),
        typeof(ChangeCaseNode),
        typeof(TrimNode),
        typeof(SliceNode),
        typeof(ToNumberNode),
        typeof(MatchNode),
        typeof(ChooseNode),
        typeof(AndNode),
        typeof(OrNode),
        typeof(NotNode),
        typeof(EqualsNode),
        typeof(ItemAtNode),
        typeof(ListCountNode),
        typeof(ForEachNode),
        typeof(SortNode),
        typeof(ReverseNode),
        typeof(DistinctNode),
        typeof(AddToDateNode),
        typeof(DateDifferenceNode),
        typeof(DatePartsNode),
        typeof(DisplayNode),
        typeof(NoteNode),
        typeof(DelayNode),
        typeof(CounterNode),
        typeof(RangeXYNode),
        typeof(RangeXYZNode),
        typeof(RandomNode)
    ];

    /// <summary>
    /// Gets the file kinds — the files of a folder one a run, a text read, a text written — for a catalogue that means to reach
    /// the server's disk; they are not among <see cref="Common"/>, so an application takes them on purpose, and they reach nothing
    /// until it opens the disk to them (<c>services.AddGraphFiles(...)</c>).
    /// </summary>
    public static IReadOnlyList<Type> Files { get; } =
    [
        typeof(FilesInFolderNode),
        typeof(ReadTextNode),
        typeof(WriteTextNode)
    ];
}
