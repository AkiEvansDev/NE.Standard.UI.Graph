using System;
using System.Threading;
using System.Threading.Tasks;

namespace NE.Standard.UI.Graph.Image;

/// <summary>
/// How much the picture kinds may take of the server: the most pixels one picture is decoded to, and how many pictures are
/// decoded at once across the process. Registered as a singleton (<c>services.AddSingleton(new UINodeImageLimits { ... })</c>);
/// unregistered, the kinds use the defaults.
/// </summary>
/// <remarks>
/// A decoded picture takes four bytes a pixel, and a kind holds two or three of them at once — the picture, the one it makes and
/// what is encoded of it — so the pixel cap times the decodes at once is about a third of what the kinds may hold in memory.
/// </remarks>
public sealed class UINodeImageLimits : IDisposable
{
    /// <summary>The most pixels a picture is decoded to unless the application says otherwise: a fifty-megapixel photograph.</summary>
    public const long DefaultMaxPixels = 50_000_000;

    /// <summary>How many pictures are decoded at once unless the application says otherwise.</summary>
    public const int DefaultMaxConcurrentDecodes = 2;

    private static readonly UINodeImageLimits Default = new();

    private SemaphoreSlim? _gate;

    /// <summary>
    /// Gets the most pixels a picture is decoded to. A small file can claim a huge picture; a resize decodes a large photograph at
    /// a smaller size where its format allows, so this bounds what is actually decoded rather than what the file claims.
    /// </summary>
    public long MaxPixels { get; init; } = DefaultMaxPixels;

    /// <summary>Gets how many pictures the process decodes at once; a run past it waits its turn.</summary>
    public int MaxConcurrentDecodes { get; init; } = DefaultMaxConcurrentDecodes;

    /// <summary>
    /// The limits the application registered for a run, or the defaults.
    /// </summary>
    public static UINodeImageLimits Of(UINodeRunContext context)
    {
        ArgumentNullException.ThrowIfNull(context);

        return context.Services?.GetService(typeof(UINodeImageLimits)) as UINodeImageLimits ?? Default;
    }

    /// <summary>Waits for a turn to decode; the turn is given back by disposing what this answers.</summary>
    internal async ValueTask<IDisposable> EnterAsync(CancellationToken cancellationToken)
    {
        SemaphoreSlim gate = LazyInitializer.EnsureInitialized(ref _gate, () => new SemaphoreSlim(Math.Max(1, MaxConcurrentDecodes)));

        await gate.WaitAsync(cancellationToken).ConfigureAwait(false);

        return new Turn(gate);
    }

    /// <inheritdoc/>
    public void Dispose()
        => _gate?.Dispose();

    private sealed class Turn(SemaphoreSlim gate) : IDisposable
    {
        private int _released;

        public void Dispose()
        {
            if (Interlocked.Exchange(ref _released, 1) == 0)
                _ = gate.Release();
        }
    }
}
