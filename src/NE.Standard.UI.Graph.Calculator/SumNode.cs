using System;
using NE.Standard.UI.Primitives.Constants;

namespace NE.Standard.UI.Graph.Calculator;

/// <summary>
/// Adds up every number that reaches it: one pin taking as many connections as are drawn to it, a list of typed values while
/// nothing feeds it.
/// </summary>
[GraphNode(Key = NodeKey, Category = CalculatorNodes.Category + "/Maths", Title = "Sum", Description = "Adds up every number wired into it.", Icon = UIGlyphs.Functions, Color = CalculatorNodes.NumberColor)]
public sealed class SumNode : IGraphNode
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "calculator.sum";

    /// <summary>Gets or sets the numbers to add, in the order the connections were made.</summary>
    [GraphInput(Title = "Values", Multiple = true, Height = 6, Description = "Every number wired in, in the order the connections were made.")]
    public double[] Values { get; set; } = [];

    /// <summary>Gets or sets the total.</summary>
    [GraphOutput(Title = "Result")]
    public double Result { get; set; }

    /// <inheritdoc/>
    public void Execute(UINodeRunContext context)
    {
        ArgumentNullException.ThrowIfNull(context);

        var total = 0d;

        foreach (var value in Values)
            total += value;

        context.Log($"Added {Values.Length} numbers.");

        Result = total;
    }
}
