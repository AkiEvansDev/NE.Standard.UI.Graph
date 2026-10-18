using System;
using System.Collections.Generic;
using NE.Standard.UI.Abstractions.Items;
using NE.Standard.UI.Abstractions.Styling;
using NE.Standard.UI.Authoring.BuiltIns;
using NE.Standard.UI.Authoring.Components;
using NE.Standard.UI.Components.BuiltIns.Actions;
using NE.Standard.UI.Components.BuiltIns.Inputs;
using NE.Standard.UI.Components.BuiltIns.Models;
using NE.Standard.UI.Components.BuiltIns.Navigation;
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
        // A reroute is a shape of the sheet, not a kind to look for: its own entry, not a line of the picker. It closes the adding
        // block, after Add group and ahead of the rule over Group selection.
        PrependEntries(CanvasMenu, Entry(UIGraphCommands.AddNode, UIGraphWords.AddNode, UIGlyphs.Add));
        InsertAhead(CanvasMenu, UIGraphCommands.GroupSelection, Entry(UIGraphCommands.AddReroute, UIGraphWords.AddReroute, UIGlyphs.Route));
        PrependEntries(EdgeMenu, Entry(UIGraphCommands.AddReroute, UIGraphWords.AddReroute, UIGlyphs.Route));
        // What a run makes of a node: off for the run, its values as a new node's; the state's own reset shown only on a node whose
        // kind keeps one, since a hidden state has no reset button of its own.
        AddNodeEntry(Entry(UIGraphCommands.Disable, UIGraphWords.Disabled, UIGlyphs.Block, kind: UIMenuItemKind.Check));
        // A group's Disable acts on the nodes standing in its frame as the menu opens, never on the frame: membership is geometry the
        // server does not keep, so a group carries no state of its own a run could read.
        InsertAhead(GroupMenu, UIGraphCommands.Color, Entry(UIGraphCommands.Disable, UIGraphWords.Disabled, UIGlyphs.Block, kind: UIMenuItemKind.Check), Separator());
        AddNodeEntry(Entry(UIGraphCommands.ResetValues, UIGraphWords.ResetValues, UIGlyphs.Restart));
        AddNodeEntry(Entry(UIGraphCommands.ResetState, UIGraphWords.ResetNodeState, UIGlyphs.Restart));

        // A pin's row opens its own menu over the node's; the engine shows and enables each entry for the pin as it opens.
        MenuComponent pinMenu = new MenuComponent().AddItems(
        [
            Entry(UIGraphCommands.AddParameter, UIGraphWords.AddParameter, UIGlyphs.Add),
            Entry(UIGraphCommands.RemoveParameter, UIGraphWords.RemoveParameter, UIGlyphs.Remove),
            Entry(UIGraphCommands.ResetPin, UIGraphWords.ResetPin, UIGlyphs.Restart)
        ]);

        SetCanvasRegion(UIGraphMenus.Pin, pinMenu);

        // The core's own field, not an input of the package's: its clear button and its focus ring; Tonal, since the picker's
        // popup frames it, as a node frames its fields.
        PickerSearch = new TextInputComponent()
            .SetAppearance(UIInputAppearance.Tonal)
            .SetSearch(UIGraphWords.SearchKinds);

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

    /// <summary>Gets or sets whether a run's progress is drawn as a line along the canvas's top.</summary>
    /// <remarks>
    /// Needs <see cref="SetRunProgressEffect"/>s pushed by the runner, and shows from the first run on; its room along the top stays
    /// clear before it, so the corner's chrome and a fit do not move when it appears.
    /// </remarks>
    [UIComponentProperty(DefaultValue = true)]
    public bool? ShowRunProgress { get; set; }

    /// <summary>
    /// Gets or sets whether the canvas carries Run, Run all and Stop in its top corner.
    /// </summary>
    /// <remarks>
    /// Run and Run all save under a run's reason (<see cref="UIGraphArguments.RunReason"/>) for <see cref="UINodeRuns"/>; Stop
    /// raises <see cref="GraphEvents.RunStop"/>.
    /// </remarks>
    [UIComponentProperty(DefaultValue = false)]
    public bool? ShowRunPanel { get; set; }

    /// <summary>
    /// Gets or sets the corners of the canvas's nodes; unset, the theme's card radius, and <c>UICornerRadius.Uniform(0)</c> squares them.
    /// </summary>
    /// <remarks>A node's head and its chosen ring follow each corner, as a group's frame does; a reroute, unset, keeps a button's smaller one.</remarks>
    [UIComponentProperty(DefaultValue = null)]
    public UICornerRadius? NodeCornerRadius { get; set; }

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
                // A field keeps the default Tonal, the fill alone: a node frames its fields itself, and a Filled field's line would
                // only add weight there.
                if (CreateEditor(pin) is not IVisualComponent editor)
                    continue;

                SetCanvasRegion(UIGraphRegions.Editor(type.Key, pin.Name), editor);
            }
        }
    }

    // A field that fits one line keeps its caption inside the box; one too tall for a line has the node draw the caption above it.
    // The pin's caption, unit and choices are the catalogue's text, the application's own like a node's name: shown as written.
    private static IVisualComponent? CreateEditor(UINodePin pin)
        => pin.Editor switch
        {
            // Not resizable itself: it fills the node's height, and the node's corner sizes both on the grid.
            UINodeEditor.Text when pin.MaxLines > 1 => Limited(new TextAreaComponent().SetRows(pin.MaxLines.Value).SetSize(UIInputSize.Small).SetResize(UITextAreaResizeMode.None), pin),
            UINodeEditor.Text => Limited(TextEditor(pin), pin),
            UINodeEditor.Number => NumberEditor(pin),
            UINodeEditor.Boolean => new CheckboxComponent().SetSize(UIInputSize.Small),
            UINodeEditor.Choice => ChoiceEditor(pin),
            UINodeEditor.Date => new DateInputComponent().SetSize(UIInputSize.Small).SetTitlePlacement(UIInputTitlePlacement.Inside).SetTitle(pin.Title).AsContent(ITextBaseComponent.TitleProperty),
            UINodeEditor.Time => new TimeInputComponent().SetSize(UIInputSize.Small).SetTitlePlacement(UIInputTitlePlacement.Inside).SetTitle(pin.Title).AsContent(ITextBaseComponent.TitleProperty),
            UINodeEditor.DateTime => new DateTimeInputComponent().SetSize(UIInputSize.Small).SetTitlePlacement(UIInputTitlePlacement.Inside).SetTitle(pin.Title).AsContent(ITextBaseComponent.TitleProperty),
            // Large draws the framework's picture field showing the whole image; small shows the address with a file-choose button.
            UINodeEditor.Image when pin.Large => new ImageInputComponent().SetVariant(UIImageInputVariant.Picture).SetFit(UIImageFit.Contain),
            UINodeEditor.Image => Limited(new TextInputComponent().SetSize(UIInputSize.Small).SetTitlePlacement(UIInputTitlePlacement.Inside).SetTitle(pin.Title).AsContent(ITextBaseComponent.TitleProperty).SetTrailingAction(GlyphButton(UIGlyphs.MoreHorizontal, UIGraphWords.ChooseFile)), pin),
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
        TextInputComponent field = new TextInputComponent().SetSize(UIInputSize.Small).SetTitlePlacement(UIInputTitlePlacement.Inside).SetTitle(pin.Title).AsContent(ITextBaseComponent.TitleProperty);

        return string.IsNullOrWhiteSpace(pin.Unit) ? field : field.SetSuffixText(pin.Unit).AsContent(IAffixTextInputComponent.SuffixTextProperty);
    }

    private static NumberInputComponent NumberEditor(UINodePin pin)
        => Ranged(new NumberInputComponent().SetSize(UIInputSize.Small).SetTitlePlacement(UIInputTitlePlacement.Inside).SetTitle(pin.Title).AsContent(ITextBaseComponent.TitleProperty), pin);

    // The pin's unit inside the field, and the range and step the pin's attributes give it.
    private static NumberInputComponent Ranged(NumberInputComponent field, UINodePin pin)
    {
        if (!string.IsNullOrWhiteSpace(pin.Unit))
            _ = field.SetSuffixText(pin.Unit).AsContent(IAffixTextInputComponent.SuffixTextProperty);

        if (pin.Min is double min)
            _ = field.SetMin((decimal)min);

        if (pin.Max is double max)
            _ = field.SetMax((decimal)max);

        if (pin.Step is double step)
            _ = field.SetStep((decimal)step);

        return field;
    }

    private static SelectComponent ChoiceEditor(UINodePin pin)
        => new SelectComponent().SetSize(UIInputSize.Small).SetTitlePlacement(UIInputTitlePlacement.Inside).SetTitle(pin.Title).AsContent(ITextBaseComponent.TitleProperty).SetOptions(Options(pin));

    private static List<OptionItem> Options(UINodePin pin)
    {
        List<OptionItem> options = new(pin.Choices.Length);

        foreach (UIChoice choice in pin.Choices)
            options.Add(new OptionItem { Id = choice.Value, Title = choice.Caption, IsContent = true });

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
    /// <inheritdoc/>
    public static string ComponentTypeKey => "graph.canvas.nodes";
}
