using System;
using System.Collections;
using System.Collections.Generic;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;

namespace NE.Standard.UI.Graph;

/// <summary>
/// Runs a saved document in connection order, filling each node's inputs from the outputs feeding it and reading its outputs for
/// the nodes below. Values stay the developer's typed properties throughout.
/// </summary>
public sealed class UINodeRunner(UINodeCatalog catalog, IServiceProvider? services = null)
{
    private readonly UINodeCatalog _catalog = catalog ?? throw new ArgumentNullException(nameof(catalog));
    private readonly IServiceProvider? _services = services;

    /// <summary>
    /// Called as a node's state changes: before it runs, while it reports, and when done or failed. A controller turns this into
    /// <see cref="SetNodeStatusEffect"/>s for the canvas.
    /// </summary>
    /// <remarks>
    /// Awaited before the next node starts, so a controller pushing status to the canvas (<c>UIContext.SendEffectsAsync</c>) makes
    /// the run visible as it happens.
    /// </remarks>
    public Func<string, UINodeState, double?, string?, ValueTask>? OnStatus { get; set; }

    /// <summary>
    /// Called with a display pin's value once its node has run — node id, pin name and value. A controller turns this into
    /// <see cref="SetNodeDisplayEffect"/>s.
    /// </summary>
    public Func<string, string, object?, ValueTask>? OnDisplay { get; set; }

    /// <summary>
    /// Called with every log line — node id, level and message — from a node's own logging and every failure. A controller turns
    /// this into <see cref="AddNodeLogEffect"/>s.
    /// </summary>
    public Func<string, UINodeLogLevel, string, ValueTask>? OnLog { get; set; }

    /// <summary>
    /// Called with how many nodes are through, of how many — once before the first node and after each one. A controller turns
    /// this into <see cref="SetRunProgressEffect"/>s.
    /// </summary>
    public Func<int, int, ValueTask>? OnRunProgress { get; set; }

    /// <summary>
    /// Runs the document and answers what every node's outputs came to.
    /// </summary>
    /// <remarks>
    /// A failed node's branch stops there — nodes fed by it are skipped, others run normally. A node on a cycle fails the same
    /// way, waiting for itself; unrelated chains still complete.
    /// </remarks>
    public async Task<UINodeRunResult> RunAsync(UINodeDocument document, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(document);

        UINodeNetwork network = _catalog.Materialize(document);

        Order(network, out UINodeInstance[] ordered, out UINodeInstance[] cyclic, out UINodeInstance[] beneath);

        Dictionary<string, List<UINodeConnection>> incoming = new(StringComparer.Ordinal);

        foreach (UINodeConnection connection in network.Connections)
        {
            if (!incoming.TryGetValue(connection.To.Id, out List<UINodeConnection>? edges))
                incoming[connection.To.Id] = edges = [];

            edges.Add(connection);
        }

        Dictionary<string, IReadOnlyDictionary<string, object?>> outputs = new(StringComparer.Ordinal);
        List<UINodeFailure> failures = [];
        List<string> skipped = [];
        // Both failed and skipped nodes stop their branch; the topological order lets this be one pass rather than a graph walk.
        HashSet<string> stopped = new(StringComparer.Ordinal);
        var total = ordered.Length + cyclic.Length + beneath.Length;
        var completed = 0;

        // Before the first node: this is what begins a run on the canvas, and so what clears the last run's log.
        await ReportRunAsync(completed, total).ConfigureAwait(false);

        foreach (UINodeInstance node in ordered)
        {
            cancellationToken.ThrowIfCancellationRequested();

            _ = incoming.TryGetValue(node.Id, out List<UINodeConnection>? edges);

            if (edges is not null && IsFedByStopped(edges, stopped))
            {
                await SkipAsync(node, stopped, skipped).ConfigureAwait(false);
                await ReportRunAsync(++completed, total).ConfigureAwait(false);
                continue;
            }

            if (edges is not null)
                Feed(node, edges, outputs);

            await ReportStatusAsync(node.Id, UINodeState.Running, null, null).ConfigureAwait(false);

            if (MissingRequired(node) is { } missing)
            {
                await FailAsync(node, missing, stopped, failures).ConfigureAwait(false);
                await ReportRunAsync(++completed, total).ConfigureAwait(false);
                continue;
            }

            UINodeRunContext context = new(node.Id, node.Type, OnStatus, OnLog, _services);

            try
            {
                await ExecuteAsync(node, context, cancellationToken).ConfigureAwait(false);
            }
            catch (OperationCanceledException)
            {
                throw;
            }
            catch (Exception exception)
            {
                // What the node wrote before it fell comes first: it is usually the line that says why.
                await context.FlushAsync().ConfigureAwait(false);
                await FailAsync(node, exception.Message, stopped, failures).ConfigureAwait(false);
                await ReportRunAsync(++completed, total).ConfigureAwait(false);
                continue;
            }

            await context.FlushAsync().ConfigureAwait(false);

            outputs[node.Id] = ReadOutputs(node);

            await ReportDisplaysAsync(node).ConfigureAwait(false);
            // No progress with the last word: the line a running node draws goes when the node is done, rather than standing full.
            await ReportStatusAsync(node.Id, UINodeState.Done, null, null).ConfigureAwait(false);
            await ReportRunAsync(++completed, total).ConfigureAwait(false);
        }

        // A node on a cycle fails like any failed node; what it feeds is skipped the same way — a cycle costs only its own corner.
        foreach (UINodeInstance node in cyclic)
        {
            await FailAsync(node, "The node is on a cycle: it waits for itself.", stopped, failures).ConfigureAwait(false);
            await ReportRunAsync(++completed, total).ConfigureAwait(false);
        }

        foreach (UINodeInstance node in beneath)
        {
            await SkipAsync(node, stopped, skipped).ConfigureAwait(false);
            await ReportRunAsync(++completed, total).ConfigureAwait(false);
        }

        return failures.Count == 0
            ? UINodeRunResult.Completed(outputs)
            : UINodeRunResult.Stopped(outputs, failures, skipped);
    }

