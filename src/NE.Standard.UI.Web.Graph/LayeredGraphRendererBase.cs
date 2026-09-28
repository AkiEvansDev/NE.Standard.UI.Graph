using System;
using System.Collections.Generic;
using System.Text.Json;
using NE.Standard.UI.Graph;
using NE.Standard.UI.Web.Abstractions.Html;
using NE.Standard.UI.Web.Abstractions.Rendering;

namespace NE.Standard.UI.Web.Graph;

/// <summary>
/// A canvas laid out in layers, adding the starting items, layer direction and node shape on the root, and the collection sink its
/// bound items arrive through.
/// </summary>
public abstract class LayeredGraphRendererBase<TDocument, TItem> : GraphCanvasRendererBase<TDocument>
    where TDocument : class
    where TItem : class
{
    /// <summary>The items the page starts with, as JSON, on the root.</summary>
    public const string NodesAttribute = "data-ui-graph-nodes";

    /// <summary>The way the layers run (<see cref="UIGraphDirection"/>), on the root.</summary>
    public const string DirectionAttribute = "data-ui-graph-direction";

    /// <summary>How a node that names no shape of its own is drawn, on the root.</summary>
    public const string NodeShapeAttribute = "data-ui-graph-node-shape";

    /// <summary>On the root while the viewer may change the items and their links.</summary>
    public const string EditStructureAttribute = "data-ui-graph-edit-structure";

    protected override void RenderKindSettings(WebRenderContext context, IHtmlElementBuilder root)
    {
        ArgumentNullException.ThrowIfNull(context);
        ArgumentNullException.ThrowIfNull(root);

        // The sink is the kind's own name: the client registers one per kind.
        _ = root.Attribute(WebAttributes.CollectionSink, KindName);

        _ = RenderProperty<UIGraphDirection?>(context, root, ILayeredGraphComponent.DirectionProperty, static (target, value) =>
            _ = target.Attribute(DirectionAttribute, GraphConverters.DirectionName(value ?? UIGraphDirection.LeftToRight))
        , [WebDomOperation.Attribute(DirectionAttribute, target: "root", converter: GraphConverters.DirectionAttribute)]);

        _ = RenderProperty<UIGraphNodeShape?>(context, root, ILayeredGraphComponent.NodeShapeProperty, static (target, value) =>
            _ = target.Attribute(NodeShapeAttribute, GraphConverters.NodeShapeName(value ?? UIGraphNodeShape.Card))
        , [WebDomOperation.Attribute(NodeShapeAttribute, target: "root", converter: GraphConverters.NodeShapeAttribute)]);

        RenderFlagAttribute(context, root, ILayeredGraphComponent.EditStructureProperty, EditStructureAttribute);
        RenderItems(context, root);
    }

    /// <summary>
    /// The items as the render found them — the static ones, or the bound collection's first state — for the canvas to draw before
    /// the collection's own changes arrive.
    /// </summary>
    private static void RenderItems(WebRenderContext context, IHtmlElementBuilder root)
    {
        List<object> items = [];

        foreach (var item in ResolveItems(context).Items)
        {
            // As objects, so a resource and a craft are each written whole rather than as the entry they share.
            if (item is TItem)
                items.Add(item);
        }

        _ = root.Attribute(NodesAttribute, JsonSerializer.Serialize(items, WireJson));
    }
}
