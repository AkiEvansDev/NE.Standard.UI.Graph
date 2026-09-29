using System;
using Microsoft.Extensions.DependencyInjection;
// The host takes the framework's namespaces as global usings; the words coverage test, which compiles this file too, has none.
#if DEMO_WORDS_COVERAGE
using NE.Standard.UI.Web.CodeInput;
using NE.Standard.UI.Web.Graph;
using NE.Standard.UI.Web.Icons.Material;
using NE.Standard.UI.Web.Renderers.DI;
#endif

namespace DemoApp.Nodes.Web;

/// <summary>DemoApp.Nodes.Web's registrations, which DemoWordsCoverageTests makes too: each package that brings words is tested as the host adds it.</summary>
internal static class NodesWebServices
{
    public static void Register(IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        _ = services.AddStandardRenderers();
        _ = services.AddCodeInput();
        _ = services.AddGraph();

        // The kinds wear the core's own glyphs; the demo registers the ones its commands wear, and the page's controls take the
        // outlined drawing.
        _ = services.AddMaterialWebIcons(NodesIcons.All);
        _ = services.AddMaterialWebIcons(MaterialIconStyle.Outlined, [NodesDemoView.LightIcon, NodesDemoView.DarkIcon, NodesDemoView.CodeIcon, NodesDemoView.CopyIcon]);
    }
}
