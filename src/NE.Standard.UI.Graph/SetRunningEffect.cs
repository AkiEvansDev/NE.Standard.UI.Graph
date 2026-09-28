using System;
using NE.Standard.UI.Abstractions.Binding.Addresses;
using NE.Standard.UI.Abstractions.Effects;

namespace NE.Standard.UI.Graph;

/// <summary>
/// Says a run of the sheet has begun or ended — one run, or every run of a run of all: the run panel holds its Run buttons and
/// offers Stop while one is on. <see cref="UINodeRuns"/> sends both.
/// </summary>
public sealed class SetRunningEffect(UIComponentReference target, bool running) : TargetedClientEffect(target)
{
    /// <summary>The kind this package's run state travels under.</summary>
    public const string EffectKind = "graph.set-running";

    /// <summary>
    /// Says whether the canvas identified by <paramref name="targetComponentId"/> has a run on.
    /// </summary>
    public SetRunningEffect(string targetComponentId, bool running, params object?[]? dynamicParameters)
        : this(new UIComponentReference(targetComponentId, dynamicParameters), running)
    { }

    /// <inheritdoc/>
    public override string Kind => EffectKind;

    /// <summary>
    /// Gets whether a run is on.
    /// </summary>
    public bool Running { get; } = running;

    /// <inheritdoc/>
    public override ClientEffect Resolve(IUIReferenceResolver resolver)
    {
        ArgumentNullException.ThrowIfNull(resolver);

        return new CompiledSetRunningEffect(resolver.ResolveComponent(Target), Running);
    }
}

internal sealed class CompiledSetRunningEffect(UIComponentAddress target, bool running) : CompiledTargetedClientEffect(target)
{
    public override string Kind => SetRunningEffect.EffectKind;

    public bool Running { get; } = running;
}