    /// <summary>
    /// The nodes in dependency order; nodes a cycle keeps unreachable go to <paramref name="cyclic"/>, and what they feed to
    /// <paramref name="beneath"/>.
    /// </summary>
    private static void Order(UINodeNetwork network, out UINodeInstance[] ordered, out UINodeInstance[] cyclic, out UINodeInstance[] beneath)
    {
        Dictionary<string, int> waitingFor = new(StringComparer.Ordinal);
        Dictionary<string, List<UINodeInstance>> feeds = new(StringComparer.Ordinal);

        foreach (UINodeInstance node in network.Nodes)
            waitingFor[node.Id] = 0;

        foreach (UINodeConnection connection in network.Connections)
        {
            waitingFor[connection.To.Id]++;

            if (!feeds.TryGetValue(connection.From.Id, out List<UINodeInstance>? below))
                feeds[connection.From.Id] = below = [];

            below.Add(connection.To);
        }

        Queue<UINodeInstance> ready = new();

        foreach (UINodeInstance node in network.Nodes)
        {
            if (waitingFor[node.Id] == 0)
                ready.Enqueue(node);
        }

        List<UINodeInstance> order = [];

        while (ready.Count > 0)
        {
            UINodeInstance node = ready.Dequeue();

            order.Add(node);

            if (!feeds.TryGetValue(node.Id, out List<UINodeInstance>? below))
                continue;

            foreach (UINodeInstance next in below)
            {
                if (--waitingFor[next.Id] == 0)
                    ready.Enqueue(next);
            }
        }

        ordered = [.. order];

        // What no order reaches is still waiting: on a cycle if a path among the waiting leads back to it, below one otherwise.
        HashSet<string> waiting = new(StringComparer.Ordinal);
        List<UINodeInstance> onCycle = [];
        List<UINodeInstance> under = [];

        foreach (UINodeInstance node in network.Nodes)
        {
            if (waitingFor[node.Id] > 0)
                _ = waiting.Add(node.Id);
        }

        foreach (UINodeInstance node in network.Nodes)
        {
            if (waiting.Contains(node.Id))
                (ReachesItself(node, feeds, waiting) ? onCycle : under).Add(node);
        }

        cyclic = [.. onCycle];
        beneath = [.. under];
    }

    private static bool ReachesItself(UINodeInstance node, Dictionary<string, List<UINodeInstance>> feeds, HashSet<string> waiting)
    {
        HashSet<string> seen = new(StringComparer.Ordinal);
        Stack<UINodeInstance> pending = new();

        pending.Push(node);

        while (pending.Count > 0)
        {
            if (!feeds.TryGetValue(pending.Pop().Id, out List<UINodeInstance>? fed))
                continue;

            foreach (UINodeInstance next in fed)
            {
                if (string.Equals(next.Id, node.Id, StringComparison.Ordinal))
                    return true;

                if (waiting.Contains(next.Id) && seen.Add(next.Id))
                    pending.Push(next);
            }
        }

        return false;
    }

