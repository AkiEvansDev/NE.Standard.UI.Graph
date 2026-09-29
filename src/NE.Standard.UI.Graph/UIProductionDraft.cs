using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace NE.Standard.UI.Graph;

/// <summary>
/// Resources and crafts the viewer added, changed or removed since the last save. A save hands it to the application to apply, or
/// refuse, then the layout returns without it.
/// </summary>
[method: JsonConstructor]
public sealed class UIProductionDraft(UIResourceDraft[]? resources = null, UICraftDraft[]? crafts = null, string[]? removed = null)
{
    /// <summary>
    /// Gets the empty draft.
    /// </summary>
    public static UIProductionDraft Empty { get; } = new();

    /// <summary>
    /// Gets every resource the viewer added or changed, as the viewer left it.
    /// </summary>
    public UIResourceDraft[] Resources { get; } = resources ?? [];

    /// <summary>
    /// Gets every craft the viewer added or changed, as the viewer left it.
    /// </summary>
    public UICraftDraft[] Crafts { get; } = crafts ?? [];

    /// <summary>
    /// Gets the keys of the resources and crafts the viewer removed.
    /// </summary>
    public string[] Removed { get; } = removed ?? [];

    /// <summary>
    /// Gets whether the viewer changed nothing.
    /// </summary>
    [JsonIgnore]
    public bool IsEmpty => Resources.Length == 0 && Crafts.Length == 0 && Removed.Length == 0;

    /// <summary>The key of the edge a craft's ingredient is drawn as, from the resource into the craft.</summary>
    public static string IngredientEdge(string craft, string resource)
        => craft + "<" + resource;

    /// <summary>The key of the edge a craft's product is drawn as, from the craft to the resource.</summary>
    public static string ProductEdge(string craft, string resource)
        => craft + ">" + resource;

    /// <summary>
    /// Applies the draft to an application's catalogue: removed entries go, changed ones take the viewer's state, added ones join.
    /// </summary>
    /// <remarks>
    /// Amounts of a removed resource are dropped from crafts — a craft that loses its last ingredient to it, or is left with
    /// nothing, goes too, as the canvas takes it off. Only differing properties are written.
    /// </remarks>
    public void ApplyTo(IList<UIProductionEntry> entries)
    {
        ArgumentNullException.ThrowIfNull(entries);

        HashSet<string> removed = UIGraphDraftSupport.RemoveAll(entries, Removed);

        // The draft is the browser's: an entry it sent as nothing, or with no key, is no entry.
        foreach (UIResourceDraft? draft in Resources)
        {
            if (!string.IsNullOrEmpty(draft?.Id) && !removed.Contains(draft.Id))
                draft.WriteTo(Take(entries, draft.Id, static id => new UIResource(id)));
        }

        foreach (UICraftDraft? draft in Crafts)
        {
            if (!string.IsNullOrEmpty(draft?.Id) && !removed.Contains(draft.Id))
                draft.WriteTo(Take(entries, draft.Id, static id => new UICraft(id)));
        }

        HashSet<string> resources = new(StringComparer.Ordinal);

        foreach (UIProductionEntry entry in entries)
        {
            if (entry is UIResource)
                _ = resources.Add(entry.Id);
        }

        for (var index = entries.Count - 1; index >= 0; index--)
        {
            if (entries[index] is not UICraft craft)
                continue;

            List<UICraftAmount>? ingredients = Kept(craft.Ingredients, resources);
            List<UICraftAmount>? products = Kept(craft.Products, resources);

            // Taking nothing, it would make its products from nothing, and the canvas would have no edge left to draw it on.
            if ((ingredients ?? craft.Ingredients).Count == 0 && (ingredients is not null || products?.Count == 0))
            {
                entries.RemoveAt(index);
                continue;
            }

            if (ingredients is not null)
                craft.Ingredients = ingredients;

            if (products is not null)
                craft.Products = products;
        }
    }

    /// <summary>The application's entry of that key and kind, replacing one of the other kind in place, or appended if the key is new.</summary>
    private static TEntry Take<TEntry>(IList<UIProductionEntry> entries, string id, Func<string, TEntry> create)
        where TEntry : UIProductionEntry
    {
        for (var index = 0; index < entries.Count; index++)
        {
            if (!string.Equals(entries[index].Id, id, StringComparison.Ordinal))
                continue;

            if (entries[index] is TEntry found)
                return found;

            TEntry replacement = create(id);

            entries[index] = replacement;
            return replacement;
        }

        TEntry added = create(id);

        entries.Add(added);
        return added;
    }

    /// <summary>The amounts whose resource is still there, or nothing when every one of them is; one the browser sent as nothing is none.</summary>
    private static List<UICraftAmount>? Kept(IReadOnlyList<UICraftAmount> amounts, HashSet<string> resources)
    {
        List<UICraftAmount> kept = [];

        foreach (UICraftAmount? amount in amounts)
        {
            if (amount?.Resource is { } resource && resources.Contains(resource))
                kept.Add(amount);
        }

        return kept.Count == amounts.Count ? null : kept;
    }
}

