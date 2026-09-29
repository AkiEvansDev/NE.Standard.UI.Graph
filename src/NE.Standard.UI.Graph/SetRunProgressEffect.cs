using System;
using NE.Standard.UI.Abstractions.Binding.Addresses;
using NE.Standard.UI.Abstractions.Effects;

namespace NE.Standard.UI.Graph;

/// <summary>Reports how many of a run's nodes are through, of how many, drawn as the canvas's top progress line.</summary>
/// <remarks>
/// The first report (0 through) starts the run and clears the log; the last (all through) ends it. Total comes from the runner, not
/// computed from the sheet — a node of an unknown kind never runs, so the runner alone knows the count.
/// </remarks>
public sealed class SetRunProgressEffect : TargetedClientEffect
{
    /// <summary>The kind this package's run progress travels under.</summary>
    public const string EffectKind = "graph.set-run-progress";

    /// <summary>
    /// Reports <paramref name="completed"/> nodes through of <paramref name="total"/> on the canvas identified by
    /// <paramref name="targetComponentId"/>.
    /// </summary>
    public SetRunProgressEffect(string targetComponentId, int completed, int total, params object?[]? dynamicParameters)
        : this(new UIComponentReference(targetComponentId, dynamicParameters), completed, total)
    { }

    /// <inheritdoc cref="SetRunProgressEffect(string, int, int, object?[])"/>
    public SetRunProgressEffect(UIComponentReference target, int completed, int total)
        : base(target)
    {
        ArgumentOutOfRangeException.ThrowIfNegative(total);
        ArgumentOutOfRangeException.ThrowIfNegative(completed);
        ArgumentOutOfRangeException.ThrowIfGreaterThan(completed, total);

        Completed = completed;
        Total = total;
    }

    /// <inheritdoc/>
    public override string Kind => EffectKind;

    /// <summary>
    /// Gets how many nodes are through — run, failed or skipped.
    /// </summary>
    public int Completed { get; }

    /// <summary>
    /// Gets how many nodes the run holds.
    /// </summary>
    public int Total { get; }

    /// <inheritdoc/>
    public override ClientEffect Resolve(IUIReferenceResolver resolver)
    {
        ArgumentNullException.ThrowIfNull(resolver);

        return new CompiledSetRunProgressEffect(resolver.ResolveComponent(Target), Completed, Total);
    }
}

internal sealed class CompiledSetRunProgressEffect(UIComponentAddress target, int completed, int total) : CompiledTargetedClientEffect(target)
{
    public override string Kind => SetRunProgressEffect.EffectKind;

    public int Completed { get; } = completed;

    public int Total { get; } = total;
}
