using System;
using System.Globalization;
using NE.Standard.UI.Abstractions.Effects;
using NE.Standard.UI.Abstractions.Recursive;
using NE.Standard.UI.Controllers;
using NE.Standard.UI.Graph;
using NE.Standard.UI.Primitives.Annotations;
using NE.Standard.UI.Shell.Commands;

namespace DemoApp.Graph;

/// <summary>
/// The battery and the drink put to planning: the viewer names how many of each, the canvas solves the runs in the browser and
/// draws them, and a save brings the request here, where the package's own planner answers the same question on the server.
/// </summary>
/// <remarks>
/// The catalogue is the chain page's with one recipe more — a second way to smelt ferrium, sooner and hungrier — so that what the
/// plan makes least is a choice the viewer can see being made. It starts at six of each a minute, which is 180 originium ore, 120 ferrium ore and 75 clean water.
/// </remarks>
internal sealed partial class PlanController : UIControllerBase
{
    public const string CanvasId = "chain-plan";

    /// <summary>The form the plan is held in until it is saved.</summary>
    public const string CanvasForm = "chain-plan-document";

    private static readonly UIProductionDocument StartingPlan = UIProductionDocument.Empty.WithPlan(
        new UIProductionPlanRequest([new UIProductionTarget(ChainController.Battery, 6), new UIProductionTarget(ChainController.Drink, 6)], UIProductionPeriod.Minute)
    );

    [RecursiveMember(false)]
    public RecursiveCollection<UIProductionEntry> Catalogue { get; } =
    [
        .. ChainController.StartingCatalogue(),
        ChainController.Craft("blast-ferrium", "Ferrium (blast)", 1, [("ferrium-ore", 3)], [("ferrium", 2)])
    ];

    [RecursiveMember]
    public partial UIProductionDocument Plan { get; set; } = StartingPlan;

    [RecursiveMember]
    public partial UIProductionMode Mode { get; set; } = UIProductionMode.Plan;

    [RecursiveMember]
    public partial bool ReadOnly { get; set; }

    [RecursiveMember]
    public partial string Status { get; set; } = "Six batteries and six drinks a minute. Change an amount, add a target, or make the plan once — the sheet follows at once; a save asks the server the same.";

    /// <summary>The plan has landed: the server's own port of the solver answers it, and says what it found.</summary>
    [UICommand]
    public void Save()
    {
        UIProductionPlan plan = UIProductionPlanner.Solve(Catalogue, Plan.Plan);
        var at = DateTime.Now.ToString("HH:mm:ss", CultureInfo.InvariantCulture);

        Status = plan.Status switch
        {
            UIProductionPlanStatus.Solved => string.Create(CultureInfo.InvariantCulture, $"Saved at {at}. The server's plan: {plan.Crafts.Count} recipes run for {plan.Time.TotalSeconds:0.##} s and bring in {plan.Raw:0.##}."),
            UIProductionPlanStatus.Infeasible => $"Saved at {at}. The server finds no runs that reach these targets.",
            _ => $"Saved at {at}. Nothing is asked for yet."
        };
    }

    /// <summary>The plan and its layout forgotten: six of each a minute again, laid out by the layers.</summary>
    [UICommand]
    public UICommandResult Reset()
    {
        Plan = StartingPlan;
        Status = "Six of each a minute again, laid out by the layers.";

        return UICommandResult.Ok([new DiscardFormEffect(CanvasForm)]);
    }
}
