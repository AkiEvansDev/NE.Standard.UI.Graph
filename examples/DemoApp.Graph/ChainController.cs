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
/// What an LC Wuling Battery and a Jincao Drink take, all the way down to the ores, the water and the seeds: two chains of a real
/// game's recipes. Twenty-five resources, one recipe each, three plants grown from their own seeds — which the canvas draws as backward
/// edges — and intermediates the two chains share: the water, and the sandleaf powder both dense powders take.
/// </summary>
/// <remarks>
/// The numbers and the names are the game's; the drawings are not. A glyph of the icon pack
/// the demo registered stands for each resource's kind — ore, ingot, powder, bottle, plant, seed — and the colour for its family.
/// </remarks>
internal sealed partial class ChainController : UIControllerBase
{
    public const string CanvasId = "chain";

    /// <summary>The form the layout is held in until it is saved.</summary>
    public const string CanvasForm = "chain-layout";

    /// <summary>The two things the chains end in: what the plan page asks for.</summary>
    public const string Battery = "lc-wuling-battery";
    public const string Drink = "jincao-drink";

    // A family reads as a colour: what ferrium becomes, what grows in the sand, the buckflower and its carbon, the originium, the
    // jincao, the water, and the two things it all ends in.
    private const string Ferrium = "var(--ui-color-series-1)";
    private const string Originium = "var(--ui-color-series-2)";
    private const string Sandleaf = "var(--ui-color-series-3)";
    private const string Buckflower = "var(--ui-color-series-4)";
    private const string Goods = "var(--ui-color-series-5)";
    private const string Jincao = "var(--ui-color-series-6)";
    private const string Water = "var(--ui-color-series-7)";

    // The third chain, which arrives while the page runs: a Buck Capsule [A], over the ferrium, the sandleaf powder and the
    // buckflower the first two already have.
    private static readonly string[] Arriving = ["ferrium-powder", "dense-ferrium-powder", "steel", "steel-bottle", "buckflower-powder", "ground-buckflower-powder", "buck-capsule-a"];

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
    public partial string Status { get; set; } = "A battery is xiranite and dense originium powder, a drink a filled bottle and ferrium parts; the water and the sandleaf powder go into both chains.";

    /// <summary>The Buck Capsule's chain arrives in the catalogue while the page runs, joined to what is already there.</summary>
    [UICommand]
    public void AddCapsule()
    {
        if (Find("buck-capsule-a") is not null)
        {
            Status = "The capsule is in the catalogue already.";
            return;
        }

        foreach (UIProductionEntry entry in CapsuleChain())
            Catalogue.Add(entry);

        Status = "A Buck Capsule [A] takes steel bottles — ferrium again — and ground buckflower powder, over the sandleaf powder the dense powders already share.";
    }

    [UICommand]
    public void RemoveCapsule()
    {
        var removed = false;

        foreach (var id in Arriving)
        {
            if (Find("make-" + id) is UIProductionEntry craft)
                removed = Catalogue.Remove(craft) || removed;

            if (Find(id) is UIProductionEntry resource)
                removed = Catalogue.Remove(resource) || removed;
        }

        Status = removed ? "The capsule's chain is gone." : "Nothing was added.";
    }

    /// <summary>The layout has landed with the draft of what the viewer changed: the draft is applied and the layout kept without it.</summary>
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

