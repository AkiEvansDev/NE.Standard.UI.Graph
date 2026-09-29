using System;
using System.Collections.Generic;
using NE.Colors;
using NE.Standard.UI.Abstractions.Styling.Theme;

namespace DemoApp.Graph.Planner;

/// <summary>
/// What the planner's resources are to the production graph: a resource each, and a craft for each recipe — and the glyphs and colours
/// a resource is dressed in.
/// </summary>
public static class PlannerCatalogue
{
    /// <summary>The glyph a new resource wears until another is picked.</summary>
    public const string DefaultIcon = MaterialIcons.Category;

    /// <summary>The glyphs a resource can wear, each with the key of the word the picker shows beside it; the host registers every one.</summary>
    public static readonly (string Glyph, string Title)[] Icons =
    [
        (MaterialIcons.Category, "planner.icon.shapes"),
        (MaterialIcons.Landscape, "planner.icon.ore"),
        (MaterialIcons.WaterDrop, "planner.icon.liquid"),
        (MaterialIcons.OilBarrel, "planner.icon.barrel"),
        (MaterialIcons.Propane, "planner.icon.gas"),
        (MaterialIcons.Grain, "planner.icon.powder"),
        (MaterialIcons.BlurOn, "planner.icon.dust"),
        (MaterialIcons.Hexagon, "planner.icon.ingot"),
        (MaterialIcons.Diamond, "planner.icon.crystal"),
        (MaterialIcons.Layers, "planner.icon.plates"),
        (MaterialIcons.Settings, "planner.icon.gear"),
        (MaterialIcons.Hardware, "planner.icon.tool"),
        (MaterialIcons.Cable, "planner.icon.cable"),
        (MaterialIcons.Memory, "planner.icon.chip"),
        (MaterialIcons.BatteryChargingFull, "planner.icon.battery"),
        (MaterialIcons.Science, "planner.icon.solution"),
        (MaterialIcons.Liquor, "planner.icon.bottle"),
        (MaterialIcons.Whatshot, "planner.icon.fuel"),
        (MaterialIcons.Egg, "planner.icon.seed"),
        (MaterialIcons.Grass, "planner.icon.plant"),
        (MaterialIcons.LocalFlorist, "planner.icon.flower"),
        (MaterialIcons.Medication, "planner.icon.capsule"),
        (MaterialIcons.Inventory2, "planner.icon.crate"),
        (MaterialIcons.RocketLaunch, "planner.icon.product")
    ];

    /// <summary>The theme's series under the canvas's own colour menu's words for them; none is the canvas's default.</summary>
    public static readonly (string Color, string Title)[] Colors =
    [
        ("var(--ui-color-series-1)", UIGraphWords.Blue),
        ("var(--ui-color-series-2)", UIGraphWords.Amber),
        ("var(--ui-color-series-3)", UIGraphWords.Green),
        ("var(--ui-color-series-4)", UIGraphWords.Rose),
        ("var(--ui-color-series-5)", UIGraphWords.Purple),
        ("var(--ui-color-series-6)", UIGraphWords.Cyan),
        ("var(--ui-color-series-7)", UIGraphWords.Bronze),
        ("var(--ui-color-series-8)", UIGraphWords.Fern)
    ];

    public static OptionItem[] IconOptions()
        => Array.ConvertAll(Icons, static icon => new OptionItem { Id = icon.Glyph, Title = icon.Title, Icon = icon.Glyph });

    /// <summary>The colours as the select offers them, each with a dot of itself.</summary>
    public static OptionItem[] ColorOptions()
    {
        // An option's icon cannot name a CSS variable, so the dot takes the series the demo's theme leaves at the palette's default.
        IReadOnlyList<ColorVariant> series = new UIColorPalette().Series;
        OptionItem[] options = new OptionItem[Colors.Length];

        for (var i = 0; i < Colors.Length; i++)
            options[i] = new OptionItem { Id = Colors[i].Color, Title = Colors[i].Title, Icon = PlannerIcons.Swatch, IconColor = UIThemeColor.FromColorVariant(series[i]) };

        return options;
    }

    /// <summary>What a craft's key starts with, before the key of the resource it makes; no resource's own key may start so.</summary>
    public const string CraftPrefix = "make-";

    /// <summary>The craft that makes a resource, keyed by it: one recipe per resource.</summary>
    public static string CraftId(string resourceId)
        => CraftPrefix + resourceId;

