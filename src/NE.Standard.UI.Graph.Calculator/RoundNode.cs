using System;
using NE.Standard.UI.Primitives.Constants;

namespace NE.Standard.UI.Graph.Calculator;

/// <summary>
/// Rounds what reaches it to the digits asked for, a half away from zero — 2.5 to 3 — as a calculator does, not to the even
/// neighbour. The value is a pin alone: there is no sense in rounding a number typed in beside it.
/// </summary>
[GraphNode(Key = NodeKey, Category = CalculatorNodes.Category + "/Maths", Title = "Round", Description = "Rounds what reaches it to the digits asked for.", Icon = UIGlyphs.RoundedCorner, Color = CalculatorNodes.NumberColor)]
public sealed class RoundNode : IGraphNode
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "calculator.round";

    /// <summary>Gets or sets the number to round.</summary>
    [GraphInput(Title = "Value", PinOnly = true, Required = true)]
    public double Value { get; set; }

    /// <summary>Gets or sets how many digits after the point are kept, from none to six.</summary>
    [GraphInput(Title = "Digits", NoPin = true, Min = 0, Max = 6)]
    public int Digits { get; set; } = 2;

    /// <summary>Gets or sets the rounded number.</summary>
    [GraphOutput(Title = "Result")]
    public double Result { get; set; }

    /// <inheritdoc/>
    public void Execute(UINodeRunContext context)
        => Result = Math.Round(Value, Math.Clamp(Digits, 0, 6), MidpointRounding.AwayFromZero);
}
