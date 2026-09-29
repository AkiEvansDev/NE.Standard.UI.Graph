using System;
using NE.Standard.UI.Abstractions.Items;

namespace NE.Standard.UI.Graph;

/// <summary>
/// Marks a class as a node kind: the catalogue lists it, and a saved document deserializes back into instances of it.
/// </summary>
[AttributeUsage(AttributeTargets.Class)]
public sealed class GraphNodeAttribute : Attribute
{
    /// <summary>
    /// Gets or sets the key the document names the kind by; unset, the class's name.
    /// </summary>
    public string? Key { get; set; }

    /// <summary>
    /// Gets or sets the title the node and the picker show; unset, the class's name read as words.
    /// </summary>
    public string? Title { get; set; }

    /// <summary>
    /// Gets or sets the group the picker sorts the kind into; a path nests it, <c>Maths/Rounding</c> standing under <c>Maths</c>.
    /// </summary>
    public string? Category { get; set; }

    /// <summary>
    /// Gets or sets the one line under the title in the picker, saying what the kind does.
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Gets or sets the icon beside the title — a glyph name or a URL, as any icon value.
    /// </summary>
    public string? Icon { get; set; }

    /// <summary>
    /// Gets or sets the node's colour, as <c>UIThemeColor</c> writes one; the viewer may change it.
    /// </summary>
    public string? Color { get; set; }

    /// <summary>
    /// Gets or sets the node's minimum width, in rem; unset, the canvas's default. The viewer may drag it wider; height follows
    /// contents until dragged taller.
    /// </summary>
    public double MinWidth { get; set; } = double.NaN;

    /// <summary>
    /// Gets or sets whether the node draws a progress line while it runs. When off, no status effect can make one appear.
    /// </summary>
    public bool ShowProgress { get; set; }

    /// <summary>
    /// Gets or sets whether the viewer may drag the node's corner to resize it; unset, they may.
    /// </summary>
    public bool Resizable { get; set; } = true;

    /// <summary>
    /// Gets or sets whether the node is drawn as a small box with its pins on its two ends and no head or editors — a reroute.
    /// </summary>
    public bool Compact { get; set; }

    /// <summary>Gets or sets whether the node runs every time, even on the inputs it last ran on.</summary>
    /// <remarks>
    /// For one that waits, reads or writes the disk, or otherwise does more than turn its inputs into its outputs. A node with
    /// state always runs by itself.
    /// </remarks>
    public bool AlwaysRuns { get; set; }

    /// <summary>
    /// Gets or sets whether the picker leaves the kind out; a hidden kind is still read, run and drawn, so documents that already
    /// use it keep working.
    /// </summary>
    public bool Hidden { get; set; }
}

/// <summary>
/// Marks a property as a value with an input pin: the property's type is the pin's, and the editor is the field for that type.
/// </summary>
[AttributeUsage(AttributeTargets.Property)]
public sealed class GraphInputAttribute : Attribute
{
    /// <summary>
    /// Gets or sets the pin's caption; unset, the property's name read as words.
    /// </summary>
    public string? Title { get; set; }

    /// <summary>
    /// Gets or sets the pin's tooltip text, shown when the pointer rests on it; none shown if unset.
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Gets or sets whether the pin carries no editor, so the value can only come over a connection.
    /// </summary>
    public bool PinOnly { get; set; }

    /// <summary>Gets or sets whether the pin takes several connections, gathered into the property's collection.</summary>
    /// <remarks>
    /// The property must be an array or list, and the pin's type is its element type. The editor accepts typed values until an edge
    /// feeds the pin, then goes inert; connected values take the order of their edges in the document.
    /// </remarks>
    public bool Multiple { get; set; }

    /// <summary>
    /// Gets or sets the input pin this one is shown beside (<c>nameof(SomeOtherInput)</c>); shown only while that pin holds a
    /// value, or one of <see cref="VisibleValues"/>.
    /// </summary>
    /// <remarks>
    /// A hidden pin is still saved and fed — its value and any wired edge remain even while it is not shown.
    /// </remarks>
    public string? VisibleWhen { get; set; }

    /// <summary>
    /// Gets or sets the values of <see cref="VisibleWhen"/>'s pin that show this one; unset, any value at all but an empty one.
    /// </summary>
    public string[]? VisibleValues { get; set; }

    /// <summary>
    /// Gets or sets whether the pin shows what reaches it — the last run's result — rather than taking a value. Nothing of it is
    /// saved.
    /// </summary>
    public bool Display { get; set; }

