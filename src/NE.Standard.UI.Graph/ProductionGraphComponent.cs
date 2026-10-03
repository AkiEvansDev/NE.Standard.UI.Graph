using System.Collections.Generic;
using NE.Standard.UI.Abstractions.Binding;
using NE.Standard.UI.Authoring.Components;
using NE.Standard.UI.Components.BuiltIns.Actions;
using NE.Standard.UI.Components.BuiltIns.Inputs;
using NE.Standard.UI.Components.BuiltIns.Models;
using NE.Standard.UI.Components.BuiltIns.Navigation;
using NE.Standard.UI.Primitives.Annotations;
using NE.Standard.UI.Primitives.Constants;
using NE.Standard.UI.Primitives.Styling;

namespace NE.Standard.UI.Graph;

/// <summary>A graph of resources and the crafts between them, laid out in layers.</summary>
/// <remarks>
/// A resource is a node; a craft that alone makes one resource is drawn on its edges, and every other craft is a junction. Items is
/// the bound collection of both; the value is the document of their placement and edits. Two uses distinguished by
/// <see cref="Mode"/>: the constructor, editing the catalogue, and the plan, where the viewer sets target amounts and the graph draws
/// the runs to reach them.
/// </remarks>
public abstract partial class ProductionGraphComponent<T> : LayeredGraphComponentBase<T, UIProductionDocument>, IBindableItemsComponent
    where T : ProductionGraphComponent<T>, IUIComponentDefinition
{
    private readonly List<UIProductionEntry> _items = [];

    protected ProductionGraphComponent(string? id = null) : base(id)
    {
        // A resource is its icon, its name standing under it: a production graph is read by its shapes before its captions.
        NodeShape = UIGraphNodeShape.Icon;

        PrependEntries(CanvasMenu, Entry(UIGraphCommands.AddNode, UIGraphWords.AddResource, UIGlyphs.Add), Separator());
        // Target and Brought in are a plan's, and stand in the menu only of a graph that plans.
        PrependEntries(NodeMenu, Entry(UIGraphCommands.CraftTime, UIGraphWords.CraftTime, UIGlyphs.Hourglass), Entry(UIGraphCommands.Target, UIGraphWords.Target, UIGlyphs.Flag), Entry(UIGraphCommands.Bought, UIGraphWords.Bought, UIGlyphs.Download, kind: UIMenuItemKind.Check));
        // An edge that is a whole recipe carries the run: what it takes, what it gives and how long it lasts are all edited on it.
        PrependEntries(EdgeMenu, Entry(UIGraphCommands.Amount, UIGraphWords.Takes, UIGlyphs.Numbers), Entry(UIGraphCommands.Output, UIGraphWords.Gives, UIGlyphs.PlusOne), Entry(UIGraphCommands.CraftTime, UIGraphWords.CraftTime, UIGlyphs.Hourglass));

        // A recipe drawn as its edges has no junction to drop a second ingredient on: a link dropped on what it makes asks which was meant.
        LinkMenu = new MenuComponent().AddItems([Entry(UIGraphCommands.LinkIngredient, UIGraphWords.LinkIngredient, UIGlyphs.Link), Entry(UIGraphCommands.LinkRecipe, UIGraphWords.LinkRecipe, UIGlyphs.NoteAdd)]);
        SetCanvasRegion(UIGraphMenus.Link, LinkMenu);

        // The plan panel's controls are the core's own fields, carried as regions: the engine reads and writes their values.
        PlanPeriod = PlanSelect(UIGraphWords.Period, (nameof(UIProductionPeriod.Once), UIGraphWords.PeriodOnce), (nameof(UIProductionPeriod.Minute), UIGraphWords.PeriodMinute), (nameof(UIProductionPeriod.Hour), UIGraphWords.PeriodHour));
        PlanObjective = PlanSelect(UIGraphWords.Objective, (nameof(UIProductionObjective.LeastRaw), UIGraphWords.LeastRaw), (nameof(UIProductionObjective.LeastTime), UIGraphWords.LeastTime), (nameof(UIProductionObjective.LeastCost), UIGraphWords.LeastCost));
        // Tonal, as a node's fields are: the picker's popup frames it.
        PickerSearch = new TextInputComponent()
            .SetType(UITextInputType.Search)
            .SetAppearance(UIInputAppearance.Tonal)
            .SetPrefixIcon(UIGlyphs.Search)
            .SetPlaceholder(UIGraphWords.SearchResources)
            .SetShowClearButton();

        SetCanvasRegion(UIGraphRegions.PlanPeriod, PlanPeriod);
        SetCanvasRegion(UIGraphRegions.PlanObjective, PlanObjective);
        SetCanvasRegion(UIGraphRegions.PlanAmount, new NumberInputComponent().SetSize(UIInputSize.Small).SetMin(0));
        SetCanvasRegion(UIGraphRegions.PlanRemove, new ButtonComponent().SetType(UIButtonType.Ghost).SetSize(UIButtonSize.Small).SetIcon(UIGlyphs.Close).SetTooltip(UIGraphWords.Remove));
        SetCanvasRegion(UIGraphRegions.PlanAdd, new ButtonComponent().SetType(UIButtonType.Ghost).SetSize(UIButtonSize.Small).SetIcon(UIGlyphs.Add).SetTitle(UIGraphWords.AddTarget));
        SetCanvasRegion(UIGraphRegions.PickerSearch, PickerSearch);
    }

    private static SelectComponent PlanSelect(string title, params (string Id, string Title)[] options)
    {
        List<OptionItem> items = new(options.Length);

        foreach ((var id, var word) in options)
            items.Add(new OptionItem { Id = id, Title = word });

        // Tonal: the plan panel on the canvas frames its fields, as a node does.
        return new SelectComponent().SetSize(UIInputSize.Small).SetAppearance(UIInputAppearance.Tonal).SetTitlePlacement(UIInputTitlePlacement.Inside).SetTitle(title).SetOptions(items);
    }

    /// <summary>
    /// Gets or sets which of its two uses the graph is put to: the catalogue read and edited, or a plan over it.
    /// </summary>
    [UIComponentProperty(DefaultValue = UIProductionMode.Constructor)]
    public UIProductionMode? Mode { get; set; }

    /// <summary>
    /// Gets the menu opened where a link is dropped on a resource one recipe already makes: another ingredient of it, or a new recipe.
    /// </summary>
    public MenuComponent LinkMenu { get; }

    /// <summary>
    /// Gets the plan panel's field for what the amounts are counted over.
    /// </summary>
    public SelectComponent PlanPeriod { get; }

    /// <summary>
    /// Gets the plan panel's field for what the plan makes least.
    /// </summary>
    public SelectComponent PlanObjective { get; }

    /// <summary>
    /// Gets the search field over the picker of resources to plan for.
    /// </summary>
    public TextInputComponent PickerSearch { get; }

    /// <summary>
    /// Gets the resources and the crafts, in one collection.
    /// </summary>
    [UIComponentProperty(Contract = typeof(IItemsComponent), DefaultValue = null, GenerateSetter = false)]
    public IReadOnlyList<UIProductionEntry>? Items => _items;

    /// <inheritdoc/>
    IReadOnlyList<object?> IBindableItemsComponent.Items => _items;

    /// <summary>
    /// Sets the resources and crafts the graph shows when they are not bound.
    /// </summary>
    public T SetItems(IEnumerable<UIProductionEntry> items)
    {
        ReplaceItems(_items, items);
        return Self;
    }
}

/// <summary>
/// A graph of resources and the crafts between them, laid out in layers.
/// </summary>
public sealed class ProductionGraphComponent(string? id = null) : ProductionGraphComponent<ProductionGraphComponent>(id), IUIComponentDefinition
{
    /// <inheritdoc/>
    public static string ComponentTypeKey => "graph.canvas.production";
}
