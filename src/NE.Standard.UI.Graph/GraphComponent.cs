using System.Collections.Generic;
using NE.Standard.UI.Abstractions.Binding;
using NE.Standard.UI.Authoring.Components;
using NE.Standard.UI.Primitives.Annotations;

namespace NE.Standard.UI.Graph;

/// <summary>
/// A graph of the application's nodes and their links, laid out in layers, with cycle-back edges drawn as backward edges. Items is
/// a bound collection; a node the viewer has not placed is positioned by the layout.
/// </summary>
public abstract partial class GraphComponent<T> : LayeredGraphComponentBase<T, UIGraphDocument>, IBindableItemsComponent
    where T : GraphComponent<T>, IUIComponentDefinition
{
    private readonly List<UIGraphNode> _items = [];

    protected GraphComponent(string? id = null) : base(id)
    {
        // Add node is the structure's, so it is offered — and enabled only while the graph lets its structure be edited.
        PrependEntries(CanvasMenu, Entry(UIGraphCommands.AddNode, "Add node"), Separator());
        PrependEntries(EdgeMenu, Entry(UIGraphCommands.Caption, "Caption"));
    }

    /// <summary>
    /// Gets the nodes, each with the links it leaves by.
    /// </summary>
    [UIComponentProperty(Contract = typeof(IItemsComponent), DefaultValue = null, GenerateSetter = false)]
    public IReadOnlyList<UIGraphNode>? Items => _items;

    /// <inheritdoc/>
    IReadOnlyList<object?> IBindableItemsComponent.Items => _items;

    /// <summary>
    /// Sets the nodes the graph shows when they are not bound.
    /// </summary>
    public T SetItems(IEnumerable<UIGraphNode> items)
    {
        ReplaceItems(_items, items);
        return Self;
    }
}

/// <summary>
/// A graph of the application's nodes and the links between them, laid out in layers.
/// </summary>
public sealed class GraphComponent(string? id = null) : GraphComponent<GraphComponent>(id), IUIComponentDefinition
{
    /// <summary>
    /// Gets the component type key used to identify this component in the compiled graph.
    /// </summary>
    public static string ComponentTypeKey => "graph.canvas.graph";
}
