using System;
using Microsoft.Extensions.DependencyInjection;

namespace DemoApp.Nodes.Web;

internal sealed class NodesWebStartup : WebStartupBase<NodesAppStartup>
{
    protected override void ConfigureServices(IServiceCollection services)
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
