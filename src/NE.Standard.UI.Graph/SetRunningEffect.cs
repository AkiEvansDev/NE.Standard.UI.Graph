using System;
using System.Text.Json.Serialization;
using NE.Standard.UI.Abstractions.Binding.Addresses;
using NE.Standard.UI.Abstractions.Effects;

namespace NE.Standard.UI.Graph;

/// <summary>Says a run of the sheet has begun or ended — one run, or every run of a run of all.</summary>
/// <remarks>The run panel holds its Run buttons and offers Stop while one is on. <see cref="UINodeRuns"/> sends both.</remarks>
public sealed class SetRunningEffect : TargetedClientEffect
{
    /// <summary>The kind this package's run state travels under.</summary>
    public const string EffectKind = "graph.set-running";

    /// <summary>
    /// Says whether the given canvas has a run on.
    /// </summary>
    public SetRunningEffect(UIComponentReference target, bool running)
        : base(target)
    {
        Running = running;
    }

    /// <summary>
    /// Says whether the canvas identified by <paramref name="targetComponentId"/> has a run on.
    /// </summary>
    public SetRunningEffect(string targetComponentId, bool running, params object?[]? dynamicParameters)
        : this(new UIComponentReference(targetComponentId, dynamicParameters), running)
    { }

    [JsonConstructor]
    internal SetRunningEffect(UIComponentAddress? resolvedTarget, bool running)
        : base(resolvedTarget)
    {
        Running = running;
    }

    private SetRunningEffect(UIComponentAddress resolvedTarget, UIComponentReference target, bool running)
        : base(resolvedTarget, target)
    {
        Running = running;
    }

    /// <inheritdoc/>
    public override string Kind => EffectKind;

    /// <summary>
    /// Gets whether a run is on.
    /// </summary>
    public bool Running { get; }

    /// <inheritdoc/>
    public override ClientEffect Resolve(IUIReferenceResolver resolver)
    {
        ArgumentNullException.ThrowIfNull(resolver);

        return ResolvedTarget is not null ? this : new SetRunningEffect(resolver.ResolveComponent(Target), Target, Running);
    }
}
