using System;
using System.Collections.Generic;
using NE.Standard.UI.Abstractions.Binding;
using NE.Standard.UI.Abstractions.Recursive;
using NE.Standard.UI.Primitives.Annotations;

namespace NE.Standard.UI.Graph;

/// <summary>
/// Which of the production graph's two models an entry is.
/// </summary>
public enum UIProductionEntryKind
{
    /// <summary>Something made, consumed or dug up: a node of the graph.</summary>
    Resource,

    /// <summary>One run of a recipe: what it takes, what it gives, and how long it lasts.</summary>
    Craft
}

/// <summary>
/// One entry of a production graph's catalogue — a resource or a craft. Bound as a collection; a change arrives in the browser as
/// the entry replaced.
/// </summary>
public abstract partial class UIProductionEntry(string id) : RecursiveObservable, IBindableItem
{
    /// <summary>
    /// Gets the entry's key, unique across resources and crafts together; a craft's amounts name a resource by it.
    /// </summary>
    [RecursiveMember(false)]
    public string Id { get; } = id;

    /// <summary>
    /// Gets which of the two models the entry is, which is how the browser tells them apart.
    /// </summary>
    public abstract UIProductionEntryKind Kind { get; }

    /// <summary>
    /// Gets or sets the entry's name.
    /// </summary>
    [RecursiveMember]
    public partial string? Title { get; set; }

    /// <summary>
    /// Gets or sets the icon the entry is drawn with: a glyph name from the icon pack the application registered.
    /// </summary>
    [RecursiveMember]
    public partial string? Icon { get; set; }

    /// <summary>
    /// Gets or sets the entry's colour, a CSS colour or a theme token; unset, the canvas's own.
    /// </summary>
    [RecursiveMember]
    public partial string? Color { get; set; }

    /// <summary>
    /// Gets or sets what the entry says when the pointer rests on it; unset, the canvas says what the entry is.
    /// </summary>
    [RecursiveMember]
    public partial string? Tooltip { get; set; }
}

/// <summary>
/// A resource: something a craft makes or consumes. One no craft makes is a source — a raw resource.
/// </summary>
public sealed partial class UIResource(string id) : UIProductionEntry(id)
{
    /// <inheritdoc/>
    public override UIProductionEntryKind Kind => UIProductionEntryKind.Resource;

    /// <summary>
    /// Gets or sets the address of the resource's picture, drawn in place of its icon.
    /// </summary>
    [RecursiveMember]
    public partial string? Image { get; set; }

    /// <summary>
    /// Gets or sets the group the resource belongs to — ores, parts, fluids.
    /// </summary>
    [RecursiveMember]
    public partial string? Category { get; set; }

    /// <summary>
    /// Gets or sets what an amount of the resource is counted in — pieces, kilograms, litres — written after every amount of it.
    /// </summary>
    [RecursiveMember]
    public partial string? Unit { get; set; }

    /// <summary>
    /// Gets or sets what one unit of the resource costs, for a plan that asks for the least cost; unset, a source counts as one.
    /// </summary>
    [RecursiveMember]
    public partial double? Cost { get; set; }
}

/// <summary>
/// A craft: one run of a recipe — the resources it takes, the resources it gives (several, when a recipe throws off by-products), and
/// how long the run lasts.
/// </summary>
public sealed partial class UICraft(string id) : UIProductionEntry(id)
{
    /// <inheritdoc/>
    public override UIProductionEntryKind Kind => UIProductionEntryKind.Craft;

    /// <summary>
    /// Gets or sets what one run takes, each resource once.
    /// </summary>
    /// <remarks>Replaced whole rather than edited in place: a new list is what reaches the browser.</remarks>
    [RecursiveMember]
    public partial IReadOnlyList<UICraftAmount> Ingredients { get; set; } = [];

    /// <summary>
    /// Gets or sets what one run gives, each resource once.
    /// </summary>
    /// <remarks>Replaced whole rather than edited in place: a new list is what reaches the browser.</remarks>
    [RecursiveMember]
    public partial IReadOnlyList<UICraftAmount> Products { get; set; } = [];

    /// <summary>
    /// Gets or sets how long one run lasts.
    /// </summary>
    [RecursiveMember]
    public partial TimeSpan Time { get; set; }
}

/// <summary>
/// How much of one resource a run of a craft takes or gives.
/// </summary>
public sealed record UICraftAmount(string Resource, double Amount);
