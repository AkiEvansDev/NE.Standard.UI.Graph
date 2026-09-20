using System;
using System.Text.Json;
using NE.Standard.UI.Authoring.Components;
using NE.Standard.UI.Graph;
using NE.Standard.UI.Primitives.Constants;
using NE.Standard.UI.Primitives.Styling;
using NE.Standard.UI.Web.Abstractions.Html;
using NE.Standard.UI.Web.Abstractions.Rendering;
using NE.Standard.UI.Web.Abstractions.Theming;
using NE.Standard.UI.Web.Renderers.Foundation;

namespace NE.Standard.UI.Web.Graph;

/// <summary>
/// The node canvas: catalogue and run-line setting on the root, editor templates, the picker, run line and log, over the base
/// canvas.
/// </summary>
public sealed class NodesComponentRenderer : GraphCanvasRendererBase<UINodeDocument>
{
    /// <summary>The catalogue, as JSON, on the root.</summary>
    public const string CatalogAttribute = "data-ui-graph-catalog";

    public const string RunProgressAttribute = "data-ui-graph-run-progress";

    public override string ComponentTypeKey => NodesComponent.ComponentTypeKey;

    protected override string KindName => "nodes";

    protected override UINodeDocument EmptyDocument => UINodeDocument.Empty;

    protected override void RenderKindSettings(WebRenderContext context, IHtmlElementBuilder root)
    {
        ArgumentNullException.ThrowIfNull(context);
        ArgumentNullException.ThrowIfNull(root);

        RenderFlagAttribute(context, root, NodesComponent.ShowRunProgressProperty, RunProgressAttribute);
        RenderCatalog(context, root);
    }

    /// <summary>The node kinds as one JSON attribute: the engine reads it once and builds the picker and every node from it.</summary>
    private static void RenderCatalog(WebRenderContext context, IHtmlElementBuilder root)
    {
        UINodeCatalog? catalog = ReadRenderValue<UINodeCatalog?>(context, NodesComponent.CatalogProperty, null);

        _ = root.Attribute(CatalogAttribute, JsonSerializer.Serialize(catalog?.Types ?? [], WireJson));
    }

    /// <summary>
    /// Framework components as templates the engine clones: one per editable pin plus the list buttons. Value, read-only and
    /// enabled state (including a trailing button's) are the engine's to set on each clone.
    /// </summary>
    protected override void RenderKindTemplates(WebRenderContext context, IHtmlElementBuilder root)
    {
        ArgumentNullException.ThrowIfNull(context);
        ArgumentNullException.ThrowIfNull(root);

        UINodeCatalog? catalog = ReadRenderValue<UINodeCatalog?>(context, NodesComponent.CatalogProperty, null);

        RenderTemplate(context, root, UIGraphRegions.ListRemove, IVisualComponent.EnabledProperty);
        RenderTemplate(context, root, UIGraphRegions.ListAdd, IVisualComponent.EnabledProperty);

        foreach (UINodeType type in catalog?.Types ?? [])
        {
            foreach (UINodePin pin in type.Inputs)
                RenderTemplate(context, root, UIGraphRegions.Editor(type.Key, pin.Name), IInputComponent.ValueProperty, IInputComponent.IsReadOnlyProperty);
        }
    }

    protected override void RenderAfterViewport(WebRenderContext context, IHtmlElementBuilder root)
        => RenderPicker(context, root, GraphStrings.AddNode, GraphStrings.NoKinds);

