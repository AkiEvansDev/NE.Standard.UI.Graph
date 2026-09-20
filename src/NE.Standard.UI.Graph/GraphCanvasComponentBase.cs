using System;
using System.Collections.Generic;
using NE.Standard.UI.Abstractions.Styling;
using NE.Standard.UI.Authoring.Components;
using NE.Standard.UI.Components.BuiltIns.Models;
using NE.Standard.UI.Components.BuiltIns.Navigation;
using NE.Standard.UI.Components.Foundation.Inputs;
using NE.Standard.UI.Primitives.Annotations;
using NE.Standard.UI.Primitives.Styling;

namespace NE.Standard.UI.Graph;

/// <summary>
/// The base for a canvas component whose value is the whole document, committed by a save. Provides the view settings, menus and
/// colour choices every kind of canvas shares — item drawing is the kind's own.
/// </summary>
public abstract partial class GraphCanvasComponentBase<T, TDocument> : InputComponentBase<T, TDocument>, IGraphCanvasComponent, IRegionContainerComponent
    where T : GraphCanvasComponentBase<T, TDocument>, IUIComponentDefinition
{
    // The theme's own series, named for the hues the default theme gives them: an application whose theme paints them otherwise
    // names its own with SetColorChoices.
    private static readonly UIGraphColorChoice[] DefaultColorChoices =
    [
        new("Blue", "var(--ui-color-series-1)"),
        new("Amber", "var(--ui-color-series-2)"),
        new("Green", "var(--ui-color-series-3)"),
        new("Rose", "var(--ui-color-series-4)"),
        new("Purple", "var(--ui-color-series-5)"),
        new("Cyan", "var(--ui-color-series-6)"),
        new("Bronze", "var(--ui-color-series-7)"),
        new("Fern", "var(--ui-color-series-8)")
    ];

    // Every entry the package put in any of its menus, so SetCommandIcon dresses a command wherever it stands.
    private readonly List<MenuItem> _builtIn = [];
    private readonly Dictionary<string, IVisualComponent> _regions;

    protected GraphCanvasComponentBase(string? id = null) : base(id)
    {
        // Icons come from an application's registered pack — SetCommandIcon assigns them; none are built in.
        // The corner menu: folds to its switch, opens over the sheet.
        Menu = new MenuComponent()
            .SetShowCollapseToggle(true)
            .SetExpanded(false)
            .SetMinWidth(UILayoutLength.Absolute(220))
            .AddItems(
            [
                Entry(UIGraphCommands.Arrange, "Arrange"),
                Entry(UIGraphCommands.Fit, "Fit to content"),
                Separator(),
                Entry(UIGraphCommands.Save, "Save", "Ctrl+S")
            ]);

        // What a right press on the empty surface offers is editing the sheet: a run or a save is the corner menu's.
        CanvasMenu = new MenuComponent().AddItems(
        [
            Entry(UIGraphCommands.GroupSelection, "Group selection"),
            Entry(UIGraphCommands.DeleteSelection, "Delete selection"),
            Separator(),
            Entry(UIGraphCommands.Arrange, "Arrange"),
            Entry(UIGraphCommands.Fit, "Fit to content")
        ]);

        ColorChoices = DefaultColorChoices;
        NodeMenu = new MenuComponent().AddItems(ItemEntries());
        GroupMenu = new MenuComponent().AddItems(ItemEntries());

        _regions = new Dictionary<string, IVisualComponent>(StringComparer.Ordinal)
        {
            [UIGraphMenus.Main] = Menu,
            [UIGraphMenus.Node] = NodeMenu,
            [UIGraphMenus.Group] = GroupMenu
        };

        // The canvas's own menu, so an application appends to it rather than replacing it; SetContextMenu still overrides it whole.
        _ = SetContextMenu(CanvasMenu);
    }

    /// <summary>
    /// Gets the menu in the canvas's leading corner: whole-sheet commands like arrange, fit and save, plus whatever the application
    /// appends.
    /// </summary>
    /// <remarks>
    /// Application entries append after the fixed ones via <see cref="AddMenuEntries"/> (and the sibling Add*MenuEntries methods); a
    /// click on one raises <see cref="GraphEvents.MenuEntry"/>, naming the entry and what the menu was opened on.
    /// </remarks>
    public MenuComponent Menu { get; }

    /// <summary>
    /// Gets the menu the right button opens on the canvas's empty surface — the commands that edit the sheet.
    /// </summary>
    public MenuComponent CanvasMenu { get; }

    /// <summary>
    /// Gets the menu the right button opens on an item: pin, rename and colour.
    /// </summary>
    public MenuComponent NodeMenu { get; }

    /// <summary>
    /// Gets the menu the right button opens on a group's band: pin, rename and colour.
    /// </summary>
    public MenuComponent GroupMenu { get; }

    /// <summary>
    /// Gets the colours an item's or a group's menu offers, in their order.
    /// </summary>
    /// <remarks>Render-time only: the choices are how the menus are built.</remarks>
    [UIComponentProperty(Contract = typeof(IGraphCanvasComponent), IsBindable = false, GenerateBinder = false, GenerateSetter = false, DefaultValue = null)]
    public UIGraphColorChoice[]? ColorChoices { get; private set; }

    /// <summary>
    /// Gets the menus and the kind's own parts the canvas carries as regions, by the names <see cref="UIGraphMenus"/> and the kind
    /// give them.
    /// </summary>
    public IReadOnlyDictionary<string, IVisualComponent> Regions => _regions;

    /// <inheritdoc/>
    public bool HasRegions => true;

    /// <summary>
    /// Gets or sets the shape every edge is drawn in: stepped unless told otherwise, on every kind of canvas.
    /// </summary>
    [UIComponentProperty(Contract = typeof(IGraphCanvasComponent), DefaultValue = UIGraphEdgeShape.Orthogonal)]
    public UIGraphEdgeShape? EdgeShape { get; set; }

    /// <summary>
    /// Gets or sets the step of the grid behind the canvas, in canvas units.
    /// </summary>
    [UIComponentProperty(Contract = typeof(IGraphCanvasComponent), DefaultValue = 20d, GenerateSetter = false)]
    public double? GridSize { get; set; }

    /// <summary>
    /// Gets or sets whether the grid is drawn.
    /// </summary>
    [UIComponentProperty(Contract = typeof(IGraphCanvasComponent), DefaultValue = true)]
    public bool? ShowGrid { get; set; }

    /// <summary>
    /// Gets or sets whether the canvas shows a ring when it takes the keyboard.
    /// </summary>
    [UIComponentProperty(Contract = typeof(IGraphCanvasComponent), DefaultValue = false)]
    public bool? ShowFocusRing { get; set; }

    /// <summary>
    /// Gets or sets whether the canvas draws <see cref="Menu"/> in its leading corner, for input without a right button.
    /// </summary>
    [UIComponentProperty(Contract = typeof(IGraphCanvasComponent), DefaultValue = true)]
    public bool? ShowMenuButton { get; set; }

    /// <summary>
    /// Gets or sets whether the canvas draws a pressable overview map of the whole sheet in its corner, with the visible part marked.
    /// Off by default.
    /// </summary>
    [UIComponentProperty(Contract = typeof(IGraphCanvasComponent), DefaultValue = false)]
    public bool? ShowMinimap { get; set; }

    /// <summary>
    /// Gets or sets whether hovering an item highlights what it connects to, dimming everything else. Off by default here; a layered
    /// graph turns it on.
    /// </summary>
    [UIComponentProperty(Contract = typeof(IGraphCanvasComponent), DefaultValue = false)]
    public bool? HighlightOnHover { get; set; }

    /// <summary>
    /// Gets or sets whether a moved item's position, and a node's size on the node canvas, snap to the grid step. On by default.
    /// </summary>
    [UIComponentProperty(Contract = typeof(IGraphCanvasComponent), DefaultValue = true)]
    public bool? SnapToGrid { get; set; }

    /// <summary>
    /// Gets or sets how far the canvas may be zoomed out.
    /// </summary>
    [UIComponentProperty(Contract = typeof(IGraphCanvasComponent), DefaultValue = 0.25d, GenerateSetter = false)]
    public double? MinZoom { get; set; }

    /// <summary>
    /// Gets or sets how far the canvas may be zoomed in.
    /// </summary>
    [UIComponentProperty(Contract = typeof(IGraphCanvasComponent), DefaultValue = 2.5d, GenerateSetter = false)]
    public double? MaxZoom { get; set; }

    /// <summary>
    /// Gets or sets the least height the canvas stands at, in rem; a canvas given a height of its own — a fill — grows past it.
    /// </summary>
    [UIComponentProperty(Contract = typeof(IGraphCanvasComponent), DefaultValue = 32d, GenerateSetter = false)]
    public double? CanvasHeight { get; set; }

    /// <summary>
    /// Appends an entry to the corner menu, under the built-in commands.
    /// </summary>
    public T AddMenuEntry(MenuItem entry)
    {
        ArgumentNullException.ThrowIfNull(entry);

        _ = Menu.AddItems([entry]);
        return Self;
    }

    /// <summary>
    /// Appends a separator and then the given entries to the corner menu.
    /// </summary>
    public T AddMenuEntries(params MenuItem[] entries)
        => AppendEntries(Menu, entries);

    /// <summary>
    /// Appends a separator and then the given entries to the menu the right button opens on the empty surface.
    /// </summary>
    public T AddContextMenuEntries(params MenuItem[] entries)
        => AppendEntries(CanvasMenu, entries);

    /// <summary>
    /// Appends a separator and then the given entries to the menu the right button opens on an item; the command hears which item.
    /// </summary>
    public T AddNodeMenuEntries(params MenuItem[] entries)
        => AppendEntries(NodeMenu, entries);

    /// <summary>
    /// Appends a separator and then the given entries to the menu the right button opens on a group's band; the command hears which group.
    /// </summary>
    public T AddGroupMenuEntries(params MenuItem[] entries)
        => AppendEntries(GroupMenu, entries);

    /// <summary>The application's entries under a menu's fixed ones, a rule between them.</summary>
    protected T AppendEntries(MenuComponent menu, MenuItem[] entries)
    {
        ArgumentNullException.ThrowIfNull(entries);

        if (entries.Length == 0)
            return Self;

        _ = menu.AddItems([Separator()]);
        _ = menu.AddItems(entries);

        return Self;
    }

    /// <summary>
    /// Dresses the canvas's own entries of one command with an icon, in every menu that has it — see <see cref="UIGraphCommands"/>
    /// for the keys.
    /// </summary>
    public T SetCommandIcon(string command, string icon)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(command);
        ArgumentException.ThrowIfNullOrWhiteSpace(icon);

        var found = false;

        foreach (MenuItem entry in _builtIn)
        {
            if (string.Equals(entry.Id, command, StringComparison.Ordinal))
            {
                entry.Icon = icon;
                found = true;
            }
        }

        return found ? Self : throw new ArgumentException($"'{command}' is not one of the canvas's own menu entries.", nameof(command));
    }

    /// <summary>
    /// Sets the colours an item's or a group's menu offers in place of the theme's series; the first choice, taking the colour away,
    /// stays ahead of them.
    /// </summary>
    public T SetColorChoices(params UIGraphColorChoice[] choices)
    {
        ArgumentNullException.ThrowIfNull(choices);

        foreach (UIGraphColorChoice choice in choices)
        {
            ArgumentNullException.ThrowIfNull(choice);
            ArgumentException.ThrowIfNullOrWhiteSpace(choice.Title);
            ArgumentException.ThrowIfNullOrWhiteSpace(choice.Color);
        }

        ColorChoices = [.. choices];

        foreach (MenuItem entry in _builtIn)
        {
            if (string.Equals(entry.Id, UIGraphCommands.Color, StringComparison.Ordinal))
                FillColorChoices(entry);
        }

        return Self;
    }

    /// <summary>
    /// Sets the step of the grid behind the canvas.
    /// </summary>
    public T SetGridSize(double gridSize)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(gridSize);

        GridSize = gridSize;
        return Self;
    }

    /// <summary>
    /// Sets how far the canvas may be zoomed out and in.
    /// </summary>
    public T SetZoomRange(double minZoom, double maxZoom)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(minZoom);
        ArgumentOutOfRangeException.ThrowIfLessThanOrEqual(maxZoom, minZoom);

        MinZoom = minZoom;
        MaxZoom = maxZoom;

        return Self;
    }

    /// <summary>
    /// Sets the least height the canvas stands at, in rem.
    /// </summary>
    public T SetCanvasHeight(double canvasHeight)
    {
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(canvasHeight);

        CanvasHeight = canvasHeight;
        return Self;
    }

    /// <summary>
    /// Rounds a moved item's position to the grid's step.
    /// </summary>
    public T SetSnapToGrid()
        => SetSnapToGrid(true);

    /// <summary>A built-in entry a kind puts ahead of the shared ones in a menu, as the node canvas puts Add node.</summary>
    protected void PrependEntries(MenuComponent menu, params MenuItem[] entries)
    {
        ArgumentNullException.ThrowIfNull(menu);
        ArgumentNullException.ThrowIfNull(entries);

        _ = menu.SetItems([.. entries, .. menu.Items ?? []]);
    }

    /// <summary>A part the kind carries as a region of the canvas, under a name its renderer reads it by.</summary>
    protected void SetCanvasRegion(string name, IVisualComponent component)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentNullException.ThrowIfNull(component);

        _regions[name] = component;
    }

    /// <summary>Takes out every region whose name starts with the prefix — a kind's templates about to be built again.</summary>
    protected void RemoveCanvasRegions(string prefix)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(prefix);

        List<string> previous = [];

        foreach (var name in _regions.Keys)
        {
            if (name.StartsWith(prefix, StringComparison.Ordinal))
                previous.Add(name);
        }

        foreach (var name in previous)
            _ = _regions.Remove(name);
    }

    /// <summary>What an item's menu and a group's menu both hold — built once for each, since an entry stands in one menu only.</summary>
    private MenuItem[] ItemEntries()
    {
        MenuItem color = Entry(UIGraphCommands.Color, "Color", kind: UIMenuItemKind.Select);

        FillColorChoices(color);

        return
        [
            Entry(UIGraphCommands.Pin, "Pinned", kind: UIMenuItemKind.Check),
            Entry(UIGraphCommands.Rename, "Rename"),
            color
        ];
    }

    /// <summary>The colour entry's choices: the colour taken away first, then each choice — checks the engine marks as the menu opens.</summary>
    private void FillColorChoices(MenuItem color)
    {
        color.Items.Clear();
        color.Items.Add(new MenuItem { Id = UIGraphCommands.DefaultColor, Title = "Default", Kind = UIMenuItemKind.Check });

        UIGraphColorChoice[] choices = ColorChoices ?? [];

        for (var index = 0; index < choices.Length; index++)
            color.Items.Add(new MenuItem { Id = UIGraphCommands.ColorChoice(index), Title = choices[index].Title, Kind = UIMenuItemKind.Check });
    }

    /// <summary>One of the canvas's own menu entries, remembered so SetCommandIcon can dress it.</summary>
    protected MenuItem Entry(string key, string title, string? shortcut = null, UIMenuItemKind kind = UIMenuItemKind.Item)
    {
        MenuItem entry = new() { Id = key, Title = title, Shortcut = shortcut, Kind = kind };

        _builtIn.Add(entry);
        return entry;
    }

    protected static MenuItem Separator()
        => new() { Id = Guid.NewGuid().ToString("N"), Kind = UIMenuItemKind.Separator };
}
