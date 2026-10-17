using System;
using System.Globalization;
using NE.Standard.UI.Abstractions.Identity;
using NE.Standard.UI.Graph;
using NE.Standard.UI.Primitives.Styling;
using NE.Standard.UI.Web.Abstractions.Html;
using NE.Standard.UI.Web.Abstractions.Rendering;
using NE.Standard.UI.Web.Abstractions.Theming;
using NE.Standard.UI.Web.Renderers.Foundation;

namespace NE.Standard.UI.Web.Graph;

/// <summary>
/// A node canvas's parameters beside it: a title, the list the canvas's engine writes a row into per parameter, and the line that
/// stands in the list's place while it is empty.
/// </summary>
public sealed class NodesParametersComponentRenderer : WebComponentRendererBase
{
    /// <summary>On the root: the canvas whose parameters it shows, as the id the compiler gave it and the page finds it by.</summary>
    public const string TargetAttribute = "data-ui-graph-parameters-for";

    public override string ComponentTypeKey => NodesParametersComponent.ComponentTypeKey;

    protected override string ElementName => "section";

    protected override string ClassName => "ui-graph-parameters";

    protected override void RenderComponent(WebRenderContext context, IHtmlElementBuilder root)
    {
        ArgumentNullException.ThrowIfNull(context);
        ArgumentNullException.ThrowIfNull(root);

        // Aimed at nothing the view has, it is the title and the empty line alone: no canvas writes rows into it.
        _ = ResolveRenderValue(context, NodesParametersComponent.CanvasProperty, out string? target, out _);

        if (!string.IsNullOrWhiteSpace(target) && context.ViewResolution.View.Graph.TryGetComponentId(target, out UIComponentId canvas))
            _ = root.Attribute(TargetAttribute, canvas.Value.ToString(CultureInfo.InvariantCulture));

        WebWords.Write(context, root, "aria-label", GraphStrings.Parameters);
        // A holder of the keyboard, as a dialog's surface is: Enter or Escape leaving a field hands the keyboard to the column, and
        // the focus on a removed row's button lands here when no row is left.
        _ = root.Attribute(WebAttributes.FocusHolder);
        _ = root.Attribute("tabindex", "-1");

        // Title-sized, so a pane the column stands in is named after it (a pane container's grip).
        _ = root.Element("h2", title =>
        {
            _ = title.Class($"{ClassName}__title");
            _ = title.Class(WebClassNames.TextType(UITextType.Subtitle));
            WebWords.Write(context, title, null, GraphStrings.Parameters);
        });

        _ = root.Element("div", list =>
        {
            _ = list.Class("ui-graph__parameters-list");
            _ = list.Attribute("data-ui-graph-parameters-list");
        });

        _ = root.Element("p", empty =>
        {
            _ = empty.Class("ui-graph__parameters-empty");
            WebWords.Write(context, empty, null, GraphStrings.ParametersEmpty);
        });
    }
}
