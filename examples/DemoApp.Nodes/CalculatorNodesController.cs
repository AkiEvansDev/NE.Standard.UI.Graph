using System;
using System.Collections.Generic;

namespace DemoApp.Nodes;

/// <summary>
/// The calculator package's page: two numbers into an operation, rounded and written out, and their sum beside it.
/// </summary>
internal sealed partial class CalculatorNodesController() : NodesSheetController(Kinds, _ => StartingSheet(), "Drag from a pin to wire two nodes, double-click the background to add one, Ctrl+S to save, Run to work it out.")
{
    /// <summary>The common kinds and the calculator's: what the picker offers here and a saved sheet is read back through.</summary>
    public static UINodeCatalog Kinds { get; } = UINodeCatalog.FromTypes([.. UINodeKinds.Common, .. CalculatorNodes.Kinds]);

    /// <summary>Every Result node's line; answers even when something failed, since a node that falls takes only its own branch.</summary>
    protected override string AnswerOf(UINodeRunResult result)
    {
        ArgumentNullException.ThrowIfNull(result);

        List<string> lines = [];

        foreach (UINode node in Sheet.Nodes)
        {
            if (string.Equals(node.Type, ResultNode.NodeKey, StringComparison.Ordinal) && result.TryGetOutput(node.Id, nameof(ResultNode.Text), out var text) && text is string line)
                lines.Add(line);
        }

        return lines.Count == 0 ? "Add a Result node to see an answer." : string.Join("   •   ", lines);
    }

    private static UINodeDocument StartingSheet()
    {
        UINode left = new("n-left", NumberNode.NodeKey, 40, 40, values: Values(("Value", 12)));
        UINode right = new("n-right", NumberNode.NodeKey, 40, 200, values: Values(("Value", 7)));
        UINode operation = new("n-op", OperationNode.NodeKey, 320, 90, values: Values(("Operation", "Multiply")));
        UINode round = new("n-round", RoundNode.NodeKey, 620, 110, values: Values(("Digits", 2)));
        UINode answer = new("n-answer", ResultNode.NodeKey, 880, 120, values: Values(("Label", "Area")));
        // One input fed by a wire and one left to its typed value: the empty pin wears the optional dot beside the solid one.
        UINode offset = new("n-offset", OperationNode.NodeKey, 880, 250, values: Values(("Operation", "Add"), ("Right", 1)));
        UINode offsetAnswer = new("n-offset-answer", ResultNode.NodeKey, 1140, 260, values: Values(("Label", "Plus one")));
        UINode total = new("n-total", SumNode.NodeKey, 320, 260);
        UINode totalAnswer = new("n-total-answer", ResultNode.NodeKey, 620, 280, values: Values(("Label", "Total")));

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
