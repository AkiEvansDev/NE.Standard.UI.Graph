using System;
using NE.Standard.UI.Abstractions.Binding.Addresses;
using NE.Standard.UI.Abstractions.Effects;

namespace NE.Standard.UI.Graph;

/// <summary>
/// Puts a value into one node's display pin (a number, text, picture address, list or table). Reaches the node without touching
/// the document — a run result, not a saved value.
/// </summary>
public sealed class SetNodeDisplayEffect : TargetedClientEffect
{
    /// <summary>The kind this package's display effect travels under.</summary>
    public const string EffectKind = "graph.set-node-display";

    /// <summary>
    /// Shows <paramref name="value"/> on the pin named <paramref name="pinName"/> of the node with <paramref name="nodeId"/>.
    /// </summary>
    public SetNodeDisplayEffect(string targetComponentId, string nodeId, string pinName, object? value, params object?[]? dynamicParameters)
        : this(new UIComponentReference(targetComponentId, dynamicParameters), nodeId, pinName, value)
    { }

    /// <inheritdoc cref="SetNodeDisplayEffect(string, string, string, object?, object?[])"/>
    public SetNodeDisplayEffect(UIComponentReference target, string nodeId, string pinName, object? value)
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
    /// Gets the name of the display pin.
    /// </summary>
    public string PinName { get; }

    /// <summary>
    /// Gets what the pin shows; null clears it.
    /// </summary>
    public object? Value { get; }

    /// <inheritdoc/>
    public override ClientEffect Resolve(IUIReferenceResolver resolver)
    {
        ArgumentNullException.ThrowIfNull(resolver);

        return new CompiledSetNodeDisplayEffect(resolver.ResolveComponent(Target), NodeId, PinName, Value);
    }
}

internal sealed class CompiledSetNodeDisplayEffect(UIComponentAddress target, string nodeId, string pinName, object? value) : CompiledTargetedClientEffect(target)
{
    public override string Kind => SetNodeDisplayEffect.EffectKind;

    public string NodeId { get; } = nodeId;

    public string PinName { get; } = pinName;

    public object? Value { get; } = value;
}