    /// <summary>
    /// The progress line along the canvas's top: two tracks (whole run, current node's steps), with the node's name and share
    /// done. Persists between runs; empty here, filled by the engine.
    /// </summary>
    protected override void RenderViewportHead(WebRenderContext context, IHtmlElementBuilder viewport)
    {
        ArgumentNullException.ThrowIfNull(context);
        ArgumentNullException.ThrowIfNull(viewport);

        _ = viewport.Element("div", run =>
        {
            _ = run.Class($"{ClassName}__run");
            _ = run.Attribute("data-ui-graph-run");
            _ = run.Attribute("role", "progressbar");
            _ = run.Attribute("aria-label", context.Translate(GraphStrings.RunProgress));
            _ = run.Attribute("aria-valuemin", "0");
            _ = run.Attribute("aria-valuemax", "100");

            _ = run.Element("div", track => _ = track.Class($"{ClassName}__run-track {ClassName}__run-track--run"));
            _ = run.Element("div", track => _ = track.Class($"{ClassName}__run-track {ClassName}__run-track--step"));

            _ = run.Element("span", label =>
            {
                _ = label.Class($"{ClassName}__run-label");
                _ = label.Attribute("data-ui-graph-run-label");
            });

            _ = run.Element("span", share =>
            {
                _ = share.Class($"{ClassName}__run-share");
                _ = share.Attribute("data-ui-graph-run-share");
            });
        });
    }

    /// <summary>
    /// The log at the canvas's foot, folded to a strip until pressed: what nodes wrote and what stopped them, each line naming its
    /// node. The strip carries a count; lines are the engine's to write.
    /// </summary>
    protected override void RenderViewportFoot(WebRenderContext context, IHtmlElementBuilder viewport)
    {
        ArgumentNullException.ThrowIfNull(context);
        ArgumentNullException.ThrowIfNull(viewport);

        _ = viewport.Element("div", log =>
        {
            _ = log.Class($"{ClassName}__log");
            _ = log.Attribute("data-ui-graph-log");

            _ = log.Element("ol", entries =>
            {
                _ = entries.Class($"{ClassName}__log-entries");
                _ = entries.Attribute("role", "log");
                _ = entries.Attribute("aria-label", context.Translate(GraphStrings.Log));
                _ = entries.Attribute("data-ui-graph-log-entries");
                _ = entries.Attribute("data-ui-graph-log-empty-word", context.Translate(GraphStrings.LogEmpty));
            });

            // Under the lines, so the strip stays where it was pressed and a second press folds the log again.
            _ = log.Element("div", head =>
            {
                _ = head.Class($"{ClassName}__log-head");

                _ = head.Element("button", toggle =>
                {
                    _ = toggle.Class($"{ClassName}__log-toggle");
                    _ = toggle.Attribute("type", "button");
                    _ = toggle.Attribute("aria-expanded", "false");
                    _ = toggle.Attribute("data-ui-graph-log-toggle");

                    _ = toggle.Element("span", mark =>
                    {
                        _ = mark.Class($"{ClassName}__log-chevron");
                        _ = mark.Attribute("aria-hidden", "true");
                        IconValueRenderer.RenderIcon(mark, UIGlyphs.ChevronUp);
                    });

                    _ = toggle.Element("span", word => _ = word.Text(context.Translate(GraphStrings.Log)));

                    // The framework's own count badge; the engine writes the count and the style of the worst line.
                    _ = toggle.Element("span", count =>
                    {
                        _ = count.Class("ui-badge");
                        _ = count.Class(WebClassNames.BadgeStyle(UIBadgeType.Surface));
                        _ = count.Class($"{ClassName}__log-count");
                        _ = count.Attribute("data-ui-graph-log-count");
                        _ = count.Attribute("hidden");
                        _ = count.Element("span", text => _ = text.Class("ui-badge__text"));
                    });
                });

                // On the strip rather than over the sheet: it is a word about the canvas as a whole, and the strip is always there.
                RenderSaveState(context, head);

                _ = head.Element("button", clear =>
                {
                    var word = context.Translate(GraphStrings.ClearLog);

                    _ = clear.Class($"{ClassName}__log-clear");
                    _ = clear.Attribute("type", "button");
                    _ = clear.Attribute("title", word);
                    _ = clear.Attribute("aria-label", word);
                    _ = clear.Attribute("data-ui-graph-log-clear");
                    IconValueRenderer.RenderIcon(clear, UIGlyphs.Delete);
                });
            });
        });
    }

}
