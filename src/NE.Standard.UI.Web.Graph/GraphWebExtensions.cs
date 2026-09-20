using System;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using NE.Standard.UI.Shell.Localization;
using NE.Standard.UI.Web.Abstractions.Rendering;
using NE.Standard.UI.Web.Renderers.Foundation;

namespace NE.Standard.UI.Web.Graph;

public static class GraphWebExtensions
{
    private const string AssemblyName = "NE.Standard.UI.Web.Graph";

    /// <summary>
    /// Registers the node canvas, graph and production graph renderers, their words, and the package's embedded script and
    /// stylesheet. Idempotent.
    /// </summary>
    public static IServiceCollection AddGraph(this IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        services.TryAddEnumerable(ServiceDescriptor.Singleton<IWebComponentRenderer, NodesComponentRenderer>());
        services.TryAddEnumerable(ServiceDescriptor.Singleton<IWebComponentRenderer, GraphComponentRenderer>());
        services.TryAddEnumerable(ServiceDescriptor.Singleton<IWebComponentRenderer, ProductionGraphComponentRenderer>());
        services.TryAddEnumerable(ServiceDescriptor.Singleton<IUIStringsSource, GraphStrings>());

        return services.AddPackageClient(AssemblyName, "ui-graph");
    }
}
