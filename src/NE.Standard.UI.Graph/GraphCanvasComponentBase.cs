using System;
using System.Collections.Generic;
using NE.Standard.UI.Abstractions.Styling;
using NE.Standard.UI.Authoring.BuiltIns.Models;
using NE.Standard.UI.Authoring.Components;
using NE.Standard.UI.Components.BuiltIns.Models;
using NE.Standard.UI.Components.BuiltIns.Navigation;
using NE.Standard.UI.Components.Foundation.Inputs;
using NE.Standard.UI.Primitives.Annotations;
using NE.Standard.UI.Primitives.Constants;
using NE.Standard.UI.Primitives.Styling;

namespace NE.Standard.UI.Graph;

/// <summary>The base for a canvas component whose value is the whole document, committed by a save.</summary>
/// <remarks>Provides the view settings, menus and colour choices every kind of canvas shares; item drawing is the kind's own.</remarks>
public abstract partial class GraphCanvasComponentBase<T, TDocument> : InputComponentBase<T, TDocument>, IGraphCanvasComponent, IRegionContainerComponent
    where T : GraphCanvasComponentBase<T, TDocument>, IUIComponentDefinition
{
    // The theme's own series, named for the hues the default theme gives them: an application whose theme paints them otherwise
    // names its own with SetColorChoices.
    private static readonly UIGraphColorChoice[] DefaultColorChoices =
    [
        new(UIGraphWords.Blue, "var(--ui-color-series-1)"),
        new(UIGraphWords.Amber, "var(--ui-color-series-2)"),
        new(UIGraphWords.Green, "var(--ui-color-series-3)"),
        new(UIGraphWords.Rose, "var(--ui-color-series-4)"),
        new(UIGraphWords.Purple, "var(--ui-color-series-5)"),
        new(UIGraphWords.Cyan, "var(--ui-color-series-6)"),
        new(UIGraphWords.Bronze, "var(--ui-color-series-7)"),
        new(UIGraphWords.Fern, "var(--ui-color-series-8)")
    ];

    // Every entry the package put in any of its menus, so SetCommandIcon replaces a command's glyph wherever it stands.
    private readonly List<MenuItem> _builtIn = [];
    private readonly Dictionary<string, IVisualComponent> _regions;

    protected GraphCanvasComponentBase(string? id = null) : base(id)
    {
        // Every built-in entry wears one of the framework's own glyphs, so no icon pack is needed; SetCommandIcon replaces one.
        Menu = new MenuComponent()
            .SetShowCollapseToggle(true)
            .SetExpanded(false)
            .SetMinWidth(UILayoutLength.Absolute(220))
            .AddItems(
            [
                Entry(UIGraphCommands.Arrange, UIGraphWords.Arrange, UIGlyphs.Sort),
                Entry(UIGraphCommands.Fit, UIGraphWords.Fit, UIGlyphs.Fit),
                Separator(),
                Entry(UIGraphCommands.Save, UIGraphWords.Save, UIGlyphs.Save, "Ctrl+S")
            ]);

        // What a right press on the empty surface offers is editing the sheet: a run or a save is the corner menu's.
        CanvasMenu = new MenuComponent().AddItems(
        [
            Entry(UIGraphCommands.GroupSelection, UIGraphWords.GroupSelection, UIGlyphs.AspectRatio),
            Entry(UIGraphCommands.DeleteSelection, UIGraphWords.DeleteSelection, UIGlyphs.Delete),
            Separator(),
            Entry(UIGraphCommands.Arrange, UIGraphWords.Arrange, UIGlyphs.Sort),
            Entry(UIGraphCommands.Fit, UIGraphWords.Fit, UIGlyphs.Fit)
        ]);

        ColorChoices = DefaultColorChoices;

        // Pin, rename and delete are what a node is most often asked for: they stand in its action bar (SetNodeActionBar), colour
        // behind its "…" — a group's band has no bar.
        NodeMenu = new MenuComponent().AddItems([.. ItemEntries(inActionBar: true), Separator(), DeleteEntry()]);
        GroupMenu = new MenuComponent().AddItems(ItemEntries(inActionBar: false));

        // Delete is every edge's; what else an edge's menu offers is the kind's, put ahead of it.
        EdgeMenu = new MenuComponent().AddItems([Entry(UIGraphCommands.DeleteEdge, UIGraphWords.DeleteEdge, UIGlyphs.Delete)]);

        _regions = new Dictionary<string, IVisualComponent>(StringComparer.Ordinal)
        {
            [UIGraphMenus.Main] = Menu,
            [UIGraphMenus.Node] = NodeMenu,
            [UIGraphMenus.Group] = GroupMenu,
            [UIGraphMenus.Edge] = EdgeMenu
        };

        // The canvas's own menu, so an application appends to it rather than replacing it; SetContextMenu still overrides it whole.
        _ = SetContextMenu(CanvasMenu);
    }

    /// <summary>What an item's menu and a group's menu both hold — built once for each, since an entry stands in one menu only.</summary>
    private MenuItem[] ItemEntries(bool inActionBar)
    {
        MenuItem color = Entry(UIGraphCommands.Color, UIGraphWords.Color, UIGlyphs.Colorize, kind: UIMenuItemKind.Select);
        MenuItem pin = Entry(UIGraphCommands.Pin, UIGraphWords.Pinned, UIGlyphs.Pin, kind: UIMenuItemKind.Check);
        MenuItem rename = Entry(UIGraphCommands.Rename, UIGraphWords.Rename, UIGlyphs.Edit);

        FillColorChoices(color);

        pin.InActionBar = inActionBar;
        rename.InActionBar = inActionBar;

        return [pin, rename, color];
    }

    /// <summary>A node's own delete, last and in the danger colour, as a destructive entry stands; the selection goes with the node.</summary>
    private MenuItem DeleteEntry()
    {
        MenuItem delete = Entry(UIGraphCommands.Delete, UIGraphWords.Delete, UIGlyphs.Delete);

        delete.IconColor = UIThemeColor.Danger;
        delete.TitleColor = UIThemeColor.Danger;
        delete.InActionBar = true;

        return delete;
    }

    /// <summary>The colour entry's choices: the colour taken away first, then each choice — checks the engine marks as the menu opens.</summary>
    private void FillColorChoices(MenuItem color)
    {
        color.Items.Clear();
        color.Items.Add(new MenuItem { Id = UIGraphCommands.DefaultColor, Title = UIGraphWords.DefaultColor, Kind = UIMenuItemKind.Check });

        UIGraphColorChoice[] choices = ColorChoices ?? [];

        for (var index = 0; index < choices.Length; index++)
            color.Items.Add(new MenuItem { Id = UIGraphCommands.ColorChoice(index), Title = choices[index].Title, Kind = UIMenuItemKind.Check });
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
    /// Gets the menu the right button opens on an item: pin, rename, colour and delete.
    /// </summary>
    public MenuComponent NodeMenu { get; }

    /// <summary>
    /// Gets the menu the right button opens on a group's band: pin, rename and colour.
    /// </summary>
    public MenuComponent GroupMenu { get; }

    /// <summary>
    /// Gets the menu the right button opens on an edge: delete, and whatever the kind puts ahead of it.
    /// </summary>
    public MenuComponent EdgeMenu { get; }

    /// <summary>
    /// Gets the colours an item's or a group's menu offers, in their order.
    /// </summary>
    /// <remarks>Render-time only: the choices are how the menus are built.</remarks>
    [UIComponentProperty(Contract = typeof(IGraphCanvasComponent), IsBindable = false, GenerateSetter = false, DefaultValue = null)]
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
    /// Gets or sets whether every edit is saved as it is made, the save event raised with
    /// <see cref="UIGraphArguments.AutoSaveReason"/>.
    /// </summary>
    /// <remarks>For a page whose document is the application's at once rather than the viewer's until Ctrl+S. Off by default.</remarks>
    [UIComponentProperty(Contract = typeof(IGraphCanvasComponent), DefaultValue = false)]
    public bool? AutoSave { get; set; }

    /// <summary>
    /// Gets or sets whether a node carries an action bar: the node menu's entries marked <c>InActionBar</c> — pin, rename and delete,
    /// and an application's own — as icons in a bar above the node the reader pressed, centred on it, until a press elsewhere or
    /// Escape; the rest behind its "…". Off by default.
    /// </summary>
    /// <remarks>
    /// Render-time only. The bar floats a small gap above the node at its size on screen, under it where the canvas leaves no room
    /// above, and stays over the node redrawn as the document changes. A read-only canvas, and one in the middle of a drag, shows
    /// none. A long press on a touch screen opens the node's menu with the bar's icons atop it.
    /// </remarks>
    [UIComponentProperty(Contract = typeof(IGraphCanvasComponent), IsBindable = false, DefaultValue = false)]
    public bool? NodeActionBar { get; set; }

    /// <summary>
    /// Gets or sets whether the menu a node bar's "…" opens repeats the entries the bar shows. Off by default: the "…" opens the rest
    /// of the node menu (colour, an application's own entries), and a right-click or a long press the whole of it.
    /// </summary>
    /// <remarks>Render-time only.</remarks>
    [UIComponentProperty(Contract = typeof(IGraphCanvasComponent), IsBindable = false, DefaultValue = false)]
    public bool? NodeActionBarRepeatInMore { get; set; }

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
    /// Adds a separator and then the given entries to the menu the right button opens on an item, ahead of the rule over Delete,
    /// which stays last; the command hears which item.
    /// </summary>
    public T AddNodeMenuEntries(params MenuItem[] entries)
    {
        ArgumentNullException.ThrowIfNull(entries);

        if (entries.Length == 0)
            return Self;

        IMenuItemModel[] items = [.. NodeMenu.Items ?? []];

        _ = NodeMenu.SetItems([.. items[..^2], Separator(), .. entries, .. items[^2..]]);

        return Self;
    }

    /// <summary>
    /// Appends a separator and then the given entries to the menu the right button opens on an edge; the command hears which edge.
    /// </summary>
    public T AddEdgeMenuEntries(params MenuItem[] entries)
        => AppendEntries(EdgeMenu, entries);

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
    /// Replaces the framework glyph of the canvas's own entries of one command with an application's icon, in every menu that has
    /// it.
    /// </summary>
    /// <remarks>See <see cref="UIGraphCommands"/> for the keys.</remarks>
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

    /// <summary>
    /// Gives every node an action bar above it: the node menu's entries marked <c>InActionBar</c>, as icons.
    /// </summary>
    public T SetNodeActionBar()
        => SetNodeActionBar(true);

    /// <summary>A kind's own entry of the node menu, after the shared ones and ahead of the rule over Delete, which stays last.</summary>
    protected void AddNodeEntry(MenuItem entry)
    {
        ArgumentNullException.ThrowIfNull(entry);

        IMenuItemModel[] items = [.. NodeMenu.Items ?? []];

        _ = NodeMenu.SetItems([.. items[..^2], entry, .. items[^2..]]);
    }

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

    /// <summary>One of the canvas's own menu entries, in one of the framework's glyphs; remembered so SetCommandIcon can replace it.</summary>
    protected MenuItem Entry(string key, string title, string icon, string? shortcut = null, UIMenuItemKind kind = UIMenuItemKind.Item)
    {
        MenuItem entry = new() { Id = key, Title = title, Icon = icon, Shortcut = shortcut, Kind = kind };

        _builtIn.Add(entry);
        return entry;
    }

    /// <summary>A line between two groups of a menu's entries.</summary>
    protected static MenuItem Separator()
        => new() { Id = Guid.NewGuid().ToString("N"), Kind = UIMenuItemKind.Separator };
}
