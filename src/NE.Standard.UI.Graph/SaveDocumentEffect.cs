using System;
using System.Text.Json.Serialization;
using NE.Standard.UI.Abstractions.Binding.Addresses;
using NE.Standard.UI.Abstractions.Effects;

namespace NE.Standard.UI.Graph;

/// <summary>
/// Asks a canvas to commit its document, exactly as Ctrl+S does; the canvas's <see cref="GraphEvents.Save"/> event follows once it
/// lands.
/// </summary>
/// <remarks>
/// A command needing the sheet (a run, an export) returns this effect and continues in the save handler, where <see cref="Reason"/>
/// comes back as the save event's key (see <see cref="UIGraphArguments.Reason"/>).
/// </remarks>
public sealed class SaveDocumentEffect : TargetedClientEffect
{
    /// <summary>The kind this package's save request travels under.</summary>
    public const string EffectKind = "graph.save-document";

    /// <summary>
    /// Asks the given canvas to commit its document.
    /// </summary>
    public SaveDocumentEffect(UIComponentReference target, string? reason = null)
        : base(target)
    {
        Reason = reason;
    }

    /// <summary>
    /// Asks the canvas identified by <paramref name="targetComponentId"/> to commit its document.
    /// </summary>
    public SaveDocumentEffect(string targetComponentId, string? reason = null, params object?[]? dynamicParameters)
        : this(new UIComponentReference(targetComponentId, dynamicParameters), reason)
    { }

    [JsonConstructor]
    internal SaveDocumentEffect(UIComponentAddress? resolvedTarget, string? reason = null)
        : base(resolvedTarget)
    {
        Reason = reason;
    }

    private SaveDocumentEffect(UIComponentAddress resolvedTarget, UIComponentReference target, string? reason)
        : base(resolvedTarget, target)
    {
        Reason = reason;
    }

    /// <inheritdoc/>
    public override string Kind => EffectKind;

    /// <summary>
    /// Gets what the save is for, as the save event's own key; unset, the event carries an empty one, as Ctrl+S does.
    /// </summary>
    public string? Reason { get; }

    /// <inheritdoc/>
    public override ClientEffect Resolve(IUIReferenceResolver resolver)
    {
        ArgumentNullException.ThrowIfNull(resolver);

        return ResolvedTarget is not null ? this : new SaveDocumentEffect(resolver.ResolveComponent(Target), Target, Reason);
    }
}
