using System;
using NE.Standard.UI.Primitives.Constants;

namespace NE.Standard.UI.Graph.Calculator;

/// <summary>
/// How a <see cref="CompareNode"/> compares its two numbers.
/// </summary>
public enum UIComparison
{
    Equal,
    NotEqual,
    Less,
    AtMost,
    Greater,
    AtLeast
}

/// <summary>
/// Whether two numbers stand the way the node asks: equal, apart, or one below or above the other.
/// </summary>
[GraphNode(Key = NodeKey, Category = CalculatorNodes.Category + "/Logic", Title = "Compare", Description = "Whether two numbers stand the way asked.", Icon = UIGlyphs.CompareArrows, Color = CalculatorNodes.LogicColor)]
public sealed class CompareNode : IGraphNode
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "calculator.compare";

    /// <summary>Gets or sets the number on the left.</summary>
    [GraphInput(Title = "Left")]
    public double Left { get; set; }

    /// <summary>Gets or sets the number on the right.</summary>
    [GraphInput(Title = "Right")]
    public double Right { get; set; }

    /// <summary>Gets or sets how the two are compared.</summary>
    [GraphInput(Title = "Is", NoPin = true)]
    public UIComparison Is { get; set; }

    /// <summary>Gets or sets whether the two stand that way.</summary>
    [GraphOutput(Title = "Result")]
    public bool Result { get; set; }

    /// <inheritdoc/>
    public void Execute(UINodeRunContext context)
        => Result = Is switch
        {
            UIComparison.Equal => Left == Right,
            UIComparison.NotEqual => Left != Right,
            UIComparison.Less => Left < Right,
            UIComparison.AtMost => Left <= Right,
            UIComparison.Greater => Left > Right,
            UIComparison.AtLeast => Left >= Right,
            _ => throw new InvalidOperationException($"'{Is}' is not a comparison.")
        };
}
