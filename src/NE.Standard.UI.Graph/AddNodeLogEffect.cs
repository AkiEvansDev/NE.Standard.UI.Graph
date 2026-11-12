using System;
using System.Text.Json.Serialization;
using NE.Standard.UI.Abstractions.Binding.Addresses;
using NE.Standard.UI.Abstractions.Effects;
using NE.Standard.UI.Primitives.Localization;

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
    /// <remarks>A word, or a node's own text (<see cref="UIPhrase.Text"/>).</remarks>
    public AddNodeLogEffect(string targetComponentId, string nodeId, UINodeLogLevel level, UIPhrase message, params object?[]? dynamicParameters)
        : this(new UIComponentReference(targetComponentId, dynamicParameters), nodeId, level, message)
    { }

    /// <inheritdoc cref="AddNodeLogEffect(string, string, UINodeLogLevel, UIPhrase, object?[])"/>
    public AddNodeLogEffect(UIComponentReference target, string nodeId, UINodeLogLevel level, UIPhrase message)
        : base(target)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(nodeId);
        ArgumentNullException.ThrowIfNull(message);

        NodeId = nodeId;
        Level = level;
        Message = message;
    }

    [JsonConstructor]
    internal AddNodeLogEffect(UIComponentAddress? resolvedTarget, string nodeId, UINodeLogLevel level, UIPhrase message)
        : base(resolvedTarget)
    {
        NodeId = nodeId;
        Level = level;
        Message = message;
    }

    private AddNodeLogEffect(UIComponentAddress resolvedTarget, UIComponentReference target, string nodeId, UINodeLogLevel level, UIPhrase message)
        : base(resolvedTarget, target)
    {
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
    /// Gets what the line says, written in the page's language.
    /// </summary>
    public UIPhrase Message { get; }

    /// <inheritdoc/>
    public override ClientEffect Resolve(IUIReferenceResolver resolver)
    {
        ArgumentNullException.ThrowIfNull(resolver);

        return ResolvedTarget is not null ? this : new AddNodeLogEffect(resolver.ResolveComponent(Target), Target, NodeId, Level, Message);
    }
}
