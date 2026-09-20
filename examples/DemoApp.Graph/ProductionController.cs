using System;
using System.Globalization;
using NE.Standard.UI.Abstractions.Effects;
using NE.Standard.UI.Abstractions.Recursive;
using NE.Standard.UI.Controllers;
using NE.Standard.UI.Graph;
using NE.Standard.UI.Icons.Material;
using NE.Standard.UI.Primitives.Annotations;
using NE.Standard.UI.Shell.Commands;

namespace DemoApp.Graph;

/// <summary>
/// A small factory: ores smelted into plates, plates made into parts, crude oil split into three fluids at once, and uranium enriched
/// by a recipe that feeds its own product back into itself — the cycle a backward edge is drawn for. A recipe added from the page's
/// button arrives in the graph while the page runs.
/// </summary>
internal sealed partial class ProductionController : UIControllerBase
{
    public const string CanvasId = "factory";

    /// <summary>The form the layout is held in until it is saved.</summary>
    public const string CanvasForm = "factory-layout";

    // The theme's series by what a resource is, so the kinds of material read as colours.
    private const string Ores = "var(--ui-color-series-7)";
    private const string Plates = "var(--ui-color-series-1)";
    private const string Parts = "var(--ui-color-series-3)";
    private const string Fluids = "var(--ui-color-series-6)";
    private const string Nuclear = "var(--ui-color-series-8)";

    private const string AddedCraft = "rocket-fuel-recipe";
    private const string AddedResource = "rocket-fuel";

    [RecursiveMember(false)]
    public RecursiveCollection<UIProductionEntry> Catalogue { get; } = [.. StartingCatalogue()];

    [RecursiveMember]
    public partial UIProductionDocument Layout { get; set; } = UIProductionDocument.Empty;

    [RecursiveMember]
    public partial UIGraphDirection Direction { get; set; } = UIGraphDirection.LeftToRight;

    [RecursiveMember]
    public partial UIGraphEdgeShape EdgeShape { get; set; } = UIGraphEdgeShape.Orthogonal;

    [RecursiveMember]
    public partial UIGraphNodeShape NodeShape { get; set; } = UIGraphNodeShape.Icon;

    [RecursiveMember]
    public partial bool ReadOnly { get; set; }

    [RecursiveMember]
    public partial bool EditStructure { get; set; } = true;

    [RecursiveMember]
    public partial string Status { get; set; } = "Drag from a resource's dot to another resource for a new recipe, or into a recipe for an ingredient; Ctrl+S to apply.";

    /// <summary>Rocket fuel and its recipe arrive in the catalogue, the recipe fed by the light oil the refinery already makes.</summary>
    [UICommand]
    public void AddRecipe()
    {
        if (Find(AddedCraft) is not null)
        {
            Status = "Rocket fuel is in the catalogue already.";
            return;
        }

        Catalogue.Add(Resource(AddedResource, "Rocket fuel", MaterialIcons.RocketLaunch, "Parts", Parts));
        Catalogue.Add(Craft(AddedCraft, "Rocket fuel", 30, [("light-oil", 10)], [(AddedResource, 1)]));

        Status = "Rocket fuel is made from light oil now.";
    }

    [UICommand]
    public void RemoveRecipe()
    {
        if (Find(AddedCraft) is not UIProductionEntry craft || Find(AddedResource) is not UIProductionEntry resource)
        {
            Status = "Nothing was added.";
            return;
        }

        _ = Catalogue.Remove(craft);
        _ = Catalogue.Remove(resource);

        Status = "Rocket fuel is gone.";
    }

    /// <summary>
    /// The layout has landed with the draft of what the viewer changed about the catalogue: the draft is applied, which reaches the page
    /// as the entries change, and the layout is kept without it.
    /// </summary>
    [UICommand]
    public void Save()
    {
        UIProductionDraft draft = Layout.Draft;
        var at = DateTime.Now.ToString("HH:mm:ss", CultureInfo.InvariantCulture);

        if (draft.IsEmpty)
        {
            Status = $"Kept the places of {Layout.Nodes.Length} resources and recipes at {at}.";
            return;
        }

        draft.ApplyTo(Catalogue);
        Layout = Layout.WithoutDraft();

        Status = $"Applied {draft.Resources.Length} resources and {draft.Crafts.Length} recipes changed or added, and {draft.Removed.Length} removed, at {at}.";
    }

    [UICommand]
    public void EntryClicked(string node)
    {
        Status = Find(node) switch
        {
            UICraft craft => $"{craft.Title ?? craft.Id}: {craft.Ingredients.Count} in, {craft.Products.Count} out, {craft.Time.TotalSeconds.ToString(CultureInfo.InvariantCulture)} s a run.",
            UIResource resource => $"{resource.Title}: {MadeBy(resource.Id)}.",
            _ => Status
        };
    }

    /// <summary>The layout forgotten: every entry goes back to where the layered layout puts it.</summary>
    [UICommand]
    public UICommandResult ResetLayout()
    {
        Layout = UIProductionDocument.Empty;
        Status = "The layout is the layered one again.";

        return UICommandResult.Ok([new DiscardFormEffect(CanvasForm)]);
    }

