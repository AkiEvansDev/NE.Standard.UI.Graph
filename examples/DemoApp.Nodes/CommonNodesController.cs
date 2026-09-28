namespace DemoApp.Nodes;

/// <summary>
/// The common kinds' page, which every catalogue carries: texts made and cut, a counter and a range walked by Run all, a number
/// drawn at random, and a note.
/// </summary>
internal sealed partial class CommonNodesController() : NodesSheetController(Kinds, _ => StartingSheet(), "Run works the sheet out once; Run all walks the counter and the range to their ends. A counter's Next and a range's Taken start over by their reset.")
{
    /// <summary>The common kinds alone: what the picker offers here.</summary>
    public static UINodeCatalog Kinds { get; } = UINodeCatalog.FromTypes([.. UINodeKinds.Common]);

    /// <summary>
    /// A text and a number set into a template, a list of words split apart, a counter and a range each shown as it goes, and a
    /// random number; a note says what Run all is for.
    /// </summary>
    private static UINodeDocument StartingSheet()
    {
        UINode label = new("t-label", TextNode.NodeKey, 40, 40, values: Values(("Value", "Answer")));
        UINode number = new("t-number", NumberNode.NodeKey, 40, 280, values: Values(("Value", 42)));
        UINode join = new("t-join", JoinNode.NodeKey, 340, 120, values: Values(("Template", "{0} = {1}")));
        UINode joined = new("t-joined", DisplayNode.NodeKey, 640, 120);

        UINode words = new("t-words", TextNode.NodeKey, 40, 480, values: Values(("Value", "red, green, blue")));
        UINode split = new("t-split", SplitNode.NodeKey, 340, 480);
        UINode parts = new("t-parts", DisplayNode.NodeKey, 640, 480);

        UINode counter = new("c-counter", CounterNode.NodeKey, 960, 40, values: Values(("From", 1), ("To", 5)));
        UINode counted = new("c-counted", DisplayNode.NodeKey, 1260, 40);
        UINode range = new("c-range", RangeXYNode.NodeKey, 960, 440, values: Values(("ToX", 2), ("ToY", 1)));
        UINode point = new("c-point", JoinNode.NodeKey, 1260, 440, values: Values(("Template", "({0}, {1})")));
        UINode shown = new("c-shown", DisplayNode.NodeKey, 1560, 440);

        UINode random = new("r-random", RandomNode.NodeKey, 40, 760, values: Values(("To", 100), ("Whole", true)));
        UINode drawn = new("r-drawn", DisplayNode.NodeKey, 340, 760);
        UINode note = new("r-note", NoteNode.NodeKey, 960, 840, values: Values(("Text", "Run all goes round until the counter and the range run out: five runs of one, six points of the other — the shorter ends it.")));

        return new UINodeDocument(
            [label, number, join, joined, words, split, parts, counter, counted, range, point, shown, random, drawn, note],
            [
                // Two values into the one pin that takes several, in the order they were wired: {0} is the text, {1} the number.
                new UINodeEdge("e-1", label.Id, nameof(TextNode.Result), join.Id, nameof(JoinNode.Values)),
                new UINodeEdge("e-2", number.Id, nameof(NumberNode.Result), join.Id, nameof(JoinNode.Values)),
                new UINodeEdge("e-3", join.Id, nameof(JoinNode.Text), joined.Id, nameof(DisplayNode.Value)),
                new UINodeEdge("e-4", words.Id, nameof(TextNode.Result), split.Id, nameof(SplitNode.Text)),
                new UINodeEdge("e-5", split.Id, nameof(SplitNode.Parts), parts.Id, nameof(DisplayNode.Value)),
                new UINodeEdge("e-6", counter.Id, nameof(CounterNode.Value), counted.Id, nameof(DisplayNode.Value)),
                new UINodeEdge("e-7", range.Id, nameof(RangeXYNode.X), point.Id, nameof(JoinNode.Values)),
                new UINodeEdge("e-8", range.Id, nameof(RangeXYNode.Y), point.Id, nameof(JoinNode.Values)),
                new UINodeEdge("e-9", point.Id, nameof(JoinNode.Text), shown.Id, nameof(DisplayNode.Value)),
                new UINodeEdge("e-10", random.Id, nameof(RandomNode.Value), drawn.Id, nameof(DisplayNode.Value))
            ]);
    }
}
