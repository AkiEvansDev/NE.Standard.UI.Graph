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
    /// <summary>The most resources and crafts a catalogue holds once a draft is applied, unless the caller says otherwise.</summary>
    public const int DefaultMaxEntries = 10_000;

    /// <summary>
    /// Gets the empty draft.
    /// </summary>
    public static UIProductionDraft Empty { get; } = new();

    /// <summary>
    /// Gets every resource the viewer added or changed, as the viewer left it.
    /// </summary>
    public UIResourceDraft[] Resources { get; } = UIGraphDraftSupport.Present(resources);

    /// <summary>
    /// Gets every craft the viewer added or changed, as the viewer left it.
    /// </summary>
    public UICraftDraft[] Crafts { get; } = UIGraphDraftSupport.Present(crafts);

    /// <summary>
    /// Gets the keys of the resources and crafts the viewer removed.
    /// </summary>
    public string[] Removed { get; } = UIGraphDraftSupport.Present(removed);

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
    /// Applies the draft to an application's catalogue, while the canvas lets it be edited: removed entries go, changed ones take the
    /// viewer's name, colour and amounts, added ones join.
    /// </summary>
    /// <remarks>
    /// Amounts of a removed resource are dropped from crafts — a craft that loses its last ingredient to it, or is left with
    /// nothing, goes too, as the canvas takes it off. The draft is the browser's, so it is held to what the canvas edits: refused
    /// whole, and nothing written, while <paramref name="editStructure"/> is off, under <see cref="UIProductionMode.Plan"/> (a plan is
    /// read off the catalogue, never written to it) or once the catalogue would pass <paramref name="maxEntries"/>; a colour that is
    /// neither one of <paramref name="colorChoices"/> (the canvas's defaults when null) nor one an entry already wears is dropped; an
    /// added entry keeps what else it carries only as a copy of one already there, as Duplicate makes one. Only differing properties
    /// are written.
    /// </remarks>
    /// <returns>Whether the draft was applied.</returns>
    public bool ApplyTo(IList<UIProductionEntry> entries, bool editStructure, UIProductionMode mode, IReadOnlyList<UIGraphColorChoice>? colorChoices = null, int maxEntries = DefaultMaxEntries)
    {
        ArgumentNullException.ThrowIfNull(entries);
        ArgumentOutOfRangeException.ThrowIfNegative(maxEntries);

        if (!editStructure || mode == UIProductionMode.Plan || CountAfter(entries) > maxEntries)
            return false;

        HashSet<string> colors = UIGraphDraftSupport.AllowedColors(colorChoices, entries, static entry => entry.Color);
        HashSet<UIResourceLooks> resourceLooks = [];
        HashSet<UICraftLooks> craftLooks = [];

        foreach (UIProductionEntry entry in entries)
        {
            if (entry is UIResource resource)
                _ = resourceLooks.Add(UIResourceLooks.Of(resource));
            else if (entry is UICraft craft)
                _ = craftLooks.Add(UICraftLooks.Of(craft));
        }

        HashSet<string> removed = UIGraphDraftSupport.RemoveAll(entries, Removed);

        // The draft is the browser's: an entry it sent with no key is no entry.
        foreach (UIResourceDraft draft in Resources)
        {
            if (string.IsNullOrEmpty(draft.Id) || removed.Contains(draft.Id))
                continue;

            UIResource resource = Take(entries, draft.Id, static id => new UIResource(id), out var added);

            if (added && resourceLooks.Contains(draft.Looks))
                draft.Looks.WriteTo(resource);

            draft.WriteTo(resource, colors);
        }

        foreach (UICraftDraft draft in Crafts)
        {
            if (string.IsNullOrEmpty(draft.Id) || removed.Contains(draft.Id))
                continue;

            UICraft craft = Take(entries, draft.Id, static id => new UICraft(id), out var added);

            if (added && craftLooks.Contains(draft.Looks))
                draft.Looks.WriteTo(craft);

            draft.WriteTo(craft, colors);
        }

        HashSet<string> resources = [with(StringComparer.Ordinal)];

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

        return true;
    }

    /// <summary>How many entries the catalogue would hold once the draft is applied: less those it removes, and the keys it adds.</summary>
    private int CountAfter(IList<UIProductionEntry> entries)
    {
        HashSet<string> keys = [with(StringComparer.Ordinal)];

        foreach (UIProductionEntry entry in entries)
            _ = keys.Add(entry.Id);

        foreach (UIResourceDraft draft in Resources)
        {
            if (!string.IsNullOrEmpty(draft.Id))
                _ = keys.Add(draft.Id);
        }

        foreach (UICraftDraft draft in Crafts)
        {
            if (!string.IsNullOrEmpty(draft.Id))
                _ = keys.Add(draft.Id);
        }

        foreach (var id in Removed)
            _ = keys.Remove(id);

        return keys.Count;
    }

    /// <summary>
    /// The application's entry of that key and kind, replacing one of the other kind in place, or appended if the key is new;
    /// <paramref name="added"/> says whether it was made here.
    /// </summary>
    private static TEntry Take<TEntry>(IList<UIProductionEntry> entries, string id, Func<string, TEntry> create, out bool added)
        where TEntry : UIProductionEntry
    {
        added = true;

        for (var index = 0; index < entries.Count; index++)
        {
            if (!string.Equals(entries[index].Id, id, StringComparison.Ordinal))
                continue;

            if (entries[index] is TEntry found)
            {
                added = false;
                return found;
            }

            TEntry replacement = create(id);

            entries[index] = replacement;
            return replacement;
        }

        TEntry appended = create(id);

        entries.Add(appended);
        return appended;
    }

    /// <summary>The amounts whose resource is still there, or nothing when every one of them is; one naming no resource is none.</summary>
    private static List<UICraftAmount>? Kept(IReadOnlyList<UICraftAmount> amounts, HashSet<string> resources)
    {
        List<UICraftAmount> kept = [];

        foreach (UICraftAmount amount in amounts)
        {
            if (amount.Resource is { } resource && resources.Contains(resource))
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

    /// <summary>What the resource carries beside what the canvas edits.</summary>
    internal UIResourceLooks Looks => new(Icon, Tooltip, Image, Category, Unit, Cost);

    /// <summary>Writes what the canvas edits onto a resource — its name and a colour <paramref name="colors"/> holds — each setter leaving alone what already matches.</summary>
    internal void WriteTo(UIResource resource, HashSet<string> colors)
    {
        resource.Title = Title;

        if (Color is null || colors.Contains(Color))
            resource.Color = Color;
    }
}

/// <summary>What a resource carries beside what the canvas edits: what an added one keeps only as a copy of one already there.</summary>
internal readonly record struct UIResourceLooks(string? Icon, string? Tooltip, string? Image, string? Category, string? Unit, double? Cost)
{
    public static UIResourceLooks Of(UIResource resource)
        => new(resource.Icon, resource.Tooltip, resource.Image, resource.Category, resource.Unit, resource.Cost);

    public void WriteTo(UIResource resource)
    {
        resource.Icon = Icon;
        resource.Tooltip = Tooltip;
        resource.Image = Image;
        resource.Category = Category;
        resource.Unit = Unit;
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
    public UICraftAmount[] Ingredients { get; } = UIGraphDraftSupport.Present(ingredients);

    /// <summary>Gets what one run gives.</summary>
    public UICraftAmount[] Products { get; } = UIGraphDraftSupport.Present(products);

    /// <summary>Gets how long one run lasts.</summary>
    public TimeSpan Time { get; } = time;

    /// <summary>Gets whether the viewer added the craft rather than changed one the application had.</summary>
    public bool Created { get; } = created;

    /// <summary>Gets the application's craft, as the browser read it, when the viewer first changed it; unset for one the viewer added.</summary>
    public string? Baseline { get; } = baseline;

    /// <summary>What the craft carries beside what the canvas edits.</summary>
    internal UICraftLooks Looks => new(Icon, Tooltip);

    /// <summary>Writes what the canvas edits onto a craft — its name, a colour <paramref name="colors"/> holds, its amounts and run length — each setter leaving alone what already matches.</summary>
    internal void WriteTo(UICraft craft, HashSet<string> colors)
    {
        craft.Title = Title;

        if (Color is null || colors.Contains(Color))
            craft.Color = Color;

        if (!UIGraphDraftSupport.Same(craft.Ingredients, Ingredients))
            craft.Ingredients = Ingredients;

        if (!UIGraphDraftSupport.Same(craft.Products, Products))
            craft.Products = Products;

        craft.Time = Time < TimeSpan.Zero ? TimeSpan.Zero : Time;
    }
}

/// <summary>What a craft carries beside what the canvas edits: what an added one keeps only as a copy of one already there.</summary>
internal readonly record struct UICraftLooks(string? Icon, string? Tooltip)
{
    public static UICraftLooks Of(UICraft craft)
        => new(craft.Icon, craft.Tooltip);

    public void WriteTo(UICraft craft)
    {
        craft.Icon = Icon;
        craft.Tooltip = Tooltip;
    }
}