    /// <summary>A resource pressed says what makes it and what it goes into; a recipe, what one run of it does.</summary>
    [UICommand]
    public void EntryClicked(string node)
    {
        Status = Find(node) switch
        {
            UICraft craft => $"{craft.Title ?? craft.Id}: {craft.Time.TotalSeconds.ToString(CultureInfo.InvariantCulture)} s a run.",
            UIResource resource => $"{resource.Title} goes into {Consumers(resource.Id)}.",
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

    private string Consumers(string resource)
    {
        var count = 0;

        foreach (UIProductionEntry entry in Catalogue)
        {
            if (entry is not UICraft craft)
                continue;

            foreach (UICraftAmount ingredient in craft.Ingredients)
            {
                if (ingredient.Resource == resource)
                    count++;
            }
        }

        return count == 0 ? "nothing yet" : $"{count} recipe{(count == 1 ? string.Empty : "s")}";
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

    /// <summary>The two chains as the game has them: the resources, then the one recipe that makes each — a source has none.</summary>
    internal static UIProductionEntry[] StartingCatalogue()
        =>
        [
            Resource("originium-ore", "Originium Ore", MaterialIcons.Landscape, "Ores", Originium, cost: 3),
            Resource("ferrium-ore", "Ferrium Ore", MaterialIcons.Landscape, "Ores", Ferrium, cost: 1),
            Resource("clean-water", "Clean Water", MaterialIcons.WaterDrop, "Fluids", Water, cost: 0.5),

            Resource("originium-powder", "Originium Powder", MaterialIcons.Grain, "Powders", Originium),
            Resource("dense-originium-powder", "Dense Originium Powder", MaterialIcons.BlurOn, "Powders", Originium),
            Resource("sandleaf-seed", "Sandleaf Seed", MaterialIcons.Egg, "Seeds", Sandleaf),
            Resource("sandleaf", "Sandleaf", MaterialIcons.Grass, "Plants", Sandleaf),
            Resource("sandleaf-powder", "Sandleaf Powder", MaterialIcons.Grain, "Powders", Sandleaf),
            Resource("buckflower-seed", "Buckflower Seed", MaterialIcons.Spa, "Seeds", Buckflower),
            Resource("buckflower", "Buckflower", MaterialIcons.LocalFlorist, "Plants", Buckflower),
            Resource("carbon", "Carbon", MaterialIcons.Whatshot, "Carbon", Buckflower),
            Resource("carbon-powder", "Carbon Powder", MaterialIcons.Grain, "Powders", Buckflower),
            Resource("dense-carbon-powder", "Dense Carbon Powder", MaterialIcons.BlurOn, "Powders", Buckflower),
            Resource("stabilized-carbon", "Stabilized Carbon", MaterialIcons.Layers, "Carbon", Buckflower),
            Resource("xiranite", "Xiranite", MaterialIcons.Diamond, "Crystals", Goods),
            Resource(Battery, "LC Wuling Battery", MaterialIcons.BatteryChargingFull, "Goods", Goods),

            Resource("ferrium", "Ferrium", MaterialIcons.Hexagon, "Ingots", Ferrium),
            Resource("ferrium-part", "Ferrium Part", MaterialIcons.Settings, "Parts", Ferrium),
            Resource("ferrium-bottle", "Ferrium Bottle", MaterialIcons.WineBar, "Bottles", Ferrium),
            Resource("jincao-seed", "Jincao Seed", MaterialIcons.Egg, "Seeds", Jincao),
            Resource("jincao", "Jincao", MaterialIcons.Yard, "Plants", Jincao),
            Resource("jincao-powder", "Jincao Powder", MaterialIcons.Grain, "Powders", Jincao),
            Resource("jincao-solution", "Jincao Solution", MaterialIcons.Science, "Fluids", Jincao),
            Resource("ferrium-bottle-jincao", "Ferrium Bottle (Jincao)", MaterialIcons.Liquor, "Bottles", Jincao),
            Resource(Drink, "Jincao Drink", MaterialIcons.LocalDrink, "Goods", Goods),

            Craft("make-originium-powder", "Originium Powder", 2, [("originium-ore", 1)], [("originium-powder", 1)]),
            Craft("make-dense-originium-powder", "Dense Originium Powder", 2, [("originium-powder", 2), ("sandleaf-powder", 1)], [("dense-originium-powder", 1)]),
            // The cycles: a plant is grown from its seed, and the seeds are taken from the plant.
            Craft("make-sandleaf", "Sandleaf", 2, [("sandleaf-seed", 1)], [("sandleaf", 1)]),
            Craft("make-sandleaf-seed", "Sandleaf Seed", 2, [("sandleaf", 1)], [("sandleaf-seed", 2)]),
            Craft("make-sandleaf-powder", "Sandleaf Powder", 2, [("sandleaf", 1)], [("sandleaf-powder", 3)]),
            Craft("make-buckflower", "Buckflower", 2, [("buckflower-seed", 1)], [("buckflower", 1)]),
            Craft("make-buckflower-seed", "Buckflower Seed", 2, [("buckflower", 1)], [("buckflower-seed", 2)]),
            Craft("make-carbon", "Carbon", 2, [("buckflower", 1)], [("carbon", 1)]),
            Craft("make-carbon-powder", "Carbon Powder", 2, [("carbon", 1)], [("carbon-powder", 2)]),
            Craft("make-dense-carbon-powder", "Dense Carbon Powder", 2, [("carbon-powder", 2), ("sandleaf-powder", 1)], [("dense-carbon-powder", 1)]),
            Craft("make-stabilized-carbon", "Stabilized Carbon", 2, [("dense-carbon-powder", 1)], [("stabilized-carbon", 1)]),
            Craft("make-xiranite", "Xiranite", 2, [("stabilized-carbon", 2), ("clean-water", 1)], [("xiranite", 1)]),
            Craft("make-" + Battery, "LC Wuling Battery", 10, [("xiranite", 5), ("dense-originium-powder", 15)], [(Battery, 1)]),

            Craft("make-ferrium", "Ferrium", 2, [("ferrium-ore", 1)], [("ferrium", 1)]),
            Craft("make-ferrium-part", "Ferrium Part", 2, [("ferrium", 1)], [("ferrium-part", 1)]),
            Craft("make-ferrium-bottle", "Ferrium Bottle", 2, [("ferrium", 2)], [("ferrium-bottle", 1)]),
            // The jincao is watered as it grows, and gives two plants to a seed.
            Craft("make-jincao", "Jincao", 2, [("jincao-seed", 1), ("clean-water", 1)], [("jincao", 2)]),
            Craft("make-jincao-seed", "Jincao Seed", 2, [("jincao", 1)], [("jincao-seed", 1)]),
            Craft("make-jincao-powder", "Jincao Powder", 2, [("jincao", 1)], [("jincao-powder", 2)]),
            Craft("make-jincao-solution", "Jincao Solution", 2, [("jincao-powder", 1), ("clean-water", 1)], [("jincao-solution", 1)]),
            Craft("make-ferrium-bottle-jincao", "Ferrium Bottle (Jincao)", 2, [("ferrium-bottle", 1), ("jincao-solution", 1)], [("ferrium-bottle-jincao", 1)]),
            Craft("make-" + Drink, "Jincao Drink", 10, [("ferrium-part", 10), ("ferrium-bottle-jincao", 5)], [(Drink, 1)])
        ];

    /// <summary>The Buck Capsule [A]'s own part of its chain; the ferrium, the sandleaf powder and the buckflower are there already.</summary>
    private static UIProductionEntry[] CapsuleChain()
        =>
        [
            Resource("ferrium-powder", "Ferrium Powder", MaterialIcons.Grain, "Powders", Ferrium),
            Resource("dense-ferrium-powder", "Dense Ferrium Powder", MaterialIcons.BlurOn, "Powders", Ferrium),
            Resource("steel", "Steel", MaterialIcons.Hardware, "Ingots", Ferrium),
            Resource("steel-bottle", "Steel Bottle", MaterialIcons.Liquor, "Bottles", Ferrium),
            Resource("buckflower-powder", "Buckflower Powder", MaterialIcons.Grain, "Powders", Buckflower),
            Resource("ground-buckflower-powder", "Ground Buckflower Powder", MaterialIcons.BlurOn, "Powders", Buckflower),
            Resource("buck-capsule-a", "Buck Capsule [A]", MaterialIcons.Medication, "Goods", Goods),

            Craft("make-ferrium-powder", "Ferrium Powder", 2, [("ferrium", 1)], [("ferrium-powder", 1)]),
            Craft("make-dense-ferrium-powder", "Dense Ferrium Powder", 2, [("ferrium-powder", 2), ("sandleaf-powder", 1)], [("dense-ferrium-powder", 1)]),
            Craft("make-steel", "Steel", 2, [("dense-ferrium-powder", 1)], [("steel", 1)]),
            Craft("make-steel-bottle", "Steel Bottle", 2, [("steel", 2)], [("steel-bottle", 1)]),
            Craft("make-buckflower-powder", "Buckflower Powder", 2, [("buckflower", 1)], [("buckflower-powder", 2)]),
            Craft("make-ground-buckflower-powder", "Ground Buckflower Powder", 2, [("buckflower-powder", 2), ("sandleaf-powder", 1)], [("ground-buckflower-powder", 1)]),
            Craft("make-buck-capsule-a", "Buck Capsule [A]", 10, [("steel-bottle", 10), ("ground-buckflower-powder", 10)], [("buck-capsule-a", 1)])
        ];

    private static UIResource Resource(string id, string title, string icon, string category, string color, double? cost = null)
        => new(id) { Title = title, Icon = icon, Category = category, Color = color, Cost = cost };

    internal static UICraft Craft(string id, string title, double seconds, (string Resource, double Amount)[] ingredients, (string Resource, double Amount)[] products)
        => new(id)
        {
            Title = title,
            Time = TimeSpan.FromSeconds(seconds),
            Ingredients = Array.ConvertAll(ingredients, static amount => new UICraftAmount(amount.Resource, amount.Amount)),
            Products = Array.ConvertAll(products, static amount => new UICraftAmount(amount.Resource, amount.Amount))
        };
}
