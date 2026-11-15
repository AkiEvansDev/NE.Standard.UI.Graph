using System;
using Microsoft.Extensions.DependencyInjection;

namespace DemoApp.Nodes.Desktop;

internal sealed class NodesDesktopStartup : DesktopStartupBase<NodesAppStartup>
{
    protected override void ConfigureHost(DesktopHostOptions options)
    {
        ArgumentNullException.ThrowIfNull(options);
        options.WindowTitle = "NE.Standard — Nodes";
        options.InitialWidth = 1400;
        options.InitialHeight = 880;
    }

    protected override void ConfigureServices(IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        _ = services.AddStandardRenderers();
        _ = services.AddCodeInput();
        _ = services.AddGraph();
        _ = services.AddMaterialWebIcons(NodesIcons.All);
        _ = services.AddMaterialWebIcons(MaterialIconStyle.Outlined, [NodesDemoView.LightIcon, NodesDemoView.DarkIcon, NodesDemoView.CodeIcon, NodesDemoView.CopyIcon, .. NodesDemoView.PageIcons]);
    }
}
