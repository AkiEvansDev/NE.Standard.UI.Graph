using System;
using Microsoft.Extensions.DependencyInjection;
using NE.Standard.UI.Web.Graph;
using NE.Standard.UI.Web.Icons.Material;
using NE.Standard.UI.Web.Renderers.DI;
using NE.Standard.UI.Web.Startup;

namespace DemoApp.Graph.Web;

internal sealed class GraphWebStartup : WebStartupBase<GraphAppStartup>
{
    protected override void ConfigureServices(IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        _ = services.AddStandardRenderers();
        _ = services.AddGraph();

        // The canvas names no icons of its own: a glyph belongs to the pack an application registered, so the demo registers one
        // and dresses the menu and the node kinds from it — and the theme switcher from its outlined drawing.
        _ = services.AddMaterialWebIcons(DemoNodeIcons.All);
        _ = services.AddMaterialWebIcons(MaterialIconStyle.Outlined, GraphDemoView.LightIcon, GraphDemoView.DarkIcon);
    }
}