    private static bool IsFedByStopped(List<UINodeConnection> edges, HashSet<string> stopped)
    {
        foreach (UINodeConnection edge in edges)
        {
            if (stopped.Contains(edge.From.Id))
                return true;
        }

        return false;
    }

    private async ValueTask SkipAsync(UINodeInstance node, HashSet<string> stopped, List<string> skipped)
    {
        _ = stopped.Add(node.Id);
        skipped.Add(node.Id);

        // No message: the reason is on the node that failed; a skipped node needs only its own frame.
        await ReportStatusAsync(node.Id, UINodeState.Skipped, null, null).ConfigureAwait(false);
    }

    /// <summary>A node's state on its way to whoever asked for it, awaited so the canvas has it before the next node starts.</summary>
    private ValueTask ReportStatusAsync(string nodeId, UINodeState state, double? progress, string? message)
        => OnStatus is null ? ValueTask.CompletedTask : OnStatus(nodeId, state, progress, message);

    private ValueTask ReportRunAsync(int completed, int total)
        => OnRunProgress is null ? ValueTask.CompletedTask : OnRunProgress(completed, total);

    /// <summary>Puts what feeds a node's input pins onto its properties, coerced into the types the class declares.</summary>
    private void Feed(UINodeInstance node, List<UINodeConnection> edges, Dictionary<string, IReadOnlyDictionary<string, object?>> outputs)
    {
        UINodeType? type = _catalog.TryGetType(node.Type, out UINodeType found) ? found : null;
        // A pin that takes several gathers them and is written once, in the edges' own order; every other takes the one edge.
        Dictionary<string, List<object?>> gathered = new(StringComparer.Ordinal);

        foreach (UINodeConnection edge in edges)
        {
            if (!outputs.TryGetValue(edge.From.Id, out IReadOnlyDictionary<string, object?>? produced) || !produced.TryGetValue(edge.FromPin, out var value))
                continue;

            PropertyInfo? target = UINodeProperties.Find(node.Node.GetType(), edge.ToPin);

            if (target is null || !target.CanWrite)
                continue;

            if (!IsMultiple(type, edge.ToPin))
            {
                UINodeProperties.Set(target, node.Node, value);
                continue;
            }

            if (!gathered.TryGetValue(edge.ToPin, out List<object?>? values))
                gathered[edge.ToPin] = values = [];

            values.Add(value);
        }

        foreach (KeyValuePair<string, List<object?>> pin in gathered)
        {
            PropertyInfo? target = UINodeProperties.Find(node.Node.GetType(), pin.Key);

            if (target is null)
                continue;

            // Connected values first, then any typed on the node itself — a Multiple pin's typed row is one more element, not a replacement.
            if (target.CanRead && target.GetValue(node.Node) is IEnumerable typed and not string)
            {
                foreach (var value in typed)
                    pin.Value.Add(value);
            }

            UINodeProperties.Set(target, node.Node, UINodeProperties.Collect(target.PropertyType, pin.Value));
        }
    }

    private static bool IsMultiple(UINodeType? type, string pinName)
    {
        if (type is null)
            return false;

        foreach (UINodePin pin in type.Inputs)
        {
            if (string.Equals(pin.Name, pinName, StringComparison.Ordinal))
                return pin.Multiple;
        }

        return false;
    }

    /// <summary>The title of the first required input the node was handed nothing for, or nothing when it has all of them.</summary>
    private string? MissingRequired(UINodeInstance node)
    {
        if (!_catalog.TryGetType(node.Type, out UINodeType type))
            return null;

        foreach (UINodePin pin in type.Inputs)
        {
            if (!pin.Required)
                continue;

            PropertyInfo? property = UINodeProperties.Find(node.Node.GetType(), pin.Name);

            if (property is not null && property.CanRead && IsEmpty(property.GetValue(node.Node)))
                return $"'{pin.Title}' is required.";
        }

        return null;
    }

    private static bool IsEmpty(object? value)
        => value switch
        {
            null => true,
            string text => string.IsNullOrWhiteSpace(text),
            ICollection collection => collection.Count == 0,
            _ => false
        };

