using System;
using NE.Standard.UI.Abstractions.Binding.Addresses;
using NE.Standard.UI.Abstractions.Effects;

namespace NE.Standard.UI.Graph;

/// <summary>
/// Writes one pin's value into the document without replacing the rest — for example, the address an upload's server decided on.
/// Counts as an edit: undoable, and sent to the server with the next save.
/// </summary>
/// <remarks>Patching <c>Value</c> instead would push the whole document, discarding unsaved work and undo history.</remarks>
public sealed class SetNodeValueEffect : TargetedClientEffect
{
    /// <summary>The kind this package's value effect travels under.</summary>
    public const string EffectKind = "graph.set-node-value";

    /// <summary>
    /// Sets the pin named <paramref name="pinName"/> of the node with <paramref name="nodeId"/> to <paramref name="value"/>.
    /// </summary>
    public SetNodeValueEffect(string targetComponentId, string nodeId, string pinName, object? value, params object?[]? dynamicParameters)
        : this(new UIComponentReference(targetComponentId, dynamicParameters), nodeId, pinName, value)
    { }

    /// <inheritdoc cref="SetNodeValueEffect(string, string, string, object?, object?[])"/>
    public SetNodeValueEffect(UIComponentReference target, string nodeId, string pinName, object? value)
        : base(target)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(nodeId);
        ArgumentException.ThrowIfNullOrWhiteSpace(pinName);

        NodeId = nodeId;
        PinName = pinName;
        Value = value;
    }

    /// <inheritdoc/>
    public override string Kind => EffectKind;

    /// <summary>
    /// Gets the id of the node the pin belongs to.
    /// </summary>
    public string NodeId { get; }

    /// <summary>
    /// Gets the name of the pin.
    /// </summary>
    public string PinName { get; }

    /// <summary>
    /// Gets the value the pin takes.
    /// </summary>
    public object? Value { get; }

    /// <inheritdoc/>
    public override ClientEffect Resolve(IUIReferenceResolver resolver)
    {
        ArgumentNullException.ThrowIfNull(resolver);

        return new CompiledSetNodeValueEffect(resolver.ResolveComponent(Target), NodeId, PinName, Value);
    }
}

internal sealed class CompiledSetNodeValueEffect(UIComponentAddress target, string nodeId, string pinName, object? value) : CompiledTargetedClientEffect(target)
{
    public override string Kind => SetNodeValueEffect.EffectKind;

    public string NodeId { get; } = nodeId;

    public string PinName { get; } = pinName;

    public object? Value { get; } = value;
}