    private string MadeBy(string resource)
    {
        var count = 0;

        foreach (UIProductionEntry entry in Catalogue)
        {
            if (entry is not UICraft craft)
                continue;

            foreach (UICraftAmount product in craft.Products)
            {
                if (product.Resource == resource)
                    count++;
            }
        }

        return count == 0 ? "a raw resource" : $"made by {count} recipe{(count == 1 ? string.Empty : "s")}";
    }

    private UIProductionEntry? Find(string id)
    {
        foreach (UIProductionEntry entry in Catalogue)
        {
            if (string.Equals(entry.Id, id, StringComparison.Ordinal))
                return entry;
        }

        return null;
    }

    private static UIProductionEntry[] StartingCatalogue()
        =>
        [
            Resource("iron-ore", "Iron ore", MaterialIcons.Landscape, "Ores", Ores, cost: 1),
            Resource("copper-ore", "Copper ore", MaterialIcons.Diamond, "Ores", Ores, cost: 1),
            Resource("coal", "Coal", MaterialIcons.LocalFireDepartment, "Ores", Ores, cost: 1),
            Resource("water", "Water", MaterialIcons.WaterDrop, "Fluids", Fluids, unit: "L"),
            Resource("crude-oil", "Crude oil", MaterialIcons.OilBarrel, "Fluids", Fluids, unit: "L", cost: 0.1),
            Resource("uranium-ore", "Uranium ore", MaterialIcons.Hive, "Nuclear", Nuclear, cost: 2),
            Resource("iron-plate", "Iron plate", MaterialIcons.Layers, "Plates", Plates),
            Resource("copper-plate", "Copper plate", MaterialIcons.Stacks, "Plates", Plates),
            Resource("steel", "Steel", MaterialIcons.Hardware, "Plates", Plates),
            Resource("cable", "Copper cable", MaterialIcons.Cable, "Parts", Parts),
            Resource("gear", "Iron gear", MaterialIcons.Settings, "Parts", Parts),
            Resource("circuit", "Circuit", MaterialIcons.Memory, "Parts", Parts),
            Resource("heavy-oil", "Heavy oil", MaterialIcons.Propane, "Fluids", Fluids, unit: "L"),
            Resource("light-oil", "Light oil", MaterialIcons.GasMeter, "Fluids", Fluids, unit: "L"),
            Resource("petroleum", "Petroleum gas", MaterialIcons.Whatshot, "Fluids", Fluids, unit: "L"),
            Resource("plastic", "Plastic", MaterialIcons.Category, "Parts", Parts),
            Resource("uranium-235", "Uranium-235", MaterialIcons.Atr, "Nuclear", Nuclear),
            Resource("uranium-238", "Uranium-238", MaterialIcons.Science, "Nuclear", Nuclear),

            Craft("smelt-iron", "Iron smelting", 3.2, [("iron-ore", 1)], [("iron-plate", 1)]),
            Craft("smelt-copper", "Copper smelting", 3.2, [("copper-ore", 1)], [("copper-plate", 1)]),
            Craft("smelt-steel", "Steel", 16, [("iron-plate", 5)], [("steel", 1)]),
            Craft("draw-cable", "Cable drawing", 0.5, [("copper-plate", 1)], [("cable", 2)]),
            Craft("cut-gear", "Gear cutting", 0.5, [("iron-plate", 2)], [("gear", 1)]),
            Craft("assemble-circuit", "Circuit assembly", 0.5, [("iron-plate", 1), ("cable", 3)], [("circuit", 1)]),
            // One run, three fluids: the by-products are why a craft is a junction and not an edge.
            Craft("refine-oil", "Oil refining", 5, [("crude-oil", 100), ("water", 50)], [("heavy-oil", 25), ("light-oil", 45), ("petroleum", 55)]),
            Craft("crack-heavy", "Heavy oil cracking", 2, [("heavy-oil", 40), ("water", 30)], [("light-oil", 30)]),
            Craft("make-plastic", "Plastic", 1, [("petroleum", 20), ("coal", 1)], [("plastic", 2)]),
            Craft("process-uranium", "Uranium processing", 12, [("uranium-ore", 10)], [("uranium-235", 0.007), ("uranium-238", 0.993)]),
            // The cycle: enrichment takes uranium-235 in and gives more of it back.
            Craft("enrich-uranium", "Enrichment", 60, [("uranium-235", 40), ("uranium-238", 5)], [("uranium-235", 41), ("uranium-238", 2)])
        ];

    private static UIResource Resource(string id, string title, string icon, string category, string color, string? unit = null, double? cost = null)
        => new(id) { Title = title, Icon = icon, Category = category, Color = color, Unit = unit, Cost = cost };

    private static UICraft Craft(string id, string title, double seconds, (string Resource, double Amount)[] ingredients, (string Resource, double Amount)[] products)
        => new(id)
        {
            Title = title,
            Time = TimeSpan.FromSeconds(seconds),
            Ingredients = Array.ConvertAll(ingredients, static amount => new UICraftAmount(amount.Resource, amount.Amount)),
            Products = Array.ConvertAll(products, static amount => new UICraftAmount(amount.Resource, amount.Amount))
        };
}
