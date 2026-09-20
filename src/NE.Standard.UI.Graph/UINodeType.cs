using System;
using System.Text.Json.Serialization;
using NE.Standard.UI.Abstractions.Items;

namespace NE.Standard.UI.Graph;

/// <summary>
/// What editor a pin's value is filled in with, decided by the property's type.
/// </summary>
public enum UINodeEditor
{
    /// <summary>No editor: the value can only come over a connection.</summary>
    None,
    Text,
    Number,
    Boolean,
    /// <summary>A picture, shown from the address the value holds.</summary>
    Image,
    Date,
    Time,
    DateTime,
    /// <summary>A list of the pin's choices.</summary>
    Choice,
    /// <summary>A list of simple values, edited in a dialog.</summary>
    List,
    /// <summary>Not a value at all: whatever the last run fed the pin, drawn by its shape.</summary>
    Display
}

/// <summary>
/// One node kind, as the catalogue lists it: what the picker shows and what pins the node carries.
/// </summary>
public sealed class UINodeType
{
    /// <summary>
    /// Creates a node kind.
    /// </summary>
    [JsonConstructor]
    public UINodeType(string key, string title, UINodePin[] inputs, UINodePin[] outputs, string? category = null, string? description = null, string? icon = null, string? color = null, double? minWidth = null, bool showProgress = false, bool resizable = true, bool hidden = false)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(key);
        ArgumentException.ThrowIfNullOrWhiteSpace(title);

        Key = key;
        Title = title;
        Inputs = inputs ?? [];
        Outputs = outputs ?? [];
        Category = category;
        Description = description;
        Icon = icon;
        Color = color;
        MinWidth = minWidth;
        ShowProgress = showProgress;
        Resizable = resizable;
        Hidden = hidden;
    }

    /// <summary>
    /// Gets the key a node in the document names this kind by.
    /// </summary>
    public string Key { get; }

    /// <summary>
    /// Gets the title the node and the picker show.
    /// </summary>
    public string Title { get; }

    /// <summary>
    /// Gets the group the picker sorts the kind into.
    /// </summary>
    public string? Category { get; }

    /// <summary>
    /// Gets the one line under the title in the picker, saying what the kind does.
    /// </summary>
    public string? Description { get; }

    /// <summary>
    /// Gets the icon beside the title.
    /// </summary>
    public string? Icon { get; }

    /// <summary>
    /// Gets the node's colour, as <c>UIThemeColor</c> writes one.
    /// </summary>
    public string? Color { get; }

    /// <summary>
    /// Gets the least width the node stands at, in rem; unset, the canvas's own. The viewer may drag it wider.
    /// </summary>
    public double? MinWidth { get; }

    /// <summary>
    /// Gets whether the node draws a progress line while it runs.
    /// </summary>
    public bool ShowProgress { get; }

    /// <summary>
    /// Gets whether the viewer may drag the node's corner.
    /// </summary>
    public bool Resizable { get; }

    /// <summary>
    /// Gets whether the picker leaves the kind out, though a saved document still reads and runs it.
    /// </summary>
    public bool Hidden { get; }

    /// <summary>
    /// Gets the input pins, in the order they are drawn.
    /// </summary>
    public UINodePin[] Inputs { get; }

    /// <summary>
    /// Gets the output pins, in the order they are drawn.
    /// </summary>
    public UINodePin[] Outputs { get; }
}

