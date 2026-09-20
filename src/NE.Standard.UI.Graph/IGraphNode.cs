using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

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

/// <summary>
/// What a running node is told and what it may say back: which node it is, how far along it is, and lines for the canvas's log.
/// </summary>
public sealed class UINodeRunContext
{
    private readonly Func<string, UINodeState, double?, string?, ValueTask>? _report;
    private readonly Func<string, UINodeLogLevel, string, ValueTask>? _log;
    // What a node running straight through wrote: it cannot wait for a line to go, so the runner sends them when it is done.
    private readonly List<(UINodeLogLevel Level, string Message)> _kept = [];

    internal UINodeRunContext(string nodeId, string nodeType, Func<string, UINodeState, double?, string?, ValueTask>? report, Func<string, UINodeLogLevel, string, ValueTask>? log, IServiceProvider? services)
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
        => _report is null ? ValueTask.CompletedTask : _report(NodeId, UINodeState.Running, progress, message);

    /// <summary>
    /// Writes a line to the canvas's log, naming this node, and awaits until it is sent.
    /// </summary>
    /// <remarks>For a node that waits (<see cref="IGraphNodeAsync"/>), the line appears while it still works.</remarks>
    public ValueTask LogAsync(string message, UINodeLogLevel level = UINodeLogLevel.Info)
    {
        ArgumentNullException.ThrowIfNull(message);

        return _log is null ? ValueTask.CompletedTask : _log(NodeId, level, message);
    }

    /// <summary>
    /// Writes a line to the canvas's log, naming this node; the line goes when the node is done, failed or not.
    /// </summary>
    /// <remarks>For a node that runs straight through (<see cref="IGraphNode"/>), which cannot send a line mid-run.</remarks>
    public void Log(string message, UINodeLogLevel level = UINodeLogLevel.Info)
    {
        ArgumentNullException.ThrowIfNull(message);

        _kept.Add((level, message));
    }

    /// <summary>Sends what <see cref="Log"/> kept, in the order it was written.</summary>
    internal async ValueTask FlushAsync()
    {
        if (_log is null)
            return;

        foreach ((UINodeLogLevel level, var message) in _kept)
            await _log(NodeId, level, message).ConfigureAwait(false);

        _kept.Clear();
    }
}
