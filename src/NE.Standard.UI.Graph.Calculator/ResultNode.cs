using System.Globalization;
using NE.Standard.UI.Primitives.Constants;

namespace NE.Standard.UI.Graph.Calculator;

/// <summary>
/// The end of the sheet: what reaches it, written out under a label — the line an application reads after a run.
/// </summary>
[GraphNode(Key = NodeKey, Category = CalculatorNodes.Category + "/Output", Title = "Result", Description = "The end of the sheet: what reaches it, written out.", Icon = UIGlyphs.Flag, Color = CalculatorNodes.OutputColor)]
public sealed class ResultNode : IGraphNode
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "calculator.result";

    /// <summary>Gets or sets the number written out.</summary>
    [GraphInput(Title = "Value", PinOnly = true, Required = true)]
    public double Value { get; set; }

    /// <summary>Gets or sets the label written before the number.</summary>
    [GraphInput(Title = "Label", NoPin = true, MaxLength = 40)]
    public string Label { get; set; } = "Result";

    /// <summary>Gets or sets the line written out: the label and the number.</summary>
    [GraphOutput(Title = "Text")]
    public string Text { get; set; } = string.Empty;

    /// <inheritdoc/>
    public void Execute(UINodeRunContext context)
        => Text = $"{Label}: {Value.ToString("0.######", CultureInfo.InvariantCulture)}";
}
