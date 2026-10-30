using System;
using System.Collections.Generic;

namespace DemoApp.Nodes;

/// <summary>
/// The calculator package's page: two numbers into an operation, rounded and written out, and their sum beside it.
/// </summary>
internal sealed partial class CalculatorNodesController() : NodesSheetController(CanvasId, Kinds, _ => StartingSheet(), new UIPhrase("nodes.status.calculator"))
{
    public const string CanvasId = "calculator-sheet";

    /// <summary>The common kinds and the calculator's: what the picker offers here and a saved sheet is read back through.</summary>
    public static UINodeCatalog Kinds { get; } = UINodeCatalog.FromTypes([.. UINodeKinds.Common, .. CalculatorNodes.Kinds]);

    /// <summary>Every Result node's line; answers even when something failed, since a node that falls takes only its own branch.</summary>
    protected override UIPhrase? AnswerOf(UINodeRunResult result)
    {
        ArgumentNullException.ThrowIfNull(result);

        List<string> lines = [];

        foreach (UINode node in Sheet.Nodes)
        {
            if (string.Equals(node.Type, ResultNode.NodeKey, StringComparison.Ordinal) && result.TryGetOutput(node.Id, nameof(ResultNode.Text), out var text) && text is string line)
                lines.Add(line);
        }

        // The Result nodes' own lines are the sheet's content, shown as written.
        return lines.Count == 0 ? new UIPhrase("nodes.answer.none") : UIPhrase.Text(string.Join("   •   ", lines));
    }

    /// <summary>Placed where the canvas's Arrange puts them, so the sheet opens as it would stand after one.</summary>
    private static UINodeDocument StartingSheet()
    {
        UINode left = new("n-left", NumberNode.NodeKey, 0, 32, values: Values(("Value", 12)));
        UINode right = new("n-right", NumberNode.NodeKey, 0, 224, values: Values(("Value", 7)));
        UINode operation = new("n-op", OperationNode.NodeKey, 320, 8, values: Values(("Operation", "Multiply")));
        UINode round = new("n-round", RoundNode.NodeKey, 608, 8, values: Values(("Digits", 2)));
        UINode answer = new("n-answer", ResultNode.NodeKey, 928, 8, values: Values(("Label", "Area")));
        // One input fed by a wire and one left to its typed value: the empty pin wears the optional dot beside the solid one.
        UINode offset = new("n-offset", OperationNode.NodeKey, 928, 128, values: Values(("Operation", "Add"), ("Right", 1)));
        UINode offsetAnswer = new("n-offset-answer", ResultNode.NodeKey, 1216, 128, values: Values(("Label", "Plus one")));
        UINode total = new("n-total", SumNode.NodeKey, 320, 199);
        UINode totalAnswer = new("n-total-answer", ResultNode.NodeKey, 608, 199, values: Values(("Label", "Total")));

        return new UINodeDocument(
            [left, right, operation, round, answer, offset, offsetAnswer, total, totalAnswer],
            [
                new UINodeEdge("e-1", left.Id, nameof(NumberNode.Result), operation.Id, nameof(OperationNode.Left)),
                new UINodeEdge("e-2", right.Id, nameof(NumberNode.Result), operation.Id, nameof(OperationNode.Right)),
                new UINodeEdge("e-3", operation.Id, nameof(OperationNode.Result), round.Id, nameof(RoundNode.Value)),
                new UINodeEdge("e-4", round.Id, nameof(RoundNode.Result), answer.Id, nameof(ResultNode.Value)),
                new UINodeEdge("e-5", round.Id, nameof(RoundNode.Result), offset.Id, nameof(OperationNode.Left)),
                new UINodeEdge("e-6", offset.Id, nameof(OperationNode.Result), offsetAnswer.Id, nameof(ResultNode.Value)),

                // Both numbers into the one pin that takes several: the Sum node is fed by two connections, not by a value typed in.
                new UINodeEdge("e-7", left.Id, nameof(NumberNode.Result), total.Id, nameof(SumNode.Values)),
                new UINodeEdge("e-8", right.Id, nameof(NumberNode.Result), total.Id, nameof(SumNode.Values)),
                new UINodeEdge("e-9", total.Id, nameof(SumNode.Result), totalAnswer.Id, nameof(ResultNode.Value))
            ]);
    }
}