    private async ValueTask FailAsync(UINodeInstance node, string message, HashSet<string> stopped, List<UINodeFailure> failures)
    {
        _ = stopped.Add(node.Id);
        failures.Add(new UINodeFailure(node.Id, message));

        await ReportStatusAsync(node.Id, UINodeState.Error, null, message).ConfigureAwait(false);

        // The node itself only turns red; why it did is a line of the log, which has room for the whole of it.
        if (OnLog is not null)
            await OnLog(node.Id, UINodeLogLevel.Error, message).ConfigureAwait(false);
    }

    private static async ValueTask ExecuteAsync(UINodeInstance node, UINodeRunContext context, CancellationToken cancellationToken)
    {
        if (node.Node is IGraphNodeAsync asynchronous)
            await asynchronous.ExecuteAsync(context, cancellationToken).ConfigureAwait(false);
        else if (node.Node is IGraphNode synchronous)
            synchronous.Execute(context);
    }

    private static Dictionary<string, object?> ReadOutputs(UINodeInstance node)
    {
        Dictionary<string, object?> values = new(StringComparer.Ordinal);

        foreach (PropertyInfo property in UINodeProperties.Own(node.Node.GetType()))
        {
            if (property.CanRead && property.GetCustomAttribute<GraphOutputAttribute>() is not null)
                values[property.Name] = property.GetValue(node.Node);
        }

        return values;
    }

    /// <summary>What each of a node's display pins ended up holding: whatever reached it, or whatever the node itself put there.</summary>
    private async ValueTask ReportDisplaysAsync(UINodeInstance node)
    {
        if (OnDisplay is null || !_catalog.TryGetType(node.Type, out UINodeType type))
            return;

        foreach (UINodePin pin in type.Inputs)
        {
            if (pin.Editor != UINodeEditor.Display)
                continue;

            PropertyInfo? property = UINodeProperties.Find(node.Node.GetType(), pin.Name);

            if (property is not null && property.CanRead)
                await OnDisplay(node.Id, pin.Name, property.GetValue(node.Node)).ConfigureAwait(false);
        }
    }
}

/// <summary>
/// One node that did not run, and why.
/// </summary>
public sealed record UINodeFailure(string NodeId, string Error);

/// <summary>
/// What a run came to: every node's outputs, and the nodes that failed along with the ones their failure took with them.
/// </summary>
public sealed class UINodeRunResult
{
    private UINodeRunResult(IReadOnlyDictionary<string, IReadOnlyDictionary<string, object?>> outputs, IReadOnlyList<UINodeFailure> failures, IReadOnlyList<string> skipped)
    {
        Outputs = outputs;
        Failures = failures;
        Skipped = skipped;
    }

    /// <summary>
    /// Gets whether every node ran.
    /// </summary>
    public bool Success => Failures.Count == 0;

    /// <summary>
    /// Gets the outputs of every node that ran, by node id and then by pin name.
    /// </summary>
    public IReadOnlyDictionary<string, IReadOnlyDictionary<string, object?>> Outputs { get; }

    /// <summary>
    /// Gets every node that failed, in the order the run reached them.
    /// </summary>
    public IReadOnlyList<UINodeFailure> Failures { get; }

    /// <summary>
    /// Gets the nodes that were never reached because something feeding them failed.
    /// </summary>
    public IReadOnlyList<string> Skipped { get; }

    /// <summary>
    /// Gets the first node the run failed on.
    /// </summary>
    public string? FailedNodeId => Failures.Count == 0 ? null : Failures[0].NodeId;

    /// <summary>
    /// Gets what went wrong on <see cref="FailedNodeId"/>.
    /// </summary>
    public string? Error => Failures.Count == 0 ? null : Failures[0].Error;

    /// <summary>
    /// The value one node's output pin came to.
    /// </summary>
    public bool TryGetOutput(string nodeId, string pinName, out object? value)
    {
        if (Outputs.TryGetValue(nodeId, out IReadOnlyDictionary<string, object?>? produced))
            return produced.TryGetValue(pinName, out value);

        value = null;
        return false;
    }

    internal static UINodeRunResult Completed(IReadOnlyDictionary<string, IReadOnlyDictionary<string, object?>> outputs)
        => new(outputs, [], []);

    internal static UINodeRunResult Stopped(IReadOnlyDictionary<string, IReadOnlyDictionary<string, object?>> outputs, IReadOnlyList<UINodeFailure> failures, IReadOnlyList<string> skipped)
        => new(outputs, failures, skipped);
}
