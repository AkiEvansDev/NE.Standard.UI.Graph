using System;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using NE.Standard.UI.Shell.Files;

namespace NE.Standard.UI.Graph.Image;

/// <summary>
/// Registers what the picture kinds need of an application.
/// </summary>
public static class GraphImageServiceCollectionExtensions
{
    /// <summary>
    /// Registers <see cref="UINodeImageMemoryStore"/> as the image store and as the application's content provider, so the pictures
    /// it keeps are served too. An application with a content provider of its own registers an <see cref="IUINodeImageStore"/> of
    /// its own instead: there is one content provider per application.
    /// </summary>
    public static IServiceCollection AddGraphImages(this IServiceCollection services)
    {
        ArgumentNullException.ThrowIfNull(services);

        services.TryAddSingleton<UINodeImageMemoryStore>();

        return AddStoreAliases(services);
    }

    /// <summary>
    /// Registers <see cref="UINodeImageMemoryStore"/> as <see cref="AddGraphImages(IServiceCollection)"/> does, keeping at most
    /// <paramref name="maxBytes"/> of pictures: past it, the pictures used longest ago are let go, though a run cache may still hand
    /// their addresses on once (<see cref="UINodeImageMemoryStore.MaxBytes"/>).
    /// </summary>
    public static IServiceCollection AddGraphImages(this IServiceCollection services, long maxBytes)
    {
        ArgumentNullException.ThrowIfNull(services);
        ArgumentOutOfRangeException.ThrowIfNegativeOrZero(maxBytes);

        services.TryAddSingleton(provider => new UINodeImageMemoryStore(provider.GetRequiredService<IUIContentAddressResolver>()) { MaxBytes = maxBytes });

        return AddStoreAliases(services);
    }

    /// <summary>The store as the picture kinds and the content endpoint reach it.</summary>
    private static IServiceCollection AddStoreAliases(IServiceCollection services)
    {
        services.TryAddSingleton<IUINodeImageStore>(static provider => provider.GetRequiredService<UINodeImageMemoryStore>());
        services.TryAddSingleton<IUIContentProvider>(static provider => provider.GetRequiredService<UINodeImageMemoryStore>());

        return services;
    }
}
