using System;
using Microsoft.Extensions.DependencyInjection;

namespace DemoApp.Nodes;

public sealed class NodesAppStartup : UIStartupBase
{
    protected override void ConfigureServices(IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        // Where this demo keeps the pictures its canvas uploads and its picture kinds make, and how they are served back: the
        // application's own decision, here the picture package's store in memory.
        _ = services.AddGraphImages();

        // The folders the file kinds may reach, and nothing else of the disk: pictures to read, and a folder to write them into.
        _ = services.AddGraphFiles(DemoFolders.Open());
    }

    protected override void ConfigureApplication(UIApplicationBuilder application)
    {
        ArgumentNullException.ThrowIfNull(application);

        _ = application.Route<CommonNodesView, CommonNodesController>(NodesDemoView.NodesRoute);
        _ = application.Route<CalculatorNodesView, CalculatorNodesController>(NodesDemoView.CalculatorRoute);
        _ = application.Route<ImageNodesView, ImageNodesController>(NodesDemoView.ImageRoute);
    }
}
