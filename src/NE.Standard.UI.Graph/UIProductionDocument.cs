using System.Text.Json.Serialization;

namespace NE.Standard.UI.Graph;

/// <summary>
/// The production graph's document: the layout from <see cref="UIGraphDocumentBase"/>, the draft of catalogue changes and, in
/// <see cref="UIProductionMode.Plan"/>, the requested plan.
/// </summary>
/// <remarks>
/// Resources and crafts are the bound collection's, not the document's; edge ids follow
/// <see cref="UIProductionDraft.IngredientEdge"/>/<see cref="UIProductionDraft.ProductEdge"/>.
/// </remarks>
[method: JsonConstructor]
public sealed class UIProductionDocument(UIGraphPlacement[]? nodes = null, UIGraphRoute[]? edges = null, UIGraphGroup[]? groups = null, UIProductionDraft? draft = null, UIProductionPlanRequest? plan = null, string? key = null)
    : UIGraphDocumentBase(nodes, edges, groups, key)
{
    /// <summary>
    /// Gets the empty document.
    /// </summary>
    public static UIProductionDocument Empty { get; } = new();

    /// <summary>
    /// Gets what the viewer changed about the resources and crafts since the last save, for the application to apply.
    /// </summary>
    public UIProductionDraft Draft { get; } = draft ?? UIProductionDraft.Empty;

    /// <summary>
    /// Gets what the viewer asked the graph to plan; <see cref="UIProductionPlanner"/> answers it on the server as the canvas does
    /// in the browser.
    /// </summary>
    public UIProductionPlanRequest Plan { get; } = plan ?? UIProductionPlanRequest.Empty;

    /// <summary>
    /// The same layout and plan with the draft taken off — what an application puts back once it has applied the draft to its catalogue.
    /// </summary>
    public UIProductionDocument WithoutDraft()
        => new(Nodes, Edges, Groups, plan: Plan, key: Key);

    /// <summary>
    /// The same document asking for another plan — how an application names the targets itself.
    /// </summary>
    public UIProductionDocument WithPlan(UIProductionPlanRequest plan)
        => new(Nodes, Edges, Groups, Draft, plan, Key);

    /// <summary>
    /// The same document under another key — how an application names the document it puts on the canvas.
    /// </summary>
    public UIProductionDocument WithKey(string? key)
        => new(Nodes, Edges, Groups, Draft, Plan, key);
}
