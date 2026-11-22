using System;
using System.Collections.Generic;
using NE.Standard.UI.Abstractions.Items;
using NE.Standard.UI.Abstractions.Styling;
using NE.Standard.UI.Authoring.Components;
using NE.Standard.UI.Components.BuiltIns.Actions;
using NE.Standard.UI.Components.BuiltIns.Inputs;
using NE.Standard.UI.Components.BuiltIns.Navigation;
using NE.Standard.UI.Primitives.Annotations;
using NE.Standard.UI.Primitives.Constants;
using NE.Standard.UI.Primitives.Styling;

namespace NE.Standard.UI.Graph;

/// <summary>
/// A canvas of typed nodes the viewer wires together; node kinds are the application's own classes. The value is the whole
/// document, committed by a save.
/// </summary>
public abstract partial class NodesComponent<T> : GraphCanvasComponentBase<T, UINodeDocument>, IConfigurationValidatedComponent
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

        // The core's own field, not an input of the package's: its clear button and its focus ring; Filled, since the picker's
        // popup frames it.
        PickerSearch = new TextInputComponent()
            .SetAppearance(UIInputAppearance.Filled)
            .SetSearch(UIGraphWords.SearchKinds);

        SetCanvasRegion(UIGraphRegions.PickerSearch, PickerSearch);
        SetCanvasRegion(UIGraphRegions.ListRemove, GlyphButton(UIGlyphs.Close, UIGraphWords.Remove));
        SetCanvasRegion(UIGraphRegions.ListAdd, GlyphButton(UIGlyphs.Add, UIGraphWords.AddValue));
        SetCanvasRegion(UIGraphRegions.StateReset, GlyphButton(UIGlyphs.Restart, UIGraphWords.ResetState));
        RegisterEditorRegions();
    }

    // One canonical template per editor shape, parameterized on each clone from UINodePin metadata so runtime BindCatalog updates
    // need no re-render of <template> elements. Placeholder text "—" keeps label/placeholder DOM hooks active while AsContent marks
    // every catalogue-supplied string as plain text rather than a localization key.
    private void RegisterEditorRegions()
    {
        SetCanvasRegion(UIGraphRegions.EditorText, new TextInputComponent().SetSize(UISize.Small).SetAppearance(UIInputAppearance.Underline).SetTitlePlacement(UIInputTitlePlacement.Inside).SetTitle("—").AsContent(ITextBaseComponent.TitleProperty).SetPlaceholder("—").AsContent(IPlaceholderInputComponent.PlaceholderProperty).AsContent(IAffixTextInputComponent.SuffixTextProperty));
        SetCanvasRegion(UIGraphRegions.EditorTextArea, new TextAreaComponent().SetSize(UISize.Small).SetAppearance(UIInputAppearance.Filled).SetResize(UITextAreaResizeMode.None).SetAccessibleName("—").AsContent(IAccessibleNameComponent.AccessibleNameProperty).SetPlaceholder("—").AsContent(IPlaceholderInputComponent.PlaceholderProperty));
        SetCanvasRegion(UIGraphRegions.EditorNumber, new NumberInputComponent().SetSize(UISize.Small).SetAppearance(UIInputAppearance.Underline).SetTitlePlacement(UIInputTitlePlacement.Inside).SetTitle("—").AsContent(ITextBaseComponent.TitleProperty).SetPlaceholder("—").AsContent(IPlaceholderInputComponent.PlaceholderProperty).AsContent(IAffixTextInputComponent.SuffixTextProperty));
        SetCanvasRegion(UIGraphRegions.EditorBoolean, new CheckboxComponent().SetSize(UISize.Small).SetAccessibleName("—").AsContent(IAccessibleNameComponent.AccessibleNameProperty));
        SetCanvasRegion(UIGraphRegions.EditorChoice, new SelectComponent().SetSize(UISize.Small).SetAppearance(UIInputAppearance.Underline).SetTitlePlacement(UIInputTitlePlacement.Inside).SetTitle("—").AsContent(ITextBaseComponent.TitleProperty).AsContent(IPlaceholderInputComponent.PlaceholderProperty));
        SetCanvasRegion(UIGraphRegions.EditorDate, new DateInputComponent().SetSize(UISize.Small).SetAppearance(UIInputAppearance.Underline).SetTitlePlacement(UIInputTitlePlacement.Inside).SetTitle("—").AsContent(ITextBaseComponent.TitleProperty));
        SetCanvasRegion(UIGraphRegions.EditorTime, new TimeInputComponent().SetSize(UISize.Small).SetAppearance(UIInputAppearance.Underline).SetTitlePlacement(UIInputTitlePlacement.Inside).SetTitle("—").AsContent(ITextBaseComponent.TitleProperty));
        SetCanvasRegion(UIGraphRegions.EditorDateTime, new DateTimeInputComponent().SetSize(UISize.Small).SetAppearance(UIInputAppearance.Underline).SetTitlePlacement(UIInputTitlePlacement.Inside).SetTitle("—").AsContent(ITextBaseComponent.TitleProperty));
        SetCanvasRegion(UIGraphRegions.EditorImage, new TextInputComponent().SetSize(UISize.Small).SetAppearance(UIInputAppearance.Underline).SetTitlePlacement(UIInputTitlePlacement.Inside).SetTitle("—").AsContent(ITextBaseComponent.TitleProperty).SetPlaceholder("—").AsContent(IPlaceholderInputComponent.PlaceholderProperty).SetTrailingAction(GlyphButton(UIGlyphs.MoreHorizontal, UIGraphWords.ChooseFile)));
        SetCanvasRegion(UIGraphRegions.EditorImageLarge, new ImageInputComponent().SetAppearance(UIInputAppearance.Filled).SetVariant(UIImageInputVariant.Picture).SetFit(UIImageFit.Contain).SetAccessibleName("—").AsContent(IAccessibleNameComponent.AccessibleNameProperty));
        SetCanvasRegion(UIGraphRegions.EditorListText, new TextInputComponent().SetSize(UISize.Small).SetAppearance(UIInputAppearance.Underline).SetAccessibleName("—").AsContent(IAccessibleNameComponent.AccessibleNameProperty).SetPlaceholder("—").AsContent(IPlaceholderInputComponent.PlaceholderProperty));
        SetCanvasRegion(UIGraphRegions.EditorListNumber, new NumberInputComponent().SetSize(UISize.Small).SetAppearance(UIInputAppearance.Underline).SetAccessibleName("—").AsContent(IAccessibleNameComponent.AccessibleNameProperty).SetPlaceholder("—").AsContent(IPlaceholderInputComponent.PlaceholderProperty).AsContent(IAffixTextInputComponent.SuffixTextProperty));
        SetCanvasRegion(UIGraphRegions.EditorListChoice, new SelectComponent().SetSize(UISize.Small).SetAppearance(UIInputAppearance.Underline).SetAccessibleName("—").AsContent(IAccessibleNameComponent.AccessibleNameProperty).AsContent(IPlaceholderInputComponent.PlaceholderProperty));
        SetCanvasRegion(UIGraphRegions.EditorListDate, new DateInputComponent().SetSize(UISize.Small).SetAppearance(UIInputAppearance.Underline).SetAccessibleName("—").AsContent(IAccessibleNameComponent.AccessibleNameProperty));
        SetCanvasRegion(UIGraphRegions.EditorListTime, new TimeInputComponent().SetSize(UISize.Small).SetAppearance(UIInputAppearance.Underline).SetAccessibleName("—").AsContent(IAccessibleNameComponent.AccessibleNameProperty));
        SetCanvasRegion(UIGraphRegions.EditorListDateTime, new DateTimeInputComponent().SetSize(UISize.Small).SetAppearance(UIInputAppearance.Underline).SetAccessibleName("—").AsContent(IAccessibleNameComponent.AccessibleNameProperty));
    }

    private static ButtonComponent GlyphButton(string icon, string tooltip)
        => new ButtonComponent().SetVariant(UIButtonVariant.Ghost).SetSize(UISize.Small).SetIcon(icon).SetTooltip(tooltip);

    /// <summary>
    /// Gets the search field over the node picker's catalogue.
    /// </summary>
    public TextInputComponent PickerSearch { get; }

    /// <summary>
    /// Gets or sets the node kinds the picker offers and a saved document is read back through.
    /// </summary>
    [UIComponentProperty(GenerateSetter = false, DefaultValue = null)]
    public UINodeCatalog? Catalog { get; set; }

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

    /// <summary>
    /// Gets or sets the runtime choice lists for inputs carrying <see cref="GraphInputAttribute.ChoicesKey"/>, keyed by that key.
    /// </summary>
    [UIComponentProperty(DefaultValue = null)]
    public IReadOnlyDictionary<string, IReadOnlyList<UIChoice>>? PinChoices { get; set; }

    /// <summary>
    /// Gets or sets the largest picture file taken by an image pin on this canvas, in bytes, unless the pin sets its own
    /// <see cref="GraphInputAttribute.MaxFileSize"/>; the client refuses a larger file before uploading it.
    /// </summary>
    [UIComponentProperty(GenerateSetter = false, DefaultValue = null)]
    public long? MaxImageSize { get; set; }

    /// <inheritdoc cref="SetCatalog(UINodeCatalog)"/>
    public T SetCatalog(params Type[] nodeTypes)
        => SetCatalog(UINodeCatalog.FromTypes(nodeTypes));

    /// <summary>
    /// Sets the node kinds, read off the application's own classes.
    /// </summary>
    public T SetCatalog(UINodeCatalog catalog)
    {
        ArgumentNullException.ThrowIfNull(catalog);

        RemoveNonOptionalBinding(CatalogProperty);
        Catalog = catalog;
        return Self;
    }

    /// <summary>
    /// Sets the largest picture file taken by an image pin on this canvas, in bytes, when the pin sets no limit of its own.
    /// </summary>
    public T SetMaxImageSize(long? maxImageSize)
    {
        if (maxImageSize is long size)
            ArgumentOutOfRangeException.ThrowIfNegativeOrZero(size, nameof(maxImageSize));

        RemoveNonOptionalBinding(MaxImageSizeProperty);
        MaxImageSize = maxImageSize;
        return Self;
    }

    /// <inheritdoc/>
    public void ValidateConfiguration()
    {
        if (MaxImageSize is long size)
            ArgumentOutOfRangeException.ThrowIfNegativeOrZero(size, nameof(MaxImageSize));
    }
}

/// <summary>
/// A canvas of typed nodes the viewer wires together.
/// </summary>
public sealed class NodesComponent(string? id = null) : NodesComponent<NodesComponent>(id), IUIComponentDefinition
{
    /// <inheritdoc/>
    public static string ComponentTypeKey => "graph.canvas.nodes";
}
