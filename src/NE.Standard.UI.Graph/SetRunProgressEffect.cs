using System;
using System.Text.Json.Serialization;
using NE.Standard.UI.Abstractions.Binding.Addresses;
using NE.Standard.UI.Abstractions.Effects;
using NE.Standard.UI.Primitives.Localization;

namespace NE.Standard.UI.Graph;

/// <summary>Reports how many of a run's nodes are through, of how many, drawn as the canvas's top progress line.</summary>
/// <remarks>
/// The first report (0 through) starts the run and clears the log; the last (all through) ends it. Total comes from the runner, not
/// computed from the sheet — a node of an unknown kind never runs, so the runner alone knows the count. A run refused whole is one
/// report of none through of none, carrying its <see cref="Refusal"/>.
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

    [JsonConstructor]
    internal SetRunProgressEffect(UIComponentAddress? resolvedTarget, int completed, int total)
        : base(resolvedTarget)
    {
        Completed = completed;
        Total = total;
    }

    private SetRunProgressEffect(UIComponentAddress resolvedTarget, UIComponentReference target, int completed, int total)
        : base(resolvedTarget, target)
    {
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

    /// <summary>
    /// Gets or sets why the run was refused whole before any node ran (<see cref="UINodeRunResult.Refusal"/>), in the page's language;
    /// set, the run line says it as the run's failure.
    /// </summary>
    public UIPhrase? Refusal { get; set; }

    /// <inheritdoc/>
    public override ClientEffect Resolve(IUIReferenceResolver resolver)
    {
        ArgumentNullException.ThrowIfNull(resolver);

        return ResolvedTarget is not null
            ? this
            : new SetRunProgressEffect(resolver.ResolveComponent(Target), Target, Completed, Total) { Refusal = Refusal };
    }
}
