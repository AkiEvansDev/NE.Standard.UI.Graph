using NE.Standard.UI.Graph;

namespace NE.Standard.UI.Web.Graph;

/// <summary>
/// The graph: the application's nodes as cards laid out in layers.
/// </summary>
public sealed class LayeredGraphComponentRenderer : LayeredGraphRendererBase<UIGraphDocument, UIGraphNode>
{
    /// <summary>The collection sink a graph's bound nodes arrive through.</summary>
    public const string SinkKind = "layered";

    public override string ComponentTypeKey => LayeredGraphComponent.ComponentTypeKey;

    protected override string KindName => SinkKind;

    protected override UIGraphDocument EmptyDocument => UIGraphDocument.Empty;
}
