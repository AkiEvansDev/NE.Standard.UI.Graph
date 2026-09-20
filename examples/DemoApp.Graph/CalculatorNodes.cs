using System;
using System.Globalization;
using NE.Standard.UI.Graph;
using NE.Standard.UI.Icons.Material;

namespace DemoApp.Graph;

/// <summary>
/// A number the viewer types in. Its value carries no pin: it is filled in on the node and nothing else feeds it.
/// </summary>
[GraphNode(Category = "Values", Title = "Number", Description = "A number typed in on the node.", Icon = MaterialIcons.Numbers, Color = DemoNodeColors.Number)]
internal sealed class NumberNode : IGraphNode
{
    [GraphInput(Title = "Value", NoPin = true, Step = 1)]
    public double Value { get; set; }

    [GraphOutput(Title = "Result")]
    public double Result { get; set; }

    public void Execute(UINodeRunContext context)
        => Result = Value;
}

/// <summary>
/// One arithmetic step. The operation is a text with a list of values, so the editor is a combo box rather than a field.
/// </summary>
[GraphNode(Category = "Maths", Title = "Operation", Description = "Adds, subtracts, multiplies, divides or raises.", Icon = MaterialIcons.Calculate, Color = DemoNodeColors.Number)]
internal sealed class OperationNode : IGraphNode
{
    [GraphInput(Title = "Left")]
    public double Left { get; set; }

    [GraphInput(Title = "Right")]
    public double Right { get; set; }

    [GraphInput(Title = "Operation", NoPin = true, Choices = ["Add", "Subtract", "Multiply", "Divide", "Power"])]
    public string Operation { get; set; } = "Add";

    [GraphInput(
        Title = "By zero",
        NoPin = true,
        Choices = ["Fail", "Zero"],
        VisibleWhen = nameof(Operation),
        VisibleValues = ["Divide"],
        Description = "What a division by zero comes to: the node fails, or it answers zero.")]
    public string ByZero { get; set; } = "Fail";

    [GraphOutput(Title = "Result")]
    public double Result { get; set; }

    public void Execute(UINodeRunContext context)
        => Result = Operation switch
        {
            "Subtract" => Left - Right,
            "Multiply" => Left * Right,
            "Divide" => Right != 0 ? Left / Right : ByZero == "Zero" ? 0 : throw new InvalidOperationException("Division by zero."),
            "Power" => Math.Pow(Left, Right),
            _ => Left + Right
        };
}

/// <summary>
/// Rounds what reaches it. Its value is a pin and nothing else — there is no sense in rounding a number typed in beside it — and
/// the number of digits is a whole number, so its editor steps by one between its two ends.
/// </summary>
[GraphNode(Category = "Maths", Title = "Round", Description = "Rounds what reaches it to the digits asked for.", Icon = MaterialIcons.RoundedCorner, Color = DemoNodeColors.Number)]
internal sealed class RoundNode : IGraphNode
{
    [GraphInput(Title = "Value", PinOnly = true, Required = true)]
    public double Value { get; set; }

    [GraphInput(Title = "Digits", NoPin = true, Min = 0, Max = 6)]
    public int Digits { get; set; } = 2;

    [GraphOutput(Title = "Result")]
    public double Result { get; set; }

    public void Execute(UINodeRunContext context)
        => Result = Math.Round(Value, Math.Clamp(Digits, 0, 6));
}

/// <summary>
/// Sums every number that reaches it: one pin taking as many connections as are drawn to it, whose editor is a list of typed
/// values while nothing feeds it.
/// </summary>
[GraphNode(Category = "Maths", Title = "Sum", Description = "Adds up every number wired into it.", Icon = MaterialIcons.Functions, Color = DemoNodeColors.Number)]
internal sealed class SumNode : IGraphNode
{
    [GraphInput(Title = "Values", Multiple = true, Height = 6, Description = "Every number wired in, in the order the connections were made.")]
    public double[] Values { get; set; } = [];

    [GraphOutput(Title = "Result")]
    public double Result { get; set; }

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

/// <summary>
/// The end of the sheet: what reaches it, written out. The controller reads this node's output after a run.
/// </summary>
[GraphNode(Category = "Output", Title = "Result", Description = "The end of the sheet: what reaches it, written out.", Icon = MaterialIcons.Flag, Color = DemoNodeColors.Text)]
internal sealed class ResultNode : IGraphNode
{
    [GraphInput(Title = "Value", PinOnly = true, Required = true)]
    public double Value { get; set; }

    [GraphInput(Title = "Label", NoPin = true, MaxLength = 40)]
    public string Label { get; set; } = "Result";

    [GraphOutput(Title = "Text")]
    public string Text { get; set; } = string.Empty;

    public void Execute(UINodeRunContext context)
        => Text = $"{Label}: {Value.ToString("0.######", CultureInfo.InvariantCulture)}";
}

/// <summary>
/// A picture the viewer chooses on the node: one large picture field with no pin, and one output another node reads it through
/// — shaped by the attributes alone. Its picture is required, so a run of a sheet
/// with nothing chosen stops here rather than carrying an empty address down the chain.
/// </summary>
[GraphNode(Category = "Media", Title = "Load image", Description = "A picture the viewer chooses on the node.", Icon = MaterialIcons.Image, Color = DemoNodeColors.Picture, MinWidth = 15)]
internal sealed class LoadImageNode : IGraphNode
{
    [GraphInput(Title = "Picture", Image = true, Large = true, NoPin = true, Required = true, Height = 8)]
    public string? Picture { get; set; }

    [GraphOutput(Title = "Image")]
    public string? Image { get; set; }

    public void Execute(UINodeRunContext context)
        => Image = Picture;
}

/// <summary>
/// A picture that came over a connection, shown at the size the attribute asks for.
/// </summary>
[GraphNode(Category = "Media", Title = "Show image", Description = "Shows a picture that came over a connection.", Icon = MaterialIcons.Photo, Color = DemoNodeColors.Picture, MinWidth = 15)]
internal sealed class ShowImageNode : IGraphNode
{
    [GraphInput(Title = "Picture", Image = true, Height = 8)]
    public string? Picture { get; set; }

    [GraphInput(Title = "Caption", NoPin = true, MaxLines = 2, MaxLength = 120)]
    public string Caption { get; set; } = string.Empty;

    [GraphOutput(Title = "Address")]
    public string? Address { get; set; }

    public void Execute(UINodeRunContext context)
        => Address = Picture;
}
