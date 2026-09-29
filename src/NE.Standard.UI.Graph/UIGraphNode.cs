using System.Collections.Generic;
using NE.Standard.UI.Abstractions.Binding;
using NE.Standard.UI.Abstractions.Recursive;
using NE.Standard.UI.Primitives.Annotations;

namespace NE.Standard.UI.Graph;

/// <summary>One node of a graph, drawn as a card: title, subtitle, icon, colour, badge, tooltip, and the links it leaves by.</summary>
/// <remarks>Bound as a collection; a change arrives in the browser as the node replaced.</remarks>
public sealed partial class UIGraphNode(string id) : RecursiveObservable, IBindableItem
{
    /// <summary>
    /// Gets the node's key, unique in the graph; a link names it.
    /// </summary>
    [RecursiveMember(false)]
    public string Id { get; } = id;

    /// <summary>
    /// Gets or sets the title the card leads with.
    /// </summary>
    [RecursiveMember]
    public partial string? Title { get; set; }

    /// <summary>
    /// Gets or sets the line under the title.
    /// </summary>
    [RecursiveMember]
    public partial string? Subtitle { get; set; }

    /// <summary>
    /// Gets or sets the icon beside the title: a glyph name from the icon pack the application registered.
    /// </summary>
    [RecursiveMember]
    public partial string? Icon { get; set; }

    /// <summary>
    /// Gets or sets the address of the node's picture, drawn in a circle in place of the icon.
    /// </summary>
    [RecursiveMember]
    public partial string? Image { get; set; }

    /// <summary>
    /// Gets or sets how the node is drawn; unset, as the graph draws its nodes.
    /// </summary>
    [RecursiveMember]
    public partial UIGraphNodeShape? Shape { get; set; }

    /// <summary>
    /// Gets or sets the card's colour, a CSS colour or a theme token; unset, the canvas's own.
    /// </summary>
    [RecursiveMember]
    public partial string? Color { get; set; }

    /// <summary>
    /// Gets or sets the short text the card carries at its end — a count, an amount, a state.
    /// </summary>
    [RecursiveMember]
    public partial string? Badge { get; set; }

    /// <summary>
    /// Gets or sets what the card says when the pointer rests on it.
    /// </summary>
    [RecursiveMember]
    public partial string? Tooltip { get; set; }

    /// <summary>
    /// Gets or sets the links the node leaves by, each to another node of the graph.
    /// </summary>
    /// <remarks>Replaced whole, not edited in place: a new list reaches the browser.</remarks>
    [RecursiveMember]
    public partial IReadOnlyList<UIGraphLink> Links { get; set; } = [];
}

/// <summary>
/// One link of a node: its key, unique in the graph, the node it goes to, and what the edge says along the way.
/// </summary>
public sealed record UIGraphLink(string Id, string To, string? Caption = null);
