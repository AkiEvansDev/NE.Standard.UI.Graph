using System;
using System.Text.Json.Serialization;
using NE.Standard.UI.Abstractions.Binding.Addresses;
using NE.Standard.UI.Abstractions.Effects;

namespace NE.Standard.UI.Graph;

/// <summary>
/// Writes one pin's value into the document without replacing the rest — for example, the address an upload's server decided on.
/// </summary>
/// <remarks>
/// Counts as an edit: undoable, and sent to the server with the next save — unless it is <see cref="Committed"/>. Patching
/// <c>Value</c> instead would push the whole document, discarding unsaved work and undo history.
/// </remarks>
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
        Value = UINodeDisplayValue.Wire(value);
    }

    [JsonConstructor]
    internal SetNodeValueEffect(UIComponentAddress? resolvedTarget, string nodeId, string pinName, object? value, bool committed = false)
        : base(resolvedTarget)
    {
        NodeId = nodeId;
        PinName = pinName;
        Value = value;
        Committed = committed;
    }

    private SetNodeValueEffect(UIComponentAddress resolvedTarget, UIComponentReference target, string nodeId, string pinName, object? value, bool committed)
        : base(resolvedTarget, target)
    {
        NodeId = nodeId;
        PinName = pinName;
        Value = value;
        Committed = committed;
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
    /// <remarks>A number JSON cannot spell — <c>NaN</c>, an infinity — comes as its text, as it does on a display.</remarks>
    public object? Value { get; }

    /// <summary>
    /// Gets or sets whether the server already holds the value — a node's state as a run left it: the canvas takes it without a
    /// step to undo, and no dirtier than it was.
    /// </summary>
    public bool Committed { get; init; }

    /// <inheritdoc/>
    public override ClientEffect Resolve(IUIReferenceResolver resolver)
    {
        ArgumentNullException.ThrowIfNull(resolver);

        return ResolvedTarget is not null ? this : new SetNodeValueEffect(resolver.ResolveComponent(Target), Target, NodeId, PinName, Value, Committed);
    }
}
