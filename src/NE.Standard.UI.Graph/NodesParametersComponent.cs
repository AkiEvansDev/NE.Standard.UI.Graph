using NE.Standard.UI.Authoring.Components;
using NE.Standard.UI.Components.Foundation;
using NE.Standard.UI.Primitives.Annotations;

namespace NE.Standard.UI.Graph;

/// <summary>
/// The parameters of a node canvas's sheet, set out beside the canvas: aimed at a <see cref="NodesComponent"/>, it shows each input
/// set out from a pin's menu, in the node's own field bound to the same value, its name bringing the node into view.
/// </summary>
/// <remarks>
/// The set is the sheet's own, <see cref="UINodeDocument.Parameters"/>, saved and undone with it; the canvas writes the rows. Only a
/// canvas such a component is aimed at offers a pin's <i>Add to parameters</i>. Where it stands is the page's: a column beside the
/// canvas, a pane the viewer moves (<c>PaneContainerComponent</c>).
/// </remarks>
public abstract partial class NodesParametersComponent<T>(string? id = null) : VisualComponentBase<T>(id), IPressablePartsComponent
    where T : NodesParametersComponent<T>, IUIComponentDefinition
{
    /// <summary>
    /// Gets or sets the id of the node canvas whose parameters are shown.
    /// </summary>
    /// <remarks>Render-time only: the canvas is looked up in the same view as the page is drawn.</remarks>
    [UIComponentProperty(IsBindable = false, DefaultValue = null)]
    public string? Canvas { get; set; }
}

/// <summary>
/// The parameters of a node canvas's sheet, set out beside the canvas.
/// </summary>
public sealed class NodesParametersComponent(string? id = null) : NodesParametersComponent<NodesParametersComponent>(id), IUIComponentDefinition
{
    /// <inheritdoc/>
    public static string ComponentTypeKey => "graph.nodes-parameters";
}