    /// <summary>Every resource — its picture over its glyph when it has one — and a craft for each that has an ingredient picked; one with none is brought in.</summary>
    public static IReadOnlyList<UIProductionEntry> Entries(IReadOnlyList<ResourceRecord> resources, PlannerPictures pictures)
    {
        ArgumentNullException.ThrowIfNull(resources);
        ArgumentNullException.ThrowIfNull(pictures);

        List<UIProductionEntry> entries = new(resources.Count * 2);

        foreach (ResourceRecord resource in resources)
            entries.Add(new UIResource(resource.Id) { Title = resource.Name, Icon = resource.Icon, Image = pictures.AddressOf(resource), Color = resource.Color });

        foreach (ResourceRecord resource in resources)
        {
            if (Craft(resource) is UICraft craft)
                entries.Add(craft);
        }

        return entries;
    }

    /// <summary>
    /// Brings a bound catalogue to the entries given by key: what went is removed, what came is added, and what stayed is changed in place.
    /// </summary>
    /// <remarks>Never cleared and filled again: an entry that leaves and comes back under its key returns to the place the canvas kept
    /// for it, which by then another entry may stand on.</remarks>
    public static void Sync(RecursiveCollection<UIProductionEntry> target, IReadOnlyList<UIProductionEntry> entries)
    {
        ArgumentNullException.ThrowIfNull(target);
        ArgumentNullException.ThrowIfNull(entries);

        Dictionary<string, UIProductionEntry> wanted = new(entries.Count, StringComparer.Ordinal);

        foreach (UIProductionEntry entry in entries)
            wanted[entry.Id] = entry;

        for (var i = target.Count - 1; i >= 0; i--)
        {
            if (!wanted.TryGetValue(target[i].Id, out UIProductionEntry? entry) || entry.Kind != target[i].Kind)
                target.RemoveAt(i);
        }

        foreach (UIProductionEntry entry in entries)
        {
            UIProductionEntry? kept = null;

            foreach (UIProductionEntry existing in target)
            {
                if (existing.Id == entry.Id)
                {
                    kept = existing;
                    break;
                }
            }

            switch (kept, entry)
            {
                case (null, _):
                    target.Add(entry);
                    break;
                case (UIResource resource, UIResource next):
                    resource.Title = next.Title;
                    resource.Icon = next.Icon;
                    resource.Image = next.Image;
                    resource.Color = next.Color;
                    break;
                case (UICraft craft, UICraft next):
                    craft.Title = next.Title;
                    craft.Time = next.Time;
                    craft.Ingredients = next.Ingredients;
                    craft.Products = next.Products;
                    break;
                default:
                    // A kind that changed was removed above; nothing else is left to match.
                    break;
            }
        }
    }

    /// <summary>The resource and everything its recipe takes, all the way down: what the preview draws.</summary>
    public static IReadOnlyList<ResourceRecord> MadeFrom(IReadOnlyList<ResourceRecord> resources, string resourceId)
    {
        ArgumentNullException.ThrowIfNull(resources);

        Dictionary<string, ResourceRecord> byId = new(resources.Count, StringComparer.Ordinal);

        foreach (ResourceRecord resource in resources)
            byId[resource.Id] = resource;

        HashSet<string> reached = new(StringComparer.Ordinal);
        Stack<string> pending = new();
        pending.Push(resourceId);

        while (pending.Count > 0)
        {
            var id = pending.Pop();

            if (!byId.TryGetValue(id, out ResourceRecord? resource) || !reached.Add(id))
                continue;

            foreach (AmountRecord ingredient in resource.Ingredients)
            {
                if (ingredient.ResourceId is { } next)
                    pending.Push(next);
            }
        }

        // In the catalogue's own order, so the layout is the same whichever resource is opened first.
        List<ResourceRecord> result = new(reached.Count);

        foreach (ResourceRecord resource in resources)
        {
            if (reached.Contains(resource.Id))
                result.Add(resource);
        }

        return result;
    }

    private static UICraft? Craft(ResourceRecord resource)
    {
        List<UICraftAmount> ingredients = new(resource.Ingredients.Count);

        foreach (AmountRecord ingredient in resource.Ingredients)
        {
            if (ingredient.ResourceId is not { } id || ingredient.Amount <= 0)
                continue;

            // A resource picked in two rows is one ingredient: the rows' amounts add up.
            var index = ingredients.FindIndex(amount => amount.Resource == id);

            if (index < 0)
                ingredients.Add(new UICraftAmount(id, ingredient.Amount));
            else
                ingredients[index] = ingredients[index] with { Amount = ingredients[index].Amount + ingredient.Amount };
        }

        if (ingredients.Count == 0)
            return null;

        return new UICraft(CraftId(resource.Id))
        {
            Title = resource.Name,
            Time = TimeSpan.FromSeconds(resource.Seconds),
            Ingredients = ingredients,
            Products = [new UICraftAmount(resource.Id, resource.Output)]
        };
    }
}
