using System;
using System.Threading;
using System.Threading.Tasks;
using DemoApp.Graph.Planner;
using DemoApp.Graph.Web;
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

        GraphWebServices.Register(services);
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
