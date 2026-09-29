using System;
using Microsoft.Extensions.DependencyInjection;

namespace NE.Standard.UI.Graph;

/// <summary>
/// Registers what the node kinds need of an application.
/// </summary>
public static class GraphServiceCollectionExtensions
{
    /// <summary>
    /// Opens the server's disk to the file kinds (<see cref="UINodeKinds.Files"/>): where a relative path starts, and what they may
    /// read and write.
    /// </summary>
    /// <remarks>
    /// Without it they reach nothing: <c>services.AddGraphFiles(new UINodeFiles { BasePath = @"D:\Work", Allow = (path, access)
    /// =&gt; ... })</c>.
    /// </remarks>
    public static IServiceCollection AddGraphFiles(this IServiceCollection services, UINodeFiles files)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(files);

        return services.AddSingleton(files);
    }
}
