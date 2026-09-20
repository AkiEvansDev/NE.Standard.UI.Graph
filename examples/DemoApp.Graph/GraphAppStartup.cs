using System;
using Microsoft.Extensions.DependencyInjection;
using NE.Standard.UI.Application;
using NE.Standard.UI.Shell.Files;
using NE.Standard.UI.Startup;

namespace DemoApp.Graph;

public sealed class GraphAppStartup : UIStartupBase
{
    protected override void ConfigureServices(IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        // Where this demo keeps the pictures its canvas uploads, and how they are served back: the application's own decision,
        // which is the whole of what the canvas asks of it.
        _ = services.AddSingleton<PictureStore>();
        _ = services.AddSingleton<IUIContentProvider>(static provider => provider.GetRequiredService<PictureStore>());
    }

    protected override void ConfigureApplication(UIApplicationBuilder application)
    {
        ArgumentNullException.ThrowIfNull(application);

        _ = application.Route<NodesView, GraphController>(GraphDemoView.NodesRoute);
        _ = application.Route<GraphView, DependenciesController>(GraphDemoView.GraphRoute);
        _ = application.Route<ProductionView, ProductionController>(GraphDemoView.ProductionRoute);
        _ = application.Route<ChainView, ChainController>(GraphDemoView.ChainRoute);
        _ = application.Route<PlanView, PlanController>(GraphDemoView.PlanRoute);
    }
}
