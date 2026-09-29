using System;
using System.IO;
using DemoApp.Graph.Planner;
using Microsoft.Extensions.DependencyInjection;
using NE.Standard.UI.Shell.Runtime;

namespace DemoApp.Graph;

public sealed class GraphAppStartup : UIStartupBase
{
    /// <summary>Where the planner's database lives: beside the host, under <c>data/</c>.</summary>
    public static string DataDirectory
        => Path.Combine(Directory.GetCurrentDirectory(), "data");

    protected override void ConfigureServices(IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        _ = services.AddSingleton(new PlannerDatabase(DataDirectory));
        _ = services.AddSingleton<PlannerStore>();
        _ = services.AddSingleton<PlannerPictures>();

        // The resources' pictures are the one content this demo serves, so the planner's store is the application's provider.
        _ = services.AddSingleton<IUIContentProvider>(static provider => provider.GetRequiredService<PlannerPictures>());
    }

    protected override void ConfigureApplication(UIApplicationBuilder application)
    {
        ArgumentNullException.ThrowIfNull(application);

        // A page is read fresh each time it is opened: the builds must see the resources as the other page last wrote them, and a
        // runtime kept for the window would show them as they were.
        _ = application.ConfigurePersistence(static persistence => persistence.Lifetime = UIRuntimeLifetime.PerPage);

        _ = application.AddLocalizationSource(PlannerDemoWords.Build());

        // Only a string starting "planner." is a key: every other string on a translatable property — a resource's, a build's or a
        // module's name — is content, so the missing-word report in Development names only words the demo has not translated.
        _ = application.ConfigureLocalization(options => options.KeyPrefixes.Add(PlannerDemoWords.KeyPrefix));

        _ = application.Route<ResourcesView, ResourcesController>(GraphDemoView.ResourcesRoute);
        _ = application.Route<BuildsView, BuildsController>(GraphDemoView.BuildsRoute);
        _ = application.Route<GraphView, DependenciesController>(GraphDemoView.GraphRoute);
    }
}
