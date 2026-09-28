using System;
using NE.Standard.UI.Abstractions.Binding.Addresses;
using NE.Standard.UI.Abstractions.Effects;

namespace NE.Standard.UI.Graph;

/// <summary>
/// How much a line of a run's log matters: what a node chose to say, what it warns of, and what stopped it.
/// </summary>
public enum UINodeLogLevel
{
    /// <summary>What the node chose to say.</summary>
    Info,

    /// <summary>What it warns of.</summary>
    Warning,

    /// <summary>What stopped it.</summary>
    Error
}

/// <summary>
/// Appends one line to a canvas's run log, naming the node it came from. The log is not saved and clears when a new run starts.
/// </summary>
public sealed class AddNodeLogEffect : TargetedClientEffect
{
    /// <summary>The kind this package's log line travels under.</summary>
    public const string EffectKind = "graph.add-node-log";

    /// <summary>
    /// Appends <paramref name="message"/> from the node with <paramref name="nodeId"/> to the log of the canvas identified by
    /// <paramref name="targetComponentId"/>.
    /// </summary>
    public AddNodeLogEffect(string targetComponentId, string nodeId, UINodeLogLevel level, string message, params object?[]? dynamicParameters)
        : this(new UIComponentReference(targetComponentId, dynamicParameters), nodeId, level, message)
    { }

    /// <inheritdoc cref="AddNodeLogEffect(string, string, UINodeLogLevel, string, object?[])"/>
    public AddNodeLogEffect(UIComponentReference target, string nodeId, UINodeLogLevel level, string message)
        : base(target)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(nodeId);
        ArgumentNullException.ThrowIfNull(message);

        NodeId = nodeId;
        Level = level;
        Message = message;
    }

    /// <inheritdoc/>
    public override string Kind => EffectKind;

    /// <summary>
    /// Gets the id of the node the line came from — the one a click on the line takes the view to.
    /// </summary>
    public string NodeId { get; }

    /// <summary>
    /// Gets how much the line matters.
    /// </summary>
    public UINodeLogLevel Level { get; }

    /// <summary>
    /// Gets what the line says.
    /// </summary>
    public string Message { get; }

    /// <inheritdoc/>
    public override ClientEffect Resolve(IUIReferenceResolver resolver)
    {
        ArgumentNullException.ThrowIfNull(resolver);

        return new CompiledAddNodeLogEffect(resolver.ResolveComponent(Target), NodeId, Level, Message);
    }
}

internal sealed class CompiledAddNodeLogEffect(UIComponentAddress target, string nodeId, UINodeLogLevel level, string message) : CompiledTargetedClientEffect(target)
{
    public override string Kind => AddNodeLogEffect.EffectKind;

    public string NodeId { get; } = nodeId;

    public UINodeLogLevel Level { get; } = level;

    public string Message { get; } = message;
}
