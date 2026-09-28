using System;
using NE.Standard.UI.Primitives.Constants;

namespace NE.Standard.UI.Graph.Calculator;

/// <summary>
/// Which end of its numbers a <see cref="MinMaxNode"/> takes.
/// </summary>
public enum UIMinMax
{
    Least,
    Most
}

/// <summary>
/// The least or the most of every number that reaches it; with none, the answer is zero.
/// </summary>
[GraphNode(Key = NodeKey, Category = CalculatorNodes.Category + "/Maths", Title = "Least or most", Description = "The least or the most of every number wired into it.", Icon = UIGlyphs.UnfoldMore, Color = CalculatorNodes.NumberColor)]
public sealed class MinMaxNode : IGraphNode
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "calculator.min-max";

    /// <summary>Gets or sets the numbers to choose from.</summary>
    [GraphInput(Title = "Values", Multiple = true, Height = 6, Description = "Every number wired in.")]
    public double[] Values { get; set; } = [];

    /// <summary>Gets or sets which end is taken.</summary>
    [GraphInput(Title = "Take", NoPin = true)]
    public UIMinMax Take { get; set; }

    /// <summary>Gets or sets the number taken.</summary>
    [GraphOutput(Title = "Result")]
    public double Result { get; set; }

    /// <inheritdoc/>
    public void Execute(UINodeRunContext context)
    {
        if (Values.Length == 0)
        {
            Result = 0;
            return;
        }

        var most = Take == UIMinMax.Most;
        var result = Values[0];

        for (var i = 1; i < Values.Length; i++)
            result = most ? Math.Max(result, Values[i]) : Math.Min(result, Values[i]);

        Result = result;
    }
}
