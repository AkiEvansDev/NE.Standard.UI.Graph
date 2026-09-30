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

        // The pictures the file kinds read. What of the disk they reach is a page's own (DemoFolders.For), handed to its runs by the
        // page, so nothing is registered here: a run that came without it would reach nothing.
        DemoFolders.Prepare();
    }

    protected override void ConfigureApplication(UIApplicationBuilder application)
    {
        ArgumentNullException.ThrowIfNull(application);

        _ = application.AddLocalizationSource(NodesDemoWords.Build());

        // The framework's and its packages' own words in the demo's other languages, as they ship.
        _ = application.AddFrameworkWords("zh-Hans");

        // Only a string starting "nodes." is a key: every other string on a translatable property — a node's name, the sheet's
        // values — is content, so the missing-word report in Development names only words the demo has not translated.
        _ = application.ConfigureLocalization(options => options.KeyPrefixes.Add(NodesDemoWords.KeyPrefix));

        _ = application.Route<CommonNodesView, CommonNodesController>(NodesDemoView.NodesRoute);
        _ = application.Route<CalculatorNodesView, CalculatorNodesController>(NodesDemoView.CalculatorRoute);
        _ = application.Route<ImageNodesView, ImageNodesController>(NodesDemoView.ImageRoute);
    }
}
