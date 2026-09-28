using System;
using NE.Standard.UI.Primitives.Constants;

namespace NE.Standard.UI.Graph;

/// <summary>
/// A number typed in on the node; nothing feeds it.
/// </summary>
[GraphNode(Key = NodeKey, Category = UINodeKinds.ValuesCategory, Title = "Number", Description = "A number typed in on the node.", Icon = UIGlyphs.Numbers, Color = "var(--ui-color-series-3)")]
public sealed class NumberNode : IGraphNode
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "graph.number";

    /// <summary>Gets or sets the number typed in.</summary>
    [GraphInput(Title = "Value", NoPin = true, Step = 1)]
    public double Value { get; set; }

    /// <summary>Gets or sets the number, for the nodes downstream.</summary>
    [GraphOutput(Title = "Result")]
    public double Result { get; set; }

    /// <inheritdoc/>
    public void Execute(UINodeRunContext context)
        => Result = Value;
}

/// <summary>
/// A text typed in on the node; nothing feeds it.
/// </summary>
[GraphNode(Key = NodeKey, Category = UINodeKinds.ValuesCategory, Title = "Text", Description = "A text typed in on the node.", Icon = UIGlyphs.TextFields, Color = "var(--ui-color-series-5)")]
public sealed class TextNode : IGraphNode
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "graph.text";

    /// <summary>Gets or sets the text typed in.</summary>
    [GraphInput(Title = "Value", NoPin = true, MaxLines = 6)]
    public string Value { get; set; } = string.Empty;

    /// <summary>Gets or sets the text, for the nodes downstream.</summary>
    [GraphOutput(Title = "Result")]
    public string Result { get; set; } = string.Empty;

    /// <inheritdoc/>
    public void Execute(UINodeRunContext context)
        => Result = Value;
}

/// <summary>
/// A day picked on the node; nothing feeds it.
/// </summary>
[GraphNode(Key = NodeKey, Category = UINodeKinds.ValuesCategory, Title = "Date", Description = "A day picked on the node, or today.", Icon = UIGlyphs.Calendar, Color = "var(--ui-color-series-8)", AlwaysRuns = true)]
public sealed class DateNode : IGraphNode
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "graph.date";

    /// <summary>Gets or sets the day picked; none, the day the sheet is run on, rather than the first day of the calendar.</summary>
    [GraphInput(Title = "Value", NoPin = true, Description = "Empty, the day the sheet is run on.")]
    public DateOnly? Value { get; set; }

    /// <summary>Gets or sets the day, for the nodes downstream.</summary>
    [GraphOutput(Title = "Result")]
    public DateOnly Result { get; set; }

    /// <inheritdoc/>
    public void Execute(UINodeRunContext context)
        => Result = Value ?? DateOnly.FromDateTime(DateTime.Today);
}

/// <summary>
/// A yes or a no switched on the node; nothing feeds it.
/// </summary>
[GraphNode(Key = NodeKey, Category = UINodeKinds.ValuesCategory, Title = "Yes or no", Description = "A switch set on the node.", Icon = UIGlyphs.ToggleOn, Color = "var(--ui-color-series-4)")]
public sealed class YesNoNode : IGraphNode
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "graph.yes-no";

    /// <summary>Gets or sets whether the switch is on.</summary>
    [GraphInput(Title = "Value", NoPin = true)]
    public bool Value { get; set; }

    /// <summary>Gets or sets the switch, for the nodes downstream.</summary>
    [GraphOutput(Title = "Result")]
    public bool Result { get; set; }

    /// <inheritdoc/>
    public void Execute(UINodeRunContext context)
        => Result = Value;
}

/// <summary>
/// A picture chosen on the node; nothing feeds it. The canvas uploads the file and the application answers its address
/// (<c>OnImageUpload</c>), so a run of a sheet with nothing chosen stops here.
/// </summary>
[GraphNode(Key = NodeKey, Category = UINodeKinds.ValuesCategory, Title = "Image", Description = "A picture chosen on the node.", Icon = UIGlyphs.Image, Color = "var(--ui-color-series-1)", MinWidth = 15)]
public sealed class ImageNode : IGraphNode
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "graph.image";

    /// <summary>Gets or sets the address of the picture chosen.</summary>
    [GraphInput(Title = "Picture", Image = true, Large = true, NoPin = true, Required = true, Height = 8)]
    public string? Picture { get; set; }

    /// <summary>Gets or sets the address, for the nodes downstream.</summary>
    [GraphOutput(Title = "Image", Image = true)]
    public string? Image { get; set; }

    /// <inheritdoc/>
    public void Execute(UINodeRunContext context)
        => Image = Picture;
}
