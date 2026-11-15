using System;
using System.Threading;
using System.Threading.Tasks;
using DemoApp.Graph.Planner;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace DemoApp.Graph.Desktop;

internal sealed class GraphDesktopStartup : DesktopStartupBase<GraphAppStartup>
{
    protected override void ConfigureHost(DesktopHostOptions options)
    {
        ArgumentNullException.ThrowIfNull(options);
        options.WindowTitle = "NE.Standard — Graph";
        options.InitialWidth = 1400;
        options.InitialHeight = 880;
    }

    protected override void ConfigureServices(IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        _ = services.AddStandardRenderers();
        _ = services.AddCodeInput();
        _ = services.AddGraph();
        _ = services.AddMaterialWebIcons(DemoNodeIcons.All);
        _ = services.AddMaterialWebIcons(PlannerIcons.Filled());
        _ = services.AddMaterialWebIcons(MaterialIconStyle.Outlined, [GraphDemoView.LightIcon, GraphDemoView.DarkIcon, GraphDemoView.CodeIcon, GraphDemoView.CopyIcon, .. PlannerIcons.Outlined, .. GraphDemoView.PageIcons]);
        _ = services.AddHostedService<PlannerDatabaseStartupTask>();
    }

    private sealed class PlannerDatabaseStartupTask(PlannerDatabase? database = null) : IHostedService
    {
        public Task StartAsync(CancellationToken cancellationToken)
        {
            database?.EnsureCreated();
            return Task.CompletedTask;
        }

        public Task StopAsync(CancellationToken cancellationToken)
            => Task.CompletedTask;
    }
}