    /// <summary>
    /// Gets or sets whether the value has no pin, so it can only be set on the node. The opposite of <see cref="PinOnly"/>; the
    /// two together are refused.
    /// </summary>
    public bool NoPin { get; set; }

    /// <summary>
    /// Gets or sets how tall the editor stands, in rem — a picture worth looking at, a text of several lines.
    /// </summary>
    public double Height { get; set; } = double.NaN;

    /// <summary>
    /// Gets or sets the values a text input may take: the editor is a list of them rather than a field.
    /// </summary>
    public string[]? Choices { get; set; }

    /// <summary>
    /// Gets or sets the member the choices come from: a public static property or method on the node's class returning
    /// <see cref="string"/>s or <see cref="UIChoice"/>s.
    /// </summary>
    /// <remarks>Read once, when the catalogue builds.</remarks>
    public string? ChoicesFrom { get; set; }

    /// <summary>
    /// Gets or sets whether a text input holds a picture's address: its pin is a picture's, and its editor, if it has one, shows
    /// the picture and the address under it.
    /// </summary>
    public bool Image { get; set; }

    /// <summary>
    /// Gets or sets whether a picture editor is one large pressable surface rather than a thumbnail with its address. Applies
    /// only when <see cref="Image"/> is set.
    /// </summary>
    public bool Large { get; set; }

    /// <summary>
    /// Gets or sets whether the node cannot run without this value; a run stops here with an error, skipping everything below.
    /// </summary>
    public bool Required { get; set; }

    /// <summary>Gets or sets whether the node itself changes this value as it runs — a counter's count, a place in a list.</summary>
    /// <remarks>
    /// What a run leaves it at is written back into the document for the next run, and the node offers to put it back to its
    /// default. Never a pin.
    /// </remarks>
    public bool State { get; set; }

    /// <summary>
    /// Gets or sets whether nothing of the value is drawn on the node: a state the node keeps for itself, which the node's menu
    /// resets. Only a <see cref="State"/> may be hidden.
    /// </summary>
    public bool Hidden { get; set; }

    /// <summary>
    /// Gets or sets the smallest value a number editor accepts.
    /// </summary>
    public double Min { get; set; } = double.NaN;

    /// <summary>
    /// Gets or sets the largest value a number editor accepts.
    /// </summary>
    public double Max { get; set; } = double.NaN;

    /// <summary>
    /// Gets or sets how much a number editor's arrows move the value.
    /// </summary>
    public double Step { get; set; } = double.NaN;

    /// <summary>
    /// Gets or sets what the value is measured in — <c>px</c>, <c>kg</c>, <c>%</c> — written after the editor, inside its box.
    /// </summary>
    public string? Unit { get; set; }

    /// <summary>
    /// Gets or sets the standard numeric format (<c>N</c>, <c>F2</c>, <c>P</c>, <c>C</c>) for a display pin's number, written in
    /// the page's culture.
    /// </summary>
    /// <remarks>Not applied to an editable field — the viewer's typed text is shown as typed.</remarks>
    public string? Format { get; set; }

    /// <summary>
    /// Gets or sets how many lines a text editor is tall; more than one makes it an area.
    /// </summary>
    public int MaxLines { get; set; }

    /// <summary>
    /// Gets or sets the longest text the editor accepts.
    /// </summary>
    public int MaxLength { get; set; }

    /// <summary>
    /// Gets or sets where the pin stands among its siblings, counted from one; unset, the class's declaration order.
    /// </summary>
    /// <remarks>An explicit order takes precedence over declaration order; equal orders keep declaration order.</remarks>
    public int Order { get; set; }
}

/// <summary>
/// Marks a property as an output pin of the property's type.
/// </summary>
[AttributeUsage(AttributeTargets.Property)]
public sealed class GraphOutputAttribute : Attribute
{
    /// <summary>
    /// Gets or sets the pin's caption; unset, the property's name read as words.
    /// </summary>
    public string? Title { get; set; }

    /// <inheritdoc cref="GraphInputAttribute.Description"/>
    public string? Description { get; set; }

    /// <summary>
    /// Gets or sets the input pin whose connected type this output's type follows — <c>nameof(SomeInput)</c>.
    /// </summary>
    public string? TypeOf { get; set; }

    /// <summary>
    /// Gets or sets whether a text output carries a picture's address, so its pin is a picture's.
    /// </summary>
    public bool Image { get; set; }

    /// <summary>
    /// Gets or sets where the pin stands among its siblings, counted from one; unset, the class's declaration order.
    /// </summary>
    /// <remarks>An explicit order takes precedence over declaration order; equal orders keep declaration order.</remarks>
    public int Order { get; set; }
}
