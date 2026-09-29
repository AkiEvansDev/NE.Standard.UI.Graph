using System;
using NE.Standard.UI.Authoring.Components;
using NE.Standard.UI.Graph;
using NE.Standard.UI.Web.Abstractions.Html;
using NE.Standard.UI.Web.Abstractions.Rendering;

namespace NE.Standard.UI.Web.Graph;

/// <summary>
/// The production graph: resources and crafts laid out in layers, and, for a planning graph, the trailing plan panel and the
/// resource picker.
/// </summary>
public sealed class ProductionGraphComponentRenderer : LayeredGraphRendererBase<UIProductionDocument, UIProductionEntry>
{
    /// <summary>The collection sink a production graph's bound catalogue arrives through.</summary>
    public const string SinkKind = "production";

    /// <summary>Which of its two uses the graph is put to, on the root.</summary>
    public const string ModeAttribute = "data-ui-graph-mode";

    public override string ComponentTypeKey => ProductionGraphComponent.ComponentTypeKey;

    protected override string KindName => SinkKind;

    protected override UIProductionDocument EmptyDocument => UIProductionDocument.Empty;

    protected override void RenderKindSettings(WebRenderContext context, IHtmlElementBuilder root)
    {
        base.RenderKindSettings(context, root);

        _ = RenderProperty<UIProductionMode?>(context, root, ProductionGraphComponent.ModeProperty, static (target, value) =>
            _ = target.Attribute(ModeAttribute, GraphConverters.ProductionModeName(value ?? UIProductionMode.Constructor))
        , [WebDomOperation.Attribute(ModeAttribute, target: "root", converter: GraphConverters.ProductionModeAttribute)]);
    }

    /// <summary>
    /// The plan panel on the sheet's trailing side: targets, period and objective fields, and tables the engine fills from the
    /// solved plan.
    /// </summary>
    /// <remarks>Always in the markup; the stylesheet shows it only for a planning graph.</remarks>
    protected override void RenderViewportFoot(WebRenderContext context, IHtmlElementBuilder viewport)
    {
        ArgumentNullException.ThrowIfNull(context);
        ArgumentNullException.ThrowIfNull(viewport);

        RenderSidePanel(context, viewport, "plan", GraphStrings.Plan, "data-ui-graph-plan", null, folded: false, body =>
        {
            RenderPlanRequest(context, body);

            _ = body.Element("p", message =>
            {
                _ = message.Class($"{ClassName}__plan-message");
                _ = message.Attribute("data-ui-graph-plan-message");
                _ = message.Attribute("aria-live", "polite");
            });

            _ = body.Element("p", totals =>
            {
                _ = totals.Class($"{ClassName}__plan-totals");
                _ = totals.Attribute("data-ui-graph-plan-totals");
                _ = totals.Attribute("hidden");
            });

            RenderPlanTable(context, body, "raw", GraphStrings.PlanBroughtIn, [GraphStrings.PlanResource, GraphStrings.PlanAmount]);
            RenderPlanTable(context, body, "resources", GraphStrings.PlanResources, [GraphStrings.PlanResource, GraphStrings.PlanMade, GraphStrings.PlanTaken, GraphStrings.PlanLeft]);
            RenderPlanTable(context, body, "crafts", GraphStrings.PlanCrafts, [GraphStrings.Recipe, GraphStrings.PlanRuns, GraphStrings.PlanTime, GraphStrings.PlanWorkers]);
        });
    }

    /// <summary>What is asked of the plan: the targets, each the engine's row over the amount template, and the two choices.</summary>
    private void RenderPlanRequest(WebRenderContext context, IHtmlElementBuilder body)
    {
        _ = body.Element("div", caption =>
        {
            _ = caption.Class($"{ClassName}__plan-caption");
            WebWords.Write(context, caption, null, GraphStrings.PlanTargets);
        });

        _ = body.Element("div", targets =>
        {
            _ = targets.Class($"{ClassName}__plan-targets");
            _ = targets.Attribute("data-ui-graph-plan-targets");
        });

        _ = body.Element("div", add =>
        {
            _ = add.Class($"{ClassName}__plan-add");
            _ = add.Attribute("data-ui-graph-plan-add");
            RenderRegion(context, add, UIGraphRegions.PlanAdd, IVisualComponent.EnabledProperty);
        });

        _ = body.Element("div", fields =>
        {
            _ = fields.Class($"{ClassName}__plan-fields");

            _ = fields.Element("div", period =>
            {
                _ = period.Attribute("data-ui-graph-plan-period");
                RenderRegion(context, period, UIGraphRegions.PlanPeriod, IInputComponent.ValueProperty, IInputComponent.IsReadOnlyProperty);
            });

            _ = fields.Element("div", objective =>
            {
                _ = objective.Attribute("data-ui-graph-plan-objective");
                RenderRegion(context, objective, UIGraphRegions.PlanObjective, IInputComponent.ValueProperty, IInputComponent.IsReadOnlyProperty);
            });
        });
    }

    /// <summary>
    /// One table of the answer: caption and heads here, rows the engine's. The caption carries the period suffix (<c>/min</c>) — a
    /// per-cell or per-header suffix left no room.
    /// </summary>
    private void RenderPlanTable(WebRenderContext context, IHtmlElementBuilder body, string name, string captionKey, string[] heads)
    {
        _ = body.Element("section", section =>
        {
            _ = section.Class($"{ClassName}__plan-section");
            _ = section.Attribute("data-ui-graph-plan-section", name);
            _ = section.Attribute("hidden");

            _ = section.Element("div", caption =>
            {
                _ = caption.Class($"{ClassName}__plan-caption");
                _ = caption.Attribute("data-ui-graph-plan-counted");
                WebWords.Write(context, caption, null, captionKey);
            });

            _ = section.Element("table", table =>
            {
                _ = table.Class($"{ClassName}__plan-table");

                _ = table.Element("thead", head => _ = head.Element("tr", row =>
                {
                    foreach (var key in heads)
                        _ = row.Element("th", cell => WebWords.Write(context, cell, null, key));
                }));

                _ = table.Element("tbody", rows => _ = rows.Attribute("data-ui-graph-plan-rows", name));
            });
        });
    }

    /// <summary>The edge menu every layered graph has, the menu a dropped link asks its question in, and the parts of a target's row the engine clones.</summary>
    protected override void RenderKindTemplates(WebRenderContext context, IHtmlElementBuilder root)
    {
        base.RenderKindTemplates(context, root);

        RenderContextMenuRegion(context, root, UIGraphMenus.Link, UIGraphMenus.Link);
        RenderTemplate(context, root, UIGraphRegions.PlanAmount, IInputComponent.ValueProperty, IInputComponent.IsReadOnlyProperty);
        RenderTemplate(context, root, UIGraphRegions.PlanRemove, IVisualComponent.EnabledProperty);
    }

    protected override void RenderAfterViewport(WebRenderContext context, IHtmlElementBuilder root)
        => RenderPicker(context, root, GraphStrings.AddTarget, GraphStrings.NoResources);
}
