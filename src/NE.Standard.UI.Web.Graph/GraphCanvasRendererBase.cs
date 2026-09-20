using System;
using System.Globalization;
using System.Text.Json;
using NE.Standard.UI.Abstractions.Binding.Addresses;
using NE.Standard.UI.Abstractions.Binding.Properties;
using NE.Standard.UI.Authoring.Components;
using NE.Standard.UI.Compiled.Models;
using NE.Standard.UI.Graph;
using NE.Standard.UI.Primitives.Constants;
using NE.Standard.UI.Web.Abstractions.Html;
using NE.Standard.UI.Web.Abstractions.Rendering;
using NE.Standard.UI.Web.Renderers.Foundation;

namespace NE.Standard.UI.Web.Graph;

/// <summary>
/// A canvas rendered as an empty frame: settings on the root, the document on a hidden value element, and empty layers (grid,
/// groups, edges, items) the client engine fills in.
/// </summary>
/// <remarks>Nothing of the document renders on the server: only the client engine can place, size and wire an item pixel-exact.</remarks>
public abstract class GraphCanvasRendererBase<TDocument> : TextContentRendererBase
    where TDocument : class
{
    /// <summary>Which kind of canvas the root is, and so which kind the engine draws it with.</summary>
    public const string KindAttribute = "data-ui-graph-kind";

    /// <summary>The document, as JSON, on the element that carries the value.</summary>
    public const string DocumentAttribute = "data-ui-graph-document";

    /// <summary>The CSS colours of the menus' colour choices, as a JSON array in their order, on the root.</summary>
    public const string ColorsAttribute = "data-ui-graph-colors";

    public const string EdgeShapeAttribute = "data-ui-graph-edge-shape";
    public const string ShowGridAttribute = "data-ui-graph-grid";
    public const string SnapAttribute = "data-ui-graph-snap";
    public const string FocusRingAttribute = "data-ui-graph-focus-ring";
    public const string MenuButtonAttribute = "data-ui-graph-menu-button";

    /// <summary>On the box the corner menu stands in: the menu's name, as a context menu's region carries its own.</summary>
    public const string MenuPanelAttribute = "data-ui-graph-menu-panel";
    public const string MinimapAttribute = "data-ui-graph-minimap";
    public const string HighlightAttribute = "data-ui-graph-highlight";
    public const string MinZoomAttribute = "data-ui-graph-min-zoom";
    public const string MaxZoomAttribute = "data-ui-graph-max-zoom";
    public const string ReadOnlyAttribute = "data-ui-graph-read-only";
    public const string GridSizeVariable = "--ui-graph-grid-size";
    public const string HeightVariable = "--ui-graph-height";

    /// <summary>On a template a part of the canvas is cloned from — a node's editor, a plan's amount: the region's name.</summary>
    public const string EditorTemplateAttribute = "data-ui-graph-editor";

    /// <summary>The value kind the document is read by, and the custom operation a pushed one arrives through.</summary>
    public const string ValueKind = "graph-document";

    // The wire's conventions, so the text a render writes is the text a patch would: camel-cased, an enum by its name.
    protected static readonly JsonSerializerOptions WireJson = WebWireJson.CreateOptions();

    protected override string ClassName => "ui-graph";

    /// <summary>The kind's name on the root, which the client's kind of the same name draws.</summary>
    protected abstract string KindName { get; }

    /// <summary>The document written when the value is unset.</summary>
    protected abstract TDocument EmptyDocument { get; }

    protected override void RenderComponent(WebRenderContext context, IHtmlElementBuilder root)
    {
        ArgumentNullException.ThrowIfNull(context);
        ArgumentNullException.ThrowIfNull(root);

        RenderTooltip(context, root);
        RenderInputHeader(context, root);
        RenderSettings(context, root);
        RenderKindSettings(context, root);
        RenderValue(context, root);
        RenderCanvas(context, root);
        RenderMenus(context, root);
        RenderKindTemplates(context, root);
        RenderValidationMessage(context, root);
    }

    private void RenderSettings(WebRenderContext context, IHtmlElementBuilder root)
    {
        _ = root.Attribute(KindAttribute, KindName);

        _ = RenderProperty<UIGraphEdgeShape?>(context, root, IGraphCanvasComponent.EdgeShapeProperty, static (target, value) =>
        {
            if (value is UIGraphEdgeShape shape)
                _ = target.Attribute(EdgeShapeAttribute, GraphConverters.EdgeShapeName(shape));
        }, [WebDomOperation.Attribute(EdgeShapeAttribute, target: "root", converter: GraphConverters.EdgeShapeAttribute)]);

        RenderFlagAttribute(context, root, IGraphCanvasComponent.ShowGridProperty, ShowGridAttribute);
        RenderFlagAttribute(context, root, IGraphCanvasComponent.SnapToGridProperty, SnapAttribute);
        RenderFlagAttribute(context, root, IGraphCanvasComponent.ShowFocusRingProperty, FocusRingAttribute);
        RenderFlagAttribute(context, root, IGraphCanvasComponent.ShowMenuButtonProperty, MenuButtonAttribute);
        RenderFlagAttribute(context, root, IGraphCanvasComponent.ShowMinimapProperty, MinimapAttribute);
        RenderFlagAttribute(context, root, IGraphCanvasComponent.HighlightOnHoverProperty, HighlightAttribute);
        RenderFlagAttribute(context, root, IInputComponent.IsReadOnlyProperty, ReadOnlyAttribute);

        RenderNumber(context, root, IGraphCanvasComponent.GridSizeProperty, GridSizeVariable, style: true);
        RenderNumber(context, root, IGraphCanvasComponent.MinZoomProperty, MinZoomAttribute, style: false);
        RenderNumber(context, root, IGraphCanvasComponent.MaxZoomProperty, MaxZoomAttribute, style: false);

        _ = RenderProperty<double?>(context, root, IGraphCanvasComponent.CanvasHeightProperty, static (target, value) =>
        {
            if (value is double height and > 0)
                _ = target.Style(HeightVariable, height.ToString(CultureInfo.InvariantCulture) + "rem");
        }, [WebDomOperation.Style(HeightVariable, target: "root", converter: GraphConverters.RemCss)]);
    }

    /// <summary>A number setting on the root, as an attribute or a CSS variable.</summary>
    protected static void RenderNumber(WebRenderContext context, IHtmlElementBuilder root, UIProperty property, string name, bool style)
    {
        _ = RenderProperty<double?>(context, root, property, (target, value) =>
        {
            if (value is not double number)
                return;

            var text = number.ToString(CultureInfo.InvariantCulture);

            _ = style ? target.Style(name, text) : target.Attribute(name, text);
        }, style ? [WebDomOperation.Style(name, target: "root")] : [WebDomOperation.Attribute(name, target: "root")]);
    }

    /// <summary>The kind's own settings and catalogue on the root.</summary>
    protected virtual void RenderKindSettings(WebRenderContext context, IHtmlElementBuilder root)
    {
    }

    /// <summary>What the kind carries after the menus — the templates its items' parts are cloned from.</summary>
    protected virtual void RenderKindTemplates(WebRenderContext context, IHtmlElementBuilder root)
    {
    }

    /// <summary>
    /// A framework component as a template the engine clones; the named properties are the engine's to set on each clone (value,
    /// read-only, enabled state).
    /// </summary>
    protected static void RenderTemplate(WebRenderContext context, IHtmlElementBuilder root, string region, params UIProperty[] exposed)
    {
        ArgumentNullException.ThrowIfNull(context);
        ArgumentNullException.ThrowIfNull(root);

        if (!context.ViewResolution.View.Graph.TryGetSlot(context.Node.ComponentId, UIComponentSlotKind.Region, out UIComponentSlot? slot, region))
            return;

        // A field's own trailing button — a picture address's choose-a-file — is a component of its own, exposed before the field
        // renders it.
        if (context.ViewResolution.View.Graph.TryGetSlot(slot.RootComponentId, UIComponentSlotKind.Region, out UIComponentSlot? action, RegionNames.TrailingAction))
            context.Metadata.ExposeProperty(new UIPropertyAddress(action.RootComponentId, IVisualComponent.EnabledProperty));

        _ = root.Element("template", template =>
        {
            _ = template.Attribute(EditorTemplateAttribute, region);
            RenderRegion(context, template, region, exposed);
        });
    }

    /// <summary>A catalogue dialog: search above, categories beside, entries below. Empty here; the engine fills it from what it holds.</summary>
    /// <remarks>
    /// A native <c>&lt;dialog&gt;</c>, not a z-indexed panel: the top layer, backdrop and Escape key come free, and the canvas's
    /// overflow can't clip it.
    /// </remarks>
    protected void RenderPicker(WebRenderContext context, IHtmlElementBuilder root, string titleKey, string emptyKey)
    {
        ArgumentNullException.ThrowIfNull(context);
        ArgumentNullException.ThrowIfNull(root);

        _ = root.Element("dialog", picker =>
        {
            _ = picker.Class($"{ClassName}__picker");
            _ = picker.Attribute("aria-label", context.Translate(titleKey));
            _ = picker.Attribute("data-ui-graph-picker");

            _ = picker.Element("div", head =>
            {
                _ = head.Class($"{ClassName}__picker-head");

                _ = head.Element("span", title =>
                {
                    _ = title.Class($"{ClassName}__picker-title");
                    _ = title.Text(context.Translate(titleKey));
                });

                // The core's text field, carried as a region; the engine reads the input inside it.
                _ = head.Element("div", search =>
                {
                    _ = search.Class($"{ClassName}__picker-search");
                    _ = search.Attribute("data-ui-graph-picker-search");
                    RenderRegion(context, search, UIGraphRegions.PickerSearch);
                });
            });

            _ = picker.Element("div", main =>
            {
                _ = main.Class($"{ClassName}__picker-main");

                _ = main.Element("div", rail =>
                {
                    _ = rail.Class($"{ClassName}__picker-rail");
                    _ = rail.Attribute("role", "tablist");
                    _ = rail.Attribute("aria-label", context.Translate(GraphStrings.Categories));
                    _ = rail.Attribute("data-ui-graph-picker-rail");
                });

                _ = main.Element("div", list =>
                {
                    _ = list.Class($"{ClassName}__picker-list");
                    _ = list.Attribute("role", "listbox");
                    _ = list.Attribute("data-ui-graph-picker-list");
                });
            });

            _ = picker.Element("div", empty =>
            {
                _ = empty.Class($"{ClassName}__picker-empty");
                _ = empty.Attribute("hidden");
                _ = empty.Attribute("data-ui-graph-picker-empty");
                _ = empty.Text(context.Translate(emptyKey));
            });
        });
    }

    /// <summary>
    /// The corner, node and group menus, each opened by the part naming it, plus the colours their colour entries paint — matched
    /// by the engine to what it draws.
    /// </summary>
    private static void RenderMenus(WebRenderContext context, IHtmlElementBuilder root)
    {
        UIGraphColorChoice[] choices = ReadRenderValue<UIGraphColorChoice[]?>(context, IGraphCanvasComponent.ColorChoicesProperty, null) ?? [];
        var colors = new string[choices.Length];

        for (var index = 0; index < choices.Length; index++)
            colors[index] = choices[index].Color;

        _ = root.Attribute(ColorsAttribute, JsonSerializer.Serialize(colors, WireJson));

        RenderContextMenuRegion(context, root, UIGraphMenus.Node, UIGraphMenus.Node);
        RenderContextMenuRegion(context, root, UIGraphMenus.Group, UIGraphMenus.Group);
    }

    /// <summary>
    /// The document on its own hidden element — the canvas's writable value. The engine writes the attribute and raises
    /// <c>change</c>; a server push arrives through the custom operation.
    /// </summary>
    private void RenderValue(WebRenderContext context, IHtmlElementBuilder root)
    {
        _ = root.Element("div", value =>
        {
            _ = value.Class($"{ClassName}__value");
            _ = value.Attribute("hidden");
            _ = value.Attribute(WebAttributes.ValueKind, ValueKind);

            // The form a save submits when the value is bound OnSubmit, and a DiscardFormEffect names.
            NativeInputRendererBase.RenderFormId(context, value);

            _ = RenderProperty<TDocument?>(context, value, IInputComponent.ValueProperty, (target, document) =>
                _ = target.Attribute(DocumentAttribute, JsonSerializer.Serialize(document ?? EmptyDocument, WireJson))
            , [WebDomOperation.Custom(ValueKind)]);
        });
    }

    private void RenderCanvas(WebRenderContext context, IHtmlElementBuilder root)
    {
        _ = root.Element("div", viewport =>
        {
            _ = viewport.Class($"{ClassName}__viewport");
            // The canvas takes the keyboard: Delete, the clipboard keys and Ctrl+S are its own, and it is reached by Tab.
            _ = viewport.Attribute("tabindex", "0");
            _ = viewport.Attribute("role", "application");
            _ = viewport.Attribute("aria-label", context.Translate(GraphStrings.Canvas));

            _ = viewport.Element("div", grid => _ = grid.Class($"{ClassName}__grid"));

            _ = viewport.Element("div", scene =>
            {
                _ = scene.Class($"{ClassName}__scene");

                _ = scene.Element("div", groups => _ = groups.Class($"{ClassName}__groups"));

                _ = scene.Element("svg", edges =>
                {
                    _ = edges.Class($"{ClassName}__edges");
                    _ = edges.Attribute("aria-hidden", "true");
                });

                _ = scene.Element("div", nodes => _ = nodes.Class($"{ClassName}__nodes"));

                // Inside the scene, so the band is drawn in the same coordinates the selection is worked out in.
                _ = scene.Element("div", marquee =>
                {
                    _ = marquee.Class($"{ClassName}__marquee");
                    _ = marquee.Attribute("hidden");
                });
            });

            RenderViewportHead(context, viewport);
            RenderMenuPanel(context, viewport);
            RenderViewportFoot(context, viewport);

            // The map stands over the zoom bar in one corner stack, so the two keep their places whatever the bar's width comes to.
            _ = viewport.Element("div", corner =>
            {
                _ = corner.Class($"{ClassName}__corner");

                RenderMinimap(context, corner);
                RenderBar(context, corner);
            });
        });

        RenderAfterViewport(context, root);
    }

    /// <summary>What the kind stands along the canvas's top, ahead of the menu button — a progress line.</summary>
    protected virtual void RenderViewportHead(WebRenderContext context, IHtmlElementBuilder viewport)
    {
    }

    /// <summary>What the kind stands along the canvas's foot, ahead of the corner — a log.</summary>
    protected virtual void RenderViewportFoot(WebRenderContext context, IHtmlElementBuilder viewport)
    {
    }

    /// <summary>What the kind carries beside the viewport rather than in it — a dialog, which stands in the page's top layer.</summary>
    protected virtual void RenderAfterViewport(WebRenderContext context, IHtmlElementBuilder root)
    {
    }

    /// <summary>
    /// The corner menu: every command the canvas has, versus the right-button menus which offer only what edits the part pressed.
    /// Carried as a region, folded to its switch.
    /// </summary>
    private void RenderMenuPanel(WebRenderContext context, IHtmlElementBuilder viewport)
    {
        _ = viewport.Element("div", panel =>
        {
            _ = panel.Class($"{ClassName}__menu-panel");
            _ = panel.Attribute(MenuPanelAttribute, UIGraphMenus.Main);
            _ = panel.Attribute("aria-label", context.Translate(GraphStrings.Menu));
            RenderRegion(context, panel, UIGraphMenus.Main);
        });
    }

    /// <summary>
    /// The overview map in the canvas's corner; the engine fills it from the document since only the browser knows node sizes.
    /// Empty markup here.
    /// </summary>
    private void RenderMinimap(WebRenderContext context, IHtmlElementBuilder viewport)
    {
        _ = viewport.Element("div", map =>
        {
            _ = map.Class($"{ClassName}__minimap");
            _ = map.Attribute("data-ui-graph-map");
            _ = map.Attribute("aria-label", context.Translate(GraphStrings.Minimap));
            _ = map.Attribute("hidden");

            _ = map.Element("div", nodes =>
            {
                _ = nodes.Class($"{ClassName}__minimap-nodes");
                _ = nodes.Attribute("data-ui-graph-map-nodes");
            });

            _ = map.Element("div", view =>
            {
                _ = view.Class($"{ClassName}__minimap-view");
                _ = view.Attribute("data-ui-graph-map-view");
            });
        });
    }

    /// <summary>The bar under the map: the zoom the wheel leaves, and the commands a pointer wants without the menu — the framework's own marks.</summary>
    private void RenderBar(WebRenderContext context, IHtmlElementBuilder viewport)
    {
        _ = viewport.Element("div", bar =>
        {
            _ = bar.Class($"{ClassName}__bar");

            RenderBarButton(context, bar, "zoom-out", GraphStrings.ZoomOut, UIGlyphs.Remove);

            _ = bar.Element("span", zoom =>
            {
                _ = zoom.Class($"{ClassName}__zoom");
                _ = zoom.Attribute("data-ui-graph-zoom");
                _ = zoom.Attribute("aria-live", "polite");
                _ = zoom.Text("100%");
            });

            RenderBarButton(context, bar, "zoom-in", GraphStrings.ZoomIn, UIGlyphs.Add);
            RenderBarButton(context, bar, "fit", GraphStrings.Fit, UIGlyphs.Fit);
        });
    }

    /// <summary>
    /// Whether the canvas's sheet matches the server's. Both words render; the stylesheet shows whichever the canvas's state calls
    /// for, avoiding a browser-side translation.
    /// </summary>
    protected void RenderSaveState(WebRenderContext context, IHtmlElementBuilder head)
    {
        _ = head.Element("span", state =>
        {
            _ = state.Class($"{ClassName}__state");
            _ = state.Attribute("aria-live", "polite");

            _ = state.Element("span", unsaved =>
            {
                _ = unsaved.Class($"{ClassName}__state-unsaved");
                _ = unsaved.Text(context.Translate(GraphStrings.Unsaved));
            });

            _ = state.Element("span", saving =>
            {
                _ = saving.Class($"{ClassName}__state-saving");
                _ = saving.Text(context.Translate(GraphStrings.Saving));
            });
        });
    }

    private void RenderBarButton(WebRenderContext context, IHtmlElementBuilder bar, string name, string wordKey, string icon)
    {
        _ = bar.Element("button", button =>
        {
            var word = context.Translate(wordKey);

            _ = button.Class($"{ClassName}__bar-button ui-button ui-button--ghost ui-button--small");
            _ = button.Attribute("type", "button");
            _ = button.Attribute(IconOnlyButtonAttribute);
            _ = button.Attribute("title", word);
            _ = button.Attribute("aria-label", word);
            _ = button.Attribute($"data-ui-graph-{name}");
            IconValueRenderer.RenderIcon(button, icon);
        });
    }
}
