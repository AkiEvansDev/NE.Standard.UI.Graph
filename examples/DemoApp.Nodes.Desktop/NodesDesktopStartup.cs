using System;
using DemoApp.Nodes.Web;
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
        => NodesWebServices.Register(services);
}
