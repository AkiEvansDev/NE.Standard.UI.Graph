using System;
using DemoApp.Graph.Planner;
using Microsoft.Extensions.DependencyInjection;

namespace DemoApp.Graph.Web;

internal sealed class GraphWebStartup : WebStartupBase<GraphAppStartup>
{
    protected override void ConfigureServices(IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        _ = services.AddStandardRenderers();
        _ = services.AddCodeInput();
        _ = services.AddGraph();

        // The canvas names no icons of its own: a glyph belongs to the pack an application registered, so the demo registers one
        // and dresses the menu, the node kinds and the planner's resources from it — and the page's own controls from its outlined drawing.
        _ = services.AddMaterialWebIcons(DemoNodeIcons.All);
        _ = services.AddMaterialWebIcons(PlannerIcons.Filled());
        _ = services.AddMaterialWebIcons(MaterialIconStyle.Outlined, [GraphDemoView.LightIcon, GraphDemoView.DarkIcon, GraphDemoView.CodeIcon, GraphDemoView.CopyIcon, .. PlannerIcons.Outlined]);
    }
}
