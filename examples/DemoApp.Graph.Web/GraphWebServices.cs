using System;
using DemoApp.Graph.Planner;
using Microsoft.Extensions.DependencyInjection;
// The host takes the framework's namespaces as global usings; the words coverage test, which compiles this file too, has none.
#if DEMO_WORDS_COVERAGE
using NE.Standard.UI.Web.CodeInput;
using NE.Standard.UI.Web.Graph;
using NE.Standard.UI.Web.Icons.Material;
using NE.Standard.UI.Web.Renderers.DI;
#endif

namespace DemoApp.Graph.Web;

/// <summary>DemoApp.Graph.Web's registrations, which DemoWordsCoverageTests makes too: each package that brings words is tested as the host adds it.</summary>
internal static class GraphWebServices
{
    public static void Register(IServiceCollection services)
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
