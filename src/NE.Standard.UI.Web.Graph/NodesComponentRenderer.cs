using System;
using System.Text.Json;
using NE.Standard.UI.Authoring.Components;
using NE.Standard.UI.Graph;
using NE.Standard.UI.Primitives.Constants;
using NE.Standard.UI.Primitives.Styling;
using NE.Standard.UI.Web.Abstractions.Html;
using NE.Standard.UI.Web.Abstractions.Rendering;
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

    /// <summary>On the root of a canvas that draws the run's progress line.</summary>
    public const string RunProgressAttribute = "data-ui-graph-run-progress";

    /// <summary>On the root of a canvas that shows its run panel.</summary>
    public const string RunPanelAttribute = "data-ui-graph-run-panel";

    /// <summary>On the root of a canvas that sets its parameters out in a panel, and offers an input's menu entry for it.</summary>
    public const string ParametersAttribute = "data-ui-graph-parameters";

    public override string ComponentTypeKey => NodesComponent.ComponentTypeKey;

    protected override string KindName => "nodes";

    protected override UINodeDocument EmptyDocument => UINodeDocument.Empty;

    protected override void RenderKindSettings(WebRenderContext context, IHtmlElementBuilder root)
    {
        ArgumentNullException.ThrowIfNull(context);
        ArgumentNullException.ThrowIfNull(root);

        RenderFlagAttribute(context, root, NodesComponent.ShowRunProgressProperty, RunProgressAttribute);
        RenderFlagAttribute(context, root, NodesComponent.ShowRunPanelProperty, RunPanelAttribute);
        RenderFlagAttribute(context, root, NodesComponent.ShowParametersProperty, ParametersAttribute);
        RenderCatalog(context, root);

        // Beside the node, group and edge menus the canvas renders for every kind: a node canvas's pins have one of their own.
        RenderContextMenuRegion(context, root, UIGraphMenus.Pin, UIGraphMenus.Pin);
    }

    /// <summary>The node kinds as one JSON attribute: the engine reads it once and builds the picker and every node from it.</summary>
    private static void RenderCatalog(WebRenderContext context, IHtmlElementBuilder root)
    {
        UINodeCatalog? catalog = ReadRenderValue<UINodeCatalog?>(context, NodesComponent.CatalogProperty, null);

        _ = root.Attribute(CatalogAttribute, JsonSerializer.Serialize(catalog?.Types ?? [], WireJson));
    }

    /// <summary>Framework components as templates the engine clones: one per editable pin plus the list buttons.</summary>
    /// <remarks>Value, read-only and enabled state (a trailing button's too) are the engine's to set on each clone.</remarks>
    protected override void RenderKindTemplates(WebRenderContext context, IHtmlElementBuilder root)
    {
        ArgumentNullException.ThrowIfNull(context);
        ArgumentNullException.ThrowIfNull(root);

        UINodeCatalog? catalog = ReadRenderValue<UINodeCatalog?>(context, NodesComponent.CatalogProperty, null);

        RenderTemplate(context, root, UIGraphRegions.ListRemove, IVisualComponent.EnabledProperty);
        RenderTemplate(context, root, UIGraphRegions.ListAdd, IVisualComponent.EnabledProperty);
        RenderTemplate(context, root, UIGraphRegions.StateReset, IVisualComponent.EnabledProperty);

        foreach (UINodeType type in catalog?.Types ?? [])
        {
            foreach (UINodePin pin in type.Inputs)
                RenderTemplate(context, root, UIGraphRegions.Editor(type.Key, pin.Name), IInputComponent.ValueProperty, IInputComponent.IsReadOnlyProperty);
        }
    }

    protected override void RenderAfterViewport(WebRenderContext context, IHtmlElementBuilder root)
        => RenderPicker(context, root, GraphStrings.AddNode, GraphStrings.NoKinds);

    /// <summary>
    /// The progress line along the canvas's top: two tracks (whole run, current node's steps), with the node's name and share done.
    /// </summary>
    /// <remarks>Persists between runs; empty here, filled by the engine.</remarks>
    protected override void RenderViewportHead(WebRenderContext context, IHtmlElementBuilder viewport)
    {
        ArgumentNullException.ThrowIfNull(context);
        ArgumentNullException.ThrowIfNull(viewport);

        _ = viewport.Element("div", run =>
        {
            _ = run.Class($"{ClassName}__run");
            _ = run.Attribute("data-ui-graph-run");
            _ = run.Attribute("role", "progressbar");
            WebWords.Write(context, run, "aria-label", GraphStrings.RunProgress);
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

        // The run panel in the top corner, as the zoom bar stands in the bottom one; drawn always, shown by the root's flag, so a
        // bound ShowRunPanel shows and hides it without a render.
        _ = viewport.Element("div", panel =>
        {
            _ = panel.Class($"{ClassName}__run-panel");
            _ = panel.Attribute(WebAttributes.NoContextMenu);

            RenderBarButton(context, panel, "data-ui-graph-run-once", GraphStrings.Run, UIGlyphs.Play);
            RenderBarButton(context, panel, "data-ui-graph-run-all", GraphStrings.RunAll, UIGlyphs.FastForward);
            RenderBarButton(context, panel, "data-ui-graph-run-stop", GraphStrings.Stop, UIGlyphs.Stop);
        });

        RenderParametersPanel(context, viewport);
    }

    /// <summary>The parameters panel under the run panel, a row per input set out as a parameter, which the engine writes.</summary>
    /// <remarks>
    /// Always in the markup, shown by the root's flag as the run panel is; folded until the viewer opens it, its gear alone, so the
    /// sheet opens clear.
    /// </remarks>
    private void RenderParametersPanel(WebRenderContext context, IHtmlElementBuilder viewport)
        => RenderSidePanel(context, viewport, "parameters", GraphStrings.Parameters, "data-ui-graph-parameters-panel", UIGlyphs.Settings, folded: true, body =>
        {
            _ = body.Element("div", list =>
            {
                _ = list.Class($"{ClassName}__parameters-list");
                _ = list.Attribute("data-ui-graph-parameters-list");
            });

            _ = body.Element("p", empty =>
            {
                _ = empty.Class($"{ClassName}__parameters-empty");
                WebWords.Write(context, empty, null, GraphStrings.ParametersEmpty);
            });
        });

    /// <summary>
    /// The log at the canvas's foot, folded to a strip until pressed: what nodes wrote and what stopped them, each line naming its
    /// node.
    /// </summary>
    /// <remarks>The strip carries a count; lines are the engine's to write.</remarks>
    protected override void RenderViewportFoot(WebRenderContext context, IHtmlElementBuilder viewport)
    {
        ArgumentNullException.ThrowIfNull(context);
        ArgumentNullException.ThrowIfNull(viewport);

        _ = viewport.Element("div", log =>
        {
            _ = log.Class($"{ClassName}__log");
            _ = log.Attribute(WebAttributes.NoContextMenu);
            _ = log.Attribute("data-ui-graph-log");

            _ = log.Element("ol", entries =>
            {
                _ = entries.Class($"{ClassName}__log-entries");
                _ = entries.Attribute("role", "log");
                WebWords.Write(context, entries, "aria-label", GraphStrings.Log);
                _ = entries.Attribute("data-ui-graph-log-entries");
                // Read by the stylesheet (content: attr()), so marked like any other word a switch writes again.
                WebWords.Write(context, entries, "data-ui-graph-log-empty-word", GraphStrings.LogEmpty);
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

                    _ = toggle.Element("span", word => WebWords.Write(context, word, null, GraphStrings.Log));

                    // The framework's own count badge; the engine writes the count and the style of the worst line.
                    BadgeRenderer.RenderCountBadge(toggle, UIBadgeType.Surface, configure: count =>
                    {
                        _ = count.Class($"{ClassName}__log-count");
                        _ = count.Attribute("data-ui-graph-log-count");
                        _ = count.Attribute("hidden");
                    });
                });

                // On the strip rather than over the sheet: it is a word about the canvas as a whole, and the strip is always there.
                RenderSaveState(context, head);

                _ = head.Element("button", clear =>
                {
                    _ = clear.Class($"{ClassName}__log-clear");
                    _ = clear.Attribute("type", "button");
                    WebWords.Write(context, clear, WebAttributes.Tooltip, GraphStrings.ClearLog);
                    WebWords.Write(context, clear, "aria-label", GraphStrings.ClearLog);
                    _ = clear.Attribute("data-ui-graph-log-clear");
                    IconValueRenderer.RenderIcon(clear, UIGlyphs.Delete);
                });
            });
        });
    }
}
