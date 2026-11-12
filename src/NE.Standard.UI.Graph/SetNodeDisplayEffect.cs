using System;
using System.Text.Json.Serialization;
using NE.Standard.UI.Abstractions.Binding.Addresses;
using NE.Standard.UI.Abstractions.Effects;

namespace NE.Standard.UI.Graph;

/// <summary>Puts a value into one node's display pin (a number, text, list or table, or a picture where a type says so).</summary>
/// <remarks>Reaches the node without touching the document — a run result, not a saved value.</remarks>
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
        Value = UINodeDisplayValue.Shorten(value);
    }

    [JsonConstructor]
    internal SetNodeDisplayEffect(UIComponentAddress? resolvedTarget, string nodeId, string pinName, object? value)
        : base(resolvedTarget)
    {
        NodeId = nodeId;
        PinName = pinName;
        Value = value;
    }

    private SetNodeDisplayEffect(UIComponentAddress resolvedTarget, UIComponentReference target, string nodeId, string pinName, object? value)
        : base(resolvedTarget, target)
    {
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

    /// <summary>Gets what the pin shows; null clears it.</summary>
    /// <remarks>
    /// A text past ten thousand characters or a list past two hundred entries comes cut short, what was left out said at its end; a
    /// value that cannot travel as JSON comes as its text.
    /// </remarks>
    public object? Value { get; }

    /// <inheritdoc/>
    public override ClientEffect Resolve(IUIReferenceResolver resolver)
    {
        ArgumentNullException.ThrowIfNull(resolver);

        return ResolvedTarget is not null ? this : new SetNodeDisplayEffect(resolver.ResolveComponent(Target), Target, NodeId, PinName, Value);
    }
}