/// <summary>
/// One pin of a node kind: the value it carries, its type, and the editor that fills it in.
/// </summary>
public sealed class UINodePin
{
    /// <summary>
    /// Creates a pin.
    /// </summary>
    [JsonConstructor]
    public UINodePin(string name, string title, string type, UINodeEditor editor = UINodeEditor.None, object? defaultValue = null, UIChoice[]? choices = null, double? min = null, double? max = null, double? step = null, int? maxLines = null, int? maxLength = null, string? typeOf = null, bool hasPin = true, double? height = null, bool large = false, bool required = false, bool multiple = false, string? description = null, string? visibleWhen = null, string[]? visibleValues = null, string? unit = null, string? format = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentException.ThrowIfNullOrWhiteSpace(type);

        Name = name;
        Title = title;
        Type = type;
        Editor = editor;
        DefaultValue = defaultValue;
        Choices = choices ?? [];
        Min = min;
        Max = max;
        Step = step;
        MaxLines = maxLines;
        MaxLength = maxLength;
        TypeOf = typeOf;
        HasPin = hasPin;
        Height = height;
        Large = large;
        Required = required;
        Multiple = multiple;
        Description = description;
        VisibleWhen = visibleWhen;
        VisibleValues = visibleValues ?? [];
        Unit = unit;
        Format = format;
    }

    /// <summary>
    /// Gets the property's name, which an edge and a saved value name the pin by.
    /// </summary>
    public string Name { get; }

    /// <summary>
    /// Gets the pin's caption.
    /// </summary>
    public string Title { get; }

    /// <summary>
    /// Gets the pin's type id — see <see cref="UINodePinTypes"/>.
    /// </summary>
    public string Type { get; }

    /// <summary>
    /// Gets the editor the value is filled in with; <see cref="UINodeEditor.None"/> for a pin-only input and every output.
    /// </summary>
    public UINodeEditor Editor { get; }

    /// <summary>
    /// Gets the value a new node starts with.
    /// </summary>
    public object? DefaultValue { get; }

    /// <summary>
    /// Gets the choices a <see cref="UINodeEditor.Choice"/> editor lists.
    /// </summary>
    public UIChoice[] Choices { get; }

    /// <summary>
    /// Gets the smallest value a number editor accepts.
    /// </summary>
    public double? Min { get; }

    /// <summary>
    /// Gets the largest value a number editor accepts.
    /// </summary>
    public double? Max { get; }

    /// <summary>
    /// Gets how much a number editor's arrows move the value.
    /// </summary>
    public double? Step { get; }

    /// <summary>
    /// Gets how many lines a text editor is tall.
    /// </summary>
    public int? MaxLines { get; }

    /// <summary>
    /// Gets the longest text the editor accepts.
    /// </summary>
    public int? MaxLength { get; }

    /// <summary>
    /// Gets the input pin whose connected type this output's type follows.
    /// </summary>
    public string? TypeOf { get; }

    /// <summary>
    /// Gets whether the pin itself is drawn; false for a value that can only be filled in on the node.
    /// </summary>
    public bool HasPin { get; }

    /// <summary>
    /// Gets how tall the editor stands, in rem.
    /// </summary>
    public double? Height { get; }

    /// <summary>
    /// Gets whether a picture editor is one large surface the viewer presses to choose a file.
    /// </summary>
    public bool Large { get; }

    /// <summary>
    /// Gets whether the node cannot run without this value.
    /// </summary>
    public bool Required { get; }

    /// <summary>
    /// Gets whether the pin takes several connections at once, gathered into the collection the property declares; its
    /// <see cref="Type"/> is then the element's, since one edge carries one element.
    /// </summary>
    public bool Multiple { get; }

    /// <summary>
    /// Gets the line the pin says about itself when the pointer rests on it.
    /// </summary>
    public string? Description { get; }

    /// <summary>
    /// Gets the input pin this one is shown beside; unset, the pin is always drawn.
    /// </summary>
    public string? VisibleWhen { get; }

    /// <summary>
    /// Gets the values of <see cref="VisibleWhen"/>'s pin that show this one; empty, any value but an empty one.
    /// </summary>
    public string[] VisibleValues { get; }

    /// <summary>
    /// Gets what the value is measured in, written after the editor inside its box.
    /// </summary>
    public string? Unit { get; }

    /// <summary>
    /// Gets how a number is written where the canvas writes one itself — a display pin's answer.
    /// </summary>
    public string? Format { get; }
}