/// <summary>
/// One resource as the viewer left it: its whole state, whether it was added, and the server's resource as of the viewer's first
/// change (for conflict detection).
/// </summary>
[method: JsonConstructor]
public sealed class UIResourceDraft(string id, string? title = null, string? icon = null, string? color = null, string? tooltip = null, string? image = null, string? category = null, string? unit = null, double? cost = null, bool created = false, string? baseline = null)
{
    /// <summary>Gets the resource's key.</summary>
    public string Id { get; } = id;

    /// <summary>Gets the resource's name.</summary>
    public string? Title { get; } = title;

    /// <summary>Gets the resource's icon.</summary>
    public string? Icon { get; } = icon;

    /// <summary>Gets the resource's colour.</summary>
    public string? Color { get; } = color;

    /// <summary>Gets the resource's tooltip.</summary>
    public string? Tooltip { get; } = tooltip;

    /// <summary>Gets the address of the resource's picture.</summary>
    public string? Image { get; } = image;

    /// <summary>Gets the resource's category.</summary>
    public string? Category { get; } = category;

    /// <summary>Gets the resource's unit.</summary>
    public string? Unit { get; } = unit;

    /// <summary>Gets what one unit of the resource costs.</summary>
    public double? Cost { get; } = cost;

    /// <summary>Gets whether the viewer added the resource rather than changed one the application had.</summary>
    public bool Created { get; } = created;

    /// <summary>Gets the application's resource, as the browser read it, when the viewer first changed it; unset for one the viewer added.</summary>
    public string? Baseline { get; } = baseline;

    /// <summary>Writes this state onto a resource, property by property, leaving alone what already matches.</summary>
    public void WriteTo(UIResource resource)
    {
        ArgumentNullException.ThrowIfNull(resource);

        if (resource.Title != Title)
            resource.Title = Title;

        if (resource.Icon != Icon)
            resource.Icon = Icon;

        if (resource.Color != Color)
            resource.Color = Color;

        if (resource.Tooltip != Tooltip)
            resource.Tooltip = Tooltip;

        if (resource.Image != Image)
            resource.Image = Image;

        if (resource.Category != Category)
            resource.Category = Category;

        if (resource.Unit != Unit)
            resource.Unit = Unit;

        if (resource.Cost != Cost)
            resource.Cost = Cost;
    }
}

/// <summary>
/// One craft as the viewer left it: the whole of its state, whether the viewer added it, and the server's craft as it was when the
/// viewer first changed it.
/// </summary>
[method: JsonConstructor]
public sealed class UICraftDraft(string id, string? title = null, string? icon = null, string? color = null, string? tooltip = null, UICraftAmount[]? ingredients = null, UICraftAmount[]? products = null, TimeSpan time = default, bool created = false, string? baseline = null)
{
    /// <summary>Gets the craft's key.</summary>
    public string Id { get; } = id;

    /// <summary>Gets the craft's name.</summary>
    public string? Title { get; } = title;

    /// <summary>Gets the craft's icon.</summary>
    public string? Icon { get; } = icon;

    /// <summary>Gets the craft's colour.</summary>
    public string? Color { get; } = color;

    /// <summary>Gets the craft's tooltip.</summary>
    public string? Tooltip { get; } = tooltip;

    /// <summary>Gets what one run takes.</summary>
    public UICraftAmount[] Ingredients { get; } = ingredients ?? [];

    /// <summary>Gets what one run gives.</summary>
    public UICraftAmount[] Products { get; } = products ?? [];

    /// <summary>Gets how long one run lasts.</summary>
    public TimeSpan Time { get; } = time;

    /// <summary>Gets whether the viewer added the craft rather than changed one the application had.</summary>
    public bool Created { get; } = created;

    /// <summary>Gets the application's craft, as the browser read it, when the viewer first changed it; unset for one the viewer added.</summary>
    public string? Baseline { get; } = baseline;

    /// <summary>Writes this state onto a craft, property by property, leaving alone what already matches.</summary>
    public void WriteTo(UICraft craft)
    {
        ArgumentNullException.ThrowIfNull(craft);

        if (craft.Title != Title)
            craft.Title = Title;

        if (craft.Icon != Icon)
            craft.Icon = Icon;

        if (craft.Color != Color)
            craft.Color = Color;

        if (craft.Tooltip != Tooltip)
            craft.Tooltip = Tooltip;

        if (!UIGraphDraftSupport.Same(craft.Ingredients, Ingredients))
            craft.Ingredients = Ingredients;

        if (!UIGraphDraftSupport.Same(craft.Products, Products))
            craft.Products = Products;

        if (craft.Time != Time)
            craft.Time = Time;
    }
}
