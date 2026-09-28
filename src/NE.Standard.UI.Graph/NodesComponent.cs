using System;
using System.Collections.Generic;
using NE.Standard.UI.Abstractions.Items;
using NE.Standard.UI.Authoring.BuiltIns;
using NE.Standard.UI.Authoring.Components;
using NE.Standard.UI.Components.BuiltIns.Actions;
using NE.Standard.UI.Components.BuiltIns.Inputs;
using NE.Standard.UI.Components.BuiltIns.Models;
using NE.Standard.UI.Primitives.Annotations;
using NE.Standard.UI.Primitives.Constants;
using NE.Standard.UI.Primitives.Styling;

namespace NE.Standard.UI.Graph;

/// <summary>
/// A canvas of typed nodes the viewer wires together; node kinds are the application's own classes. The value is the whole
/// document, committed by a save.
/// </summary>
public abstract partial class NodesComponent<T> : GraphCanvasComponentBase<T, UINodeDocument>
    where T : NodesComponent<T>, IUIComponentDefinition
{
    protected NodesComponent(string? id = null) : base(id)
    {
        // A reroute is a shape of the sheet, not a kind to look for: its own entry, not a line of the picker.
        PrependEntries(CanvasMenu, Entry(UIGraphCommands.AddNode, "Add node"), Entry(UIGraphCommands.AddReroute, "Add reroute"), Separator());
        PrependEntries(EdgeMenu, Entry(UIGraphCommands.AddReroute, "Add reroute"));
        // Shown only on a node whose kind keeps a state; a hidden state has no reset button of its own.
        _ = NodeMenu.AddItems([Entry(UIGraphCommands.ResetState, "Reset")]);

        // The core's own field, not an input of the package's: the page's appearance, its clear button and its focus ring.
        PickerSearch = new TextInputComponent()
            .SetType(UITextInputType.Search)
            .SetPrefixIcon(UIGlyphs.Search)
            .SetPlaceholder("Search kinds")
            .SetShowClearButton();

        SetCanvasRegion(UIGraphRegions.PickerSearch, PickerSearch);
        SetCanvasRegion(UIGraphRegions.ListRemove, GlyphButton(UIGlyphs.Close, UIGraphWords.Remove));
        SetCanvasRegion(UIGraphRegions.ListAdd, GlyphButton(UIGlyphs.Add, UIGraphWords.AddValue));
        SetCanvasRegion(UIGraphRegions.StateReset, GlyphButton(UIGlyphs.Restart, UIGraphWords.ResetState));
    }

    /// <summary>
    /// Gets the search field over the node picker's catalogue.
    /// </summary>
    public TextInputComponent PickerSearch { get; }

    /// <summary>
    /// Gets the node kinds the picker offers and a saved document is read back through.
    /// </summary>
    /// <remarks>Render-time only: the catalogue is how the canvas is built.</remarks>
    [UIComponentProperty(IsBindable = false, GenerateSetter = false, DefaultValue = null)]
    public UINodeCatalog? Catalog { get; private set; }

    /// <summary>
    /// Gets or sets whether a run's progress is drawn as a line along the canvas's top. Needs <see cref="SetRunProgressEffect"/>s
    /// pushed by the runner; draws nothing without them.
    /// </summary>
    [UIComponentProperty(DefaultValue = true)]
    public bool? ShowRunProgress { get; set; }

    /// <summary>
    /// Gets or sets whether the canvas carries a run panel in its top corner: Run and Run all save the sheet with a run's reason
    /// (<see cref="UIGraphArguments.RunReason"/>, <see cref="UIGraphArguments.RunAllReason"/>) for the save command to hand to
    /// <see cref="UINodeRuns"/>, and Stop raises <see cref="GraphEvents.RunStop"/> while a run is on.
    /// </summary>
    [UIComponentProperty(DefaultValue = false)]
    public bool? ShowRunPanel { get; set; }

    /// <inheritdoc cref="SetCatalog(UINodeCatalog)"/>
    public T SetCatalog(params Type[] nodeTypes)
        => SetCatalog(UINodeCatalog.FromTypes(nodeTypes));

    /// <summary>
    /// Sets the node kinds, read off the application's own classes.
    /// </summary>
    public T SetCatalog(UINodeCatalog catalog)
    {
        ArgumentNullException.ThrowIfNull(catalog);

        Catalog = catalog;
        SetEditors(catalog);
        return Self;
    }

    /// <summary>Builds one field template per editable pin, shaped by the pin's attributes, for the engine to clone into every node.</summary>
    private void SetEditors(UINodeCatalog catalog)
    {
        RemoveCanvasRegions(UIGraphRegions.EditorPrefix);

        foreach (UINodeType type in catalog.Types)
        {
            foreach (UINodePin pin in type.Inputs)
            {
                if (CreateEditor(pin) is IVisualComponent editor)
                    SetCanvasRegion(UIGraphRegions.Editor(type.Key, pin.Name), editor);
            }
        }
    }

    // A field that fits one line keeps its caption inside the box; one too tall for a line has the node draw the caption above it.
    private static IVisualComponent? CreateEditor(UINodePin pin)
        => pin.Editor switch
        {
            // Not resizable itself: it fills the node's height, and the node's corner sizes both on the grid.
            UINodeEditor.Text when pin.MaxLines > 1 => Limited(new TextAreaComponent().SetRows(pin.MaxLines.Value).SetSize(UIInputSize.Small).SetResize(UITextAreaResizeMode.None), pin),
            UINodeEditor.Text => Limited(TextEditor(pin), pin),
            UINodeEditor.Number => NumberEditor(pin),
            UINodeEditor.Boolean => new CheckboxComponent().SetSize(UIInputSize.Small),
            UINodeEditor.Choice => ChoiceEditor(pin),
            UINodeEditor.Date => new DateInputComponent().SetSize(UIInputSize.Small).SetTitlePlacement(UIInputTitlePlacement.Inside).SetTitle(pin.Title),
            UINodeEditor.Time => new TimeInputComponent().SetSize(UIInputSize.Small).SetTitlePlacement(UIInputTitlePlacement.Inside).SetTitle(pin.Title),
            UINodeEditor.DateTime => new DateTimeInputComponent().SetSize(UIInputSize.Small).SetTitlePlacement(UIInputTitlePlacement.Inside).SetTitle(pin.Title),
            // Large draws the framework's picture field showing the whole image; small shows the address with a file-choose button.
            UINodeEditor.Image when pin.Large => new ImageInputComponent().SetShape(UIImageInputShape.Picture).SetFit(UIImageFit.Contain),
            UINodeEditor.Image => Limited(new TextInputComponent().SetSize(UIInputSize.Small).SetTitlePlacement(UIInputTitlePlacement.Inside).SetTitle(pin.Title).SetTrailingAction(GlyphButton(UIGlyphs.MoreHorizontal, UIGraphWords.ChooseFile)), pin),
            UINodeEditor.List => ListRowEditor(pin),
            _ => null
        };

    // One row of a list, the field its element type asks for: a list of numbers is typed as numbers, not as text.
    private static IVisualComponent ListRowEditor(UINodePin pin)
    {
        // An array pin names its element after the prefix; a pin that takes several names the element itself.
        var element = pin.Type.StartsWith(UINodePinTypes.ArrayPrefix, StringComparison.Ordinal) ? pin.Type[UINodePinTypes.ArrayPrefix.Length..] : pin.Type;

        return element switch
        {
            UINodePinTypes.Number => Ranged(new NumberInputComponent().SetSize(UIInputSize.Small), pin),
            UINodePinTypes.Boolean => new CheckboxComponent().SetSize(UIInputSize.Small),
            UINodePinTypes.Date => new DateInputComponent().SetSize(UIInputSize.Small),
            UINodePinTypes.Time => new TimeInputComponent().SetSize(UIInputSize.Small),
            UINodePinTypes.DateAndTime => new DateTimeInputComponent().SetSize(UIInputSize.Small),
            _ when pin.Choices.Length > 0 => new SelectComponent().SetSize(UIInputSize.Small).SetOptions(Options(pin)),
            _ => Limited(new TextInputComponent().SetSize(UIInputSize.Small), pin)
        };
    }

    private static TComponent Limited<TComponent>(TComponent field, UINodePin pin)
        where TComponent : ITextLengthComponent
        => pin.MaxLength is int length and > 0 ? field.SetMaxLength(length) : field;

    // What the value is measured in stands inside the field after the value, where it cannot drift from the number it belongs to.
    private static TextInputComponent TextEditor(UINodePin pin)
    {
        TextInputComponent field = new TextInputComponent().SetSize(UIInputSize.Small).SetTitlePlacement(UIInputTitlePlacement.Inside).SetTitle(pin.Title);

        return string.IsNullOrWhiteSpace(pin.Unit) ? field : field.SetSuffixText(pin.Unit);
    }

    private static NumberInputComponent NumberEditor(UINodePin pin)
        => Ranged(new NumberInputComponent().SetSize(UIInputSize.Small).SetTitlePlacement(UIInputTitlePlacement.Inside).SetTitle(pin.Title), pin);

    // The pin's unit inside the field, and the range and step the pin's attributes give it.
    private static NumberInputComponent Ranged(NumberInputComponent field, UINodePin pin)
    {
        if (!string.IsNullOrWhiteSpace(pin.Unit))
            _ = field.SetSuffixText(pin.Unit);

        if (pin.Min is double min)
            _ = field.SetMin((decimal)min);

        if (pin.Max is double max)
            _ = field.SetMax((decimal)max);

        if (pin.Step is double step)
            _ = field.SetStep((decimal)step);

        return field;
    }

    private static SelectComponent ChoiceEditor(UINodePin pin)
        => new SelectComponent().SetSize(UIInputSize.Small).SetTitlePlacement(UIInputTitlePlacement.Inside).SetTitle(pin.Title).SetOptions(Options(pin));

    private static List<OptionItem> Options(UINodePin pin)
    {
        List<OptionItem> options = new(pin.Choices.Length);

        foreach (UIChoice choice in pin.Choices)
            options.Add(new OptionItem { Id = choice.Value, Title = choice.Caption });

        return options;
    }

    private static ButtonComponent GlyphButton(string icon, string tooltip)
        => new ButtonComponent()
            .SetType(UIButtonType.Ghost)
            .SetSize(UIButtonSize.Small)
            .SetIcon(icon)
            .SetTooltip(tooltip);
}

/// <summary>
/// A canvas of typed nodes the viewer wires together.
/// </summary>
public sealed class NodesComponent(string? id = null) : NodesComponent<NodesComponent>(id), IUIComponentDefinition
{
    /// <summary>
    /// Gets the component type key used to identify this component in the compiled graph.
    /// </summary>
    public static string ComponentTypeKey => "graph.canvas.nodes";
}
