using System;
using NE.Standard.UI.Primitives.Constants;

namespace NE.Standard.UI.Graph.Calculator;

/// <summary>
/// Holds a number between two ends; ends given the wrong way round are taken the right way.
/// </summary>
[GraphNode(Key = NodeKey, Category = CalculatorNodes.Category + "/Maths", Title = "Clamp", Description = "Holds a number between a least and a most.", Icon = UIGlyphs.Compress, Color = CalculatorNodes.NumberColor)]
public sealed class ClampNode : IGraphNode
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "calculator.clamp";

    /// <summary>Gets or sets the number to hold.</summary>
    [GraphInput(Title = "Value", PinOnly = true, Required = true)]
    public double Value { get; set; }

    /// <summary>Gets or sets the least the answer may be.</summary>
    [GraphInput(Title = "Least")]
    public double Least { get; set; }

    /// <summary>Gets or sets the most the answer may be.</summary>
    [GraphInput(Title = "Most")]
    public double Most { get; set; } = 100;

    /// <summary>Gets or sets the number held between the two.</summary>
    [GraphOutput(Title = "Result")]
    public double Result { get; set; }

    /// <inheritdoc/>
    public void Execute(UINodeRunContext context)
        => Result = Math.Clamp(Value, Math.Min(Least, Most), Math.Max(Least, Most));
}
