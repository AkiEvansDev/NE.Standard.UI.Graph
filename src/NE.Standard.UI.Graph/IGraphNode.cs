using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using NE.Standard.UI.Primitives.Localization;

namespace NE.Standard.UI.Graph;

/// <summary>
/// A node kind that runs work: the runner fills its inputs, calls this, then reads its outputs for the nodes downstream.
/// </summary>
/// <remarks>
/// Implement <see cref="IGraphNodeAsync"/> instead for work that waits; a kind implementing both runs through the asynchronous
/// one. A kind implementing neither is a value holder.
/// </remarks>
public interface IGraphNode
{
    /// <summary>
    /// Does this node's work, reading its inputs and writing its outputs.
    /// </summary>
    void Execute(UINodeRunContext context);
}

/// <inheritdoc cref="IGraphNode"/>
public interface IGraphNodeAsync
{
    /// <inheritdoc cref="IGraphNode.Execute"/>
    ValueTask ExecuteAsync(UINodeRunContext context, CancellationToken cancellationToken = default);
}

/// <summary>A node that hands out one item of a sequence each run — the next file of a folder, the next count.</summary>
/// <remarks>
/// It keeps its place in a <see cref="GraphInputAttribute.State"/> value; <see cref="UINodeRunner.RunAllAsync"/> runs a sheet again
/// until one such node has nothing left.
/// </remarks>
public interface IGraphNodeSequence
{
    /// <summary>Gets whether another run would find one more item, once this one has run.</summary>
    bool HasMore { get; }
}

/// <summary>
/// What a running node is told and what it may say back: which node it is, how far along it is, and lines for the canvas's log.
/// </summary>
public sealed class UINodeRunContext
{
    private readonly Func<string, UINodeState, double?, UIPhrase?, ValueTask>? _report;
    private readonly Func<string, UINodeLogLevel, UIPhrase, ValueTask>? _log;
    // What a node running straight through wrote: it cannot wait for a line to go, so the runner sends them when it is done.
    private readonly List<(UINodeLogLevel Level, UIPhrase Message)> _kept = [];

    internal UINodeRunContext(string nodeId, string nodeType, Func<string, UINodeState, double?, UIPhrase?, ValueTask>? report, Func<string, UINodeLogLevel, UIPhrase, ValueTask>? log, IServiceProvider? services)
    {
        NodeId = nodeId;
        NodeType = nodeType;
        _report = report;
        _log = log;
        Services = services;
    }

    /// <summary>
    /// Gets the node's id in the document — the id a status effect is addressed to.
    /// </summary>
    public string NodeId { get; }

    /// <summary>
    /// Gets the key of the node kind.
    /// </summary>
    public string NodeType { get; }

    /// <summary>
    /// Gets the application's services the runner was given to hand round, for a node to reach a store, client or database; null
    /// if none were given.
    /// </summary>
    /// <remarks>The only way in: node kinds are built from a parameterless constructor.</remarks>
    public IServiceProvider? Services { get; }

    /// <summary>
    /// Reports how far along this node is; the runner passes it on, normally to the canvas.
    /// </summary>
    /// <remarks>
    /// Awaited, so the report leaves before the node continues — only a node that waits (<see cref="IGraphNodeAsync"/>) can call
    /// this mid-run.
    /// </remarks>
    public ValueTask ReportAsync(string? message, double? progress = null)
        => ReportAsync(Said(message), progress);

    /// <summary>
    /// Reports how far along this node is with a phrase — a word the page's language writes — or none; the runner passes it on,
    /// normally to the canvas.
    /// </summary>
    /// <remarks>Awaited, as <see cref="ReportAsync(string?, double?)"/> is.</remarks>
    public ValueTask ReportAsync(UIPhrase? message, double? progress = null)
        => _report is null ? ValueTask.CompletedTask : _report(NodeId, UINodeState.Running, progress, message);

    /// <summary>A node's own text as a phrase shown as written, or nothing for a blank one.</summary>
    internal static UIPhrase? Said(string? text)
        => string.IsNullOrWhiteSpace(text) ? null : UIPhrase.Text(text);

    /// <summary>
    /// Writes a line to the canvas's log, naming this node, and awaits until it is sent.
    /// </summary>
    /// <remarks>
    /// For a node that waits (<see cref="IGraphNodeAsync"/>), the line appears while it still works. The text is the node's own,
    /// shown as written; a blank one says nothing.
    /// </remarks>
    public ValueTask LogAsync(string message, UINodeLogLevel level = UINodeLogLevel.Info)
    {
        ArgumentNullException.ThrowIfNull(message);

        return Said(message) is { } said ? LogAsync(said, level) : ValueTask.CompletedTask;
    }

    /// <summary>
    /// Writes a phrase to the canvas's log — a word the page's language writes — naming this node, and awaits until it is sent.
    /// </summary>
    public ValueTask LogAsync(UIPhrase message, UINodeLogLevel level = UINodeLogLevel.Info)
    {
        ArgumentNullException.ThrowIfNull(message);

        return _log is null ? ValueTask.CompletedTask : _log(NodeId, level, message);
    }

    /// <summary>
    /// Writes a line to the canvas's log, naming this node; the line goes when the node is done, failed or not.
    /// </summary>
    /// <remarks>
    /// For a node that runs straight through (<see cref="IGraphNode"/>), which cannot send a line mid-run. The text is the node's
    /// own, shown as written; a blank one says nothing.
    /// </remarks>
    public void Log(string message, UINodeLogLevel level = UINodeLogLevel.Info)
    {
        ArgumentNullException.ThrowIfNull(message);

        if (Said(message) is { } said)
            _kept.Add((level, said));
    }

    /// <summary>
    /// Writes a phrase to the canvas's log — a word the page's language writes — naming this node; the line goes when the node is
    /// done, failed or not.
    /// </summary>
    public void Log(UIPhrase message, UINodeLogLevel level = UINodeLogLevel.Info)
    {
        ArgumentNullException.ThrowIfNull(message);

        _kept.Add((level, message));
    }

    /// <summary>Sends what <see cref="Log(UIPhrase, UINodeLogLevel)"/> kept, in the order it was written.</summary>
    internal async ValueTask FlushAsync()
    {
        if (_log is null)
            return;

        foreach ((UINodeLogLevel level, UIPhrase message) in _kept)
            await _log(NodeId, level, message).ConfigureAwait(false);

        _kept.Clear();
    }
}
