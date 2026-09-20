using System;
using System.Collections.Generic;
using NE.Standard.UI.Authoring.Components;
using NE.Standard.UI.Components.BuiltIns.Models;
using NE.Standard.UI.Components.BuiltIns.Navigation;
using NE.Standard.UI.Primitives.Annotations;

namespace NE.Standard.UI.Graph;

/// <summary>
/// A canvas of the application's own items laid out in layers, with cycle-back edges drawn as backward edges; the base for the
/// graph and production graph. The value is the document of item placement and the pending draft of changes.
/// </summary>
/// <remarks>Draws no item template: every change to an item arrives as the item replaced whole.</remarks>
public abstract partial class LayeredGraphComponentBase<T, TDocument> : GraphCanvasComponentBase<T, TDocument>, ILayeredGraphComponent, IItemValuesComponent
    where T : LayeredGraphComponentBase<T, TDocument>, IUIComponentDefinition
{
    protected LayeredGraphComponentBase(string? id = null) : base(id)
    {
        // Delete is every edge's; what else an edge's menu offers is the kind's, put ahead of it.
        EdgeMenu = new MenuComponent().AddItems([Entry(UIGraphCommands.DeleteEdge, "Delete")]);

        SetCanvasRegion(UIGraphMenus.Edge, EdgeMenu);

        // A conflict is answered on the item, or on the edge where a recipe's edges carry it — the only menus these entries show in.
        PrependEntries(NodeMenu, Entry(UIGraphCommands.TakeServer, "Take the server's"), Entry(UIGraphCommands.KeepMine, "Keep mine"));
        PrependEntries(EdgeMenu, Entry(UIGraphCommands.TakeServer, "Take the server's"), Entry(UIGraphCommands.KeepMine, "Keep mine"));

        // A layered graph is read by its lines: the one under the pointer stands out, whole, unless the author takes that off.
        HighlightOnHover = true;
    }

    /// <inheritdoc/>
    public MenuComponent EdgeMenu { get; }

    /// <summary>
    /// Gets or sets whether the viewer may edit items and links — add, rename, recolour, remove, draw and delete — beside moving
    /// them. Changes go into the document's draft until saved.
    /// </summary>
    [UIComponentProperty(Contract = typeof(ILayeredGraphComponent), DefaultValue = false)]
    public bool? EditStructure { get; set; }

    /// <summary>
    /// Gets or sets which way the layered layout runs.
    /// </summary>
    [UIComponentProperty(Contract = typeof(ILayeredGraphComponent), DefaultValue = UIGraphDirection.LeftToRight)]
    public UIGraphDirection? Direction { get; set; }

    /// <summary>
    /// Gets or sets how a node that names no shape of its own is drawn.
    /// </summary>
    [UIComponentProperty(Contract = typeof(ILayeredGraphComponent), DefaultValue = UIGraphNodeShape.Card)]
    public UIGraphNodeShape? NodeShape { get; set; }

    /// <inheritdoc/>
    /// <remarks>A layered canvas has no components inside an item template, so a change to an item has to reach it as a replace of the item.</remarks>
    [UIComponentProperty(Contract = typeof(IItemValuesComponent), IsBindable = false, GenerateBinder = false, GenerateSetter = false, DefaultValue = false)]
    public bool TakesItemValues => true;

    /// <summary>The unbound items replaced whole, each checked for null first so a bad list leaves the old one standing.</summary>
    protected static void ReplaceItems<TItem>(IList<TItem> target, IEnumerable<TItem> items)
        where TItem : class
    {
        ArgumentNullException.ThrowIfNull(target);
        ArgumentNullException.ThrowIfNull(items);

        TItem[] buffer = [.. items];

        foreach (TItem item in buffer)
            ArgumentNullException.ThrowIfNull(item);

        target.Clear();

        foreach (TItem item in buffer)
            target.Add(item);
    }

    /// <summary>
    /// Appends a separator and then the given entries to the menu the right button opens on an edge; the command hears which edge.
    /// </summary>
    public T AddEdgeMenuEntries(params MenuItem[] entries)
        => AppendEntries(EdgeMenu, entries);
}
