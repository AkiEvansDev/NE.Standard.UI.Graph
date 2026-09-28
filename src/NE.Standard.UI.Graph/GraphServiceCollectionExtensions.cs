using System;
using Microsoft.Extensions.DependencyInjection;

namespace NE.Standard.UI.Graph;

/// <summary>
/// Registers what the node kinds need of an application.
/// </summary>
public static class GraphServiceCollectionExtensions
{
    /// <summary>
    /// Sets how the file kinds (<see cref="UINodeKinds.Files"/>) reach the disk: the folder a relative path starts from, and the
    /// application's own check of what they may read and write — <c>services.AddGraphFiles(new UINodeFiles { BasePath = @"D:\Work",
    /// Allow = (path, access) =&gt; ... })</c>. Without it they reach nothing.
    /// </summary>
    public static IServiceCollection AddGraphFiles(this IServiceCollection services, UINodeFiles files)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(files);

        return services.AddSingleton(files);
    }
}
