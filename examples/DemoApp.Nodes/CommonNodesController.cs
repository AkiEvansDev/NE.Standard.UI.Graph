namespace DemoApp.Nodes;

/// <summary>
/// The common kinds' page, which every catalogue carries: a text and a number joined and shown, a counter walked by Run all, and a
/// note.
/// </summary>
internal sealed partial class CommonNodesController() : NodesSheetController(CanvasId, Kinds, _ => StartingSheet(), new UIPhrase("nodes.status.common"))
{
    public const string CanvasId = "common-sheet";

    /// <summary>The common kinds alone: what the picker offers here.</summary>
    public static UINodeCatalog Kinds { get; } = UINodeCatalog.FromTypes([.. UINodeKinds.Common]);

    /// <summary>
    /// A text and a number set into a template and shown, and a counter shown as it goes; a note says what Run all is for. Placed
    /// where the canvas's Arrange puts them.
    /// </summary>
    private static UINodeDocument StartingSheet()
    {
        UINode label = new("t-label", TextNode.NodeKey, 0, 0, values: Values(("Value", "Answer")));
        UINode number = new("t-number", NumberNode.NodeKey, 0, 260, values: Values(("Value", 42)));
        UINode join = new("t-join", JoinNode.NodeKey, 320, 0, values: Values(("Template", "{0} = {1}")));
        UINode joined = new("t-joined", DisplayNode.NodeKey, 660, 0);

        UINode counter = new("c-counter", CounterNode.NodeKey, 0, 380, values: Values(("From", 1), ("To", 5)));
        UINode counted = new("c-counted", DisplayNode.NodeKey, 320, 380);

        UINode note = new("n-note", NoteNode.NodeKey, 0, 680, values: Values(("Text", "Run works the sheet out once. Run all goes round until the counter runs out: five runs, one number each.")));

        return new UINodeDocument(
            [label, number, join, joined, counter, counted, note],
            [
                // Two values into the one pin that takes several, in the order they were wired: {0} is the text, {1} the number.
                new UINodeEdge("e-1", label.Id, nameof(TextNode.Result), join.Id, nameof(JoinNode.Values)),
                new UINodeEdge("e-2", number.Id, nameof(NumberNode.Result), join.Id, nameof(JoinNode.Values)),
                new UINodeEdge("e-3", join.Id, nameof(JoinNode.Text), joined.Id, nameof(DisplayNode.Value)),
                new UINodeEdge("e-4", counter.Id, nameof(CounterNode.Value), counted.Id, nameof(DisplayNode.Value))
            ])
            // Two inputs set out in the parameters panel from the start: edited there as well as on their nodes.
            .WithParameters(new UINodeParameter(number.Id, nameof(NumberNode.Value)), new UINodeParameter(counter.Id, nameof(CounterNode.To)));
    }
}
