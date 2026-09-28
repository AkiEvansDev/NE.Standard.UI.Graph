using System;
using NE.Standard.UI.Primitives.Constants;

namespace NE.Standard.UI.Graph.Calculator;

/// <summary>
/// The arithmetic an <see cref="OperationNode"/> does.
/// </summary>
public enum UICalculatorOperation
{
    Add,
    Subtract,
    Multiply,
    Divide,
    Power
}

/// <summary>
/// What a division by zero comes to.
/// </summary>
public enum UIDivisionByZero
{
    /// <summary>The node fails, stopping its branch of the run.</summary>
    Fail,

    /// <summary>The answer is zero.</summary>
    Zero
}

/// <summary>
/// One arithmetic step between two numbers; the operation is chosen on the node.
/// </summary>
[GraphNode(Key = NodeKey, Category = CalculatorNodes.Category + "/Maths", Title = "Operation", Description = "Adds, subtracts, multiplies, divides or raises.", Icon = UIGlyphs.Calculate, Color = CalculatorNodes.NumberColor)]
public sealed class OperationNode : IGraphNode
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "calculator.operation";

    /// <summary>Gets or sets the number on the left of the operation.</summary>
    [GraphInput(Title = "Left")]
    public double Left { get; set; }

    /// <summary>Gets or sets the number on the right of the operation.</summary>
    [GraphInput(Title = "Right")]
    public double Right { get; set; }

    /// <summary>Gets or sets the operation.</summary>
    [GraphInput(Title = "Operation", NoPin = true)]
    public UICalculatorOperation Operation { get; set; }

    /// <summary>Gets or sets what a division by zero comes to.</summary>
    [GraphInput(Title = "By zero", NoPin = true, VisibleWhen = nameof(Operation), VisibleValues = [nameof(UICalculatorOperation.Divide)], Description = "What a division by zero comes to: the node fails, or it answers zero.")]
    public UIDivisionByZero ByZero { get; set; }

    /// <summary>Gets or sets the answer.</summary>
    [GraphOutput(Title = "Result")]
    public double Result { get; set; }

    /// <inheritdoc/>
    public void Execute(UINodeRunContext context)
        => Result = Operation switch
        {
            UICalculatorOperation.Add => Left + Right,
            UICalculatorOperation.Subtract => Left - Right,
            UICalculatorOperation.Multiply => Left * Right,
            UICalculatorOperation.Divide => Right != 0 ? Left / Right : ByZero == UIDivisionByZero.Zero ? 0 : throw new InvalidOperationException("Division by zero."),
            UICalculatorOperation.Power => Math.Pow(Left, Right),
            _ => throw new InvalidOperationException($"'{Operation}' is not an operation.")
        };
}
