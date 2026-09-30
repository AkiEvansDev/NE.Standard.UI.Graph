using System;
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

        return new CompiledSetNodeValueEffect(resolver.ResolveComponent(Target), NodeId, PinName, Value, Committed);
    }
}

internal sealed class CompiledSetNodeValueEffect(UIComponentAddress target, string nodeId, string pinName, object? value, bool committed) : CompiledTargetedClientEffect(target)
{
    public override string Kind => SetNodeValueEffect.EffectKind;

    public string NodeId { get; } = nodeId;

    public string PinName { get; } = pinName;

    public object? Value { get; } = value;

    public bool Committed { get; } = committed;
}
