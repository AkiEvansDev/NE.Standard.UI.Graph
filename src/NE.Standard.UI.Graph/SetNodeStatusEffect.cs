using System;
using NE.Standard.UI.Abstractions.Binding.Addresses;
using NE.Standard.UI.Abstractions.Effects;

namespace NE.Standard.UI.Graph;

/// <summary>
/// Sets one node's status on a canvas — the state its frame shows, and while it runs its progress line and what the run line says
/// of it — without touching the document; how a running network reports.
/// </summary>
public sealed class SetNodeStatusEffect : TargetedClientEffect
{
    /// <summary>The kind this package's status effect travels under.</summary>
    public const string EffectKind = "graph.set-node-status";

    /// <summary>
    /// Sets the status of the node with <paramref name="nodeId"/> on the canvas identified by <paramref name="targetComponentId"/>.
    /// </summary>
    public SetNodeStatusEffect(string targetComponentId, string nodeId, UINodeState state, params object?[]? dynamicParameters)
        : this(new UIComponentReference(targetComponentId, dynamicParameters), nodeId, state)
    { }

    /// <summary>
    /// Sets the status of the node with <paramref name="nodeId"/> on the given canvas.
    /// </summary>
    public SetNodeStatusEffect(UIComponentReference target, string nodeId, UINodeState state)
        : base(target)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(nodeId);

        NodeId = nodeId;
        State = state;
    }

    /// <inheritdoc/>
    public override string Kind => EffectKind;

    /// <summary>
    /// Gets the id of the node the status belongs to.
    /// </summary>
    public string NodeId { get; }

    /// <summary>
    /// Gets the state the node's frame takes its colour from.
    /// </summary>
    public UINodeState State { get; }

    /// <summary>
    /// Gets or sets how far along the work is, from 0 to 1; unset, no progress line is drawn.
    /// </summary>
    public double? Progress { get; set; }

    /// <summary>
    /// Gets or sets what the run line says beside the node's name while it runs; unset, it says nothing more.
    /// </summary>
    public string? Message { get; set; }

    /// <inheritdoc/>
    public override ClientEffect Resolve(IUIReferenceResolver resolver)
    {
        ArgumentNullException.ThrowIfNull(resolver);

        return new CompiledSetNodeStatusEffect(resolver.ResolveComponent(Target), NodeId, State)
        {
            Progress = Progress,
            Message = Message
        };
    }
}

internal sealed class CompiledSetNodeStatusEffect(UIComponentAddress target, string nodeId, UINodeState state) : CompiledTargetedClientEffect(target)
{
    public override string Kind => SetNodeStatusEffect.EffectKind;

    public string NodeId { get; } = nodeId;

    public UINodeState State { get; } = state;

    public double? Progress { get; set; }

    public string? Message { get; set; }
}
