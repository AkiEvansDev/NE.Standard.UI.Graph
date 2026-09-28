using System;
using System.Collections;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
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
    private static readonly ConcurrentDictionary<Type, bool> AlwaysRunsByType = new();

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
    /// Called, once the run is through, with each state value it changed — node id, pin name and value
    /// (<see cref="GraphInputAttribute.State"/>). A controller turns this into a committed <see cref="SetNodeValueEffect"/>, so the
    /// canvas holds what the next run starts from; a run stopped part way changes nothing.
    /// </summary>
    public Func<string, string, object?, ValueTask>? OnState { get; set; }

    /// <summary>
    /// Gets or sets what the nodes last came to, so a node whose inputs are the ones it last ran on is handed on rather than run
    /// again; none, every node runs every time.
    /// </summary>
    public UINodeRunCache? Cache { get; set; }

    /// <summary>
    /// Called before each run of <see cref="RunAllAsync"/> with how many runs came before it.
    /// </summary>
    public Func<int, ValueTask>? OnRunStarting { get; set; }

    /// <summary>
    /// Runs the document again and again, each run starting from the state the last one left, until a sequence node
    /// (<see cref="IGraphNodeSequence"/>) has nothing left or <paramref name="maxRuns"/> is reached; a document with no sequence
    /// node runs once.
    /// </summary>
    /// <remarks>
    /// A failure takes its own branch and that run's, as in a single run, and the next run goes on with the next item — one bad file
    /// does not stop a folder — unless the sequence node itself failed, which leaves nothing to go on with.
    /// </remarks>
    public async Task<UINodeRunAllResult> RunAllAsync(UINodeDocument document, int maxRuns, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(document);
        ArgumentOutOfRangeException.ThrowIfLessThan(maxRuns, 1);

        var runs = 0;
        UINodeRunResult last;

        do
        {
            if (OnRunStarting is not null)
                await OnRunStarting(runs).ConfigureAwait(false);

            last = await RunAsync(document, cancellationToken).ConfigureAwait(false);
            document = last.ApplyState(document);
            runs++;
        }
        while (last.HasMore && runs < maxRuns);

        return new UINodeRunAllResult(document, runs, last);
    }

    /// <summary>
    /// Runs the document and answers what every node's outputs came to.
    /// </summary>
    /// <remarks>
    /// A failed node's branch stops there — nodes fed by it are skipped, others run normally. A node on a cycle fails the same
    /// way, waiting for itself; unrelated chains still complete. A kind that does no work and has no pin — a note — is passed over.
    /// </remarks>
    public async Task<UINodeRunResult> RunAsync(UINodeDocument document, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(document);

        UINodeNetwork network = WithoutPassive(_catalog.Materialize(document));

        Cache?.Retain(network.Nodes.Select(static node => node.Id));

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
        Dictionary<string, IReadOnlyDictionary<string, object?>> state = new(StringComparer.Ordinal);
        // Whether a sequence node ran, and whether every one that did has more to hand out.
        var sequences = 0;
        var exhausted = false;
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

            if (MissingRequired(node, edges) is { } missing)
            {
                await FailAsync(node, missing, stopped, failures).ConfigureAwait(false);
                await ReportRunAsync(++completed, total).ConfigureAwait(false);
                continue;
            }

            Dictionary<string, object?>? kept = ReadState(node);
            // Read before it runs: a node may write to its own inputs, a display pin above all.
            var inputs = kept is null && CanKeep(node) ? ReadInputs(node) : null;

            if (inputs is not null && Cache!.TryGet(node.Id, node.Type, inputs, out UINodeRunCache.Entry last))
            {
                outputs[node.Id] = last.Outputs;

                foreach ((var pinName, var value) in last.Displays)
                    await ReportDisplayAsync(node.Id, pinName, value).ConfigureAwait(false);

                await ReportStatusAsync(node.Id, UINodeState.Cached, null, null).ConfigureAwait(false);
                await ReportRunAsync(++completed, total).ConfigureAwait(false);
                continue;
            }

            await ReportStatusAsync(node.Id, UINodeState.Running, null, null).ConfigureAwait(false);

            UINodeRunContext context = new(node.Id, node.Type, OnStatus, OnLog, _services);

            try
            {
                await ExecuteAsync(node, context, cancellationToken).ConfigureAwait(false);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                // Stopped under way: the node stands as it did before, not drawn running for good, and the log says where it ended.
                await ReportStatusAsync(node.Id, UINodeState.Idle, null, null).ConfigureAwait(false);

                if (OnLog is not null)
                    await OnLog(node.Id, UINodeLogLevel.Warning, "Stopped.").ConfigureAwait(false);

                throw;
            }
            catch (Exception exception)
            {
                // A node's own cancellation — a timeout of its own — fails its branch like any other failure, not the whole run.
                // What the node wrote before it fell comes first: it is usually the line that says why.
                ForgetAbove(node, incoming);
                await context.FlushAsync().ConfigureAwait(false);
                await FailAsync(node, exception.Message, stopped, failures).ConfigureAwait(false);
                await ReportRunAsync(++completed, total).ConfigureAwait(false);
                continue;
            }

            await context.FlushAsync().ConfigureAwait(false);

            outputs[node.Id] = ReadOutputs(node);

            if (kept is not null && ChangedState(node, kept) is { } changed)
                state[node.Id] = changed;

            if (node.Node is IGraphNodeSequence sequence)
            {
                sequences++;
                exhausted |= !sequence.HasMore;
            }

            List<KeyValuePair<string, object?>> displays = await ReportDisplaysAsync(node).ConfigureAwait(false);

            if (inputs is not null)
                Cache!.Keep(node.Id, new UINodeRunCache.Entry(node.Type, inputs, outputs[node.Id], displays));

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

        // A sequence node that could not run — failed, or skipped under a failure — has nothing to go on with: a run of all ends
        // there, rather than going round on another sequence with this one no further on.
        foreach (UINodeInstance node in network.Nodes)
        {
            if (node.Node is IGraphNodeSequence && stopped.Contains(node.Id))
                exhausted = true;
        }

        // Written only now the run is through, so a run stopped part way leaves nothing half done behind it: a folder's place
        // moves on only for the file whose whole run happened.
        await ReportStateAsync(state).ConfigureAwait(false);

        return failures.Count == 0
            ? UINodeRunResult.Completed(outputs, state, sequences > 0 && !exhausted)
            : UINodeRunResult.Stopped(outputs, failures, skipped, state, sequences > 0 && !exhausted);
    }

    /// <summary>The network without the nodes a run passes over: no work to do, and no pin to feed or be read.</summary>
    private UINodeNetwork WithoutPassive(UINodeNetwork network)
    {
        List<UINodeInstance> nodes = [];
        HashSet<string> kept = new(StringComparer.Ordinal);

        foreach (UINodeInstance node in network.Nodes)
        {
            if (IsPassive(node))
                continue;

            nodes.Add(node);
            _ = kept.Add(node.Id);
        }

        if (nodes.Count == network.Nodes.Length)
            return network;

        List<UINodeConnection> connections = [];

        foreach (UINodeConnection connection in network.Connections)
        {
            if (kept.Contains(connection.From.Id) && kept.Contains(connection.To.Id))
                connections.Add(connection);
        }

        return new UINodeNetwork([.. nodes], [.. connections]);
    }

    private bool IsPassive(UINodeInstance node)
    {
        if (node.Node is IGraphNode or IGraphNodeAsync || !_catalog.TryGetType(node.Type, out UINodeType type) || type.Outputs.Length > 0)
            return false;

        foreach (UINodePin pin in type.Inputs)
        {
            if (pin.HasPin)
                return false;
        }

        return true;
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

            // Only into an input the kind draws a pin for: a saved edge naming a state, an output or a field with no pin is nothing.
            UINodePin? pin = FindInput(type, edge.ToPin);
            PropertyInfo? target = pin is { HasPin: true, State: false } ? UINodeProperties.Find(node.Node.GetType(), edge.ToPin) : null;

            if (target is null || !target.CanWrite)
                continue;

            if (!pin!.Multiple)
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

    private static UINodePin? FindInput(UINodeType? type, string pinName)
    {
        if (type is null)
            return null;

        foreach (UINodePin pin in type.Inputs)
        {
            if (string.Equals(pin.Name, pinName, StringComparison.Ordinal))
                return pin;
        }

        return null;
    }

    /// <summary>The title of the first required input the node was handed nothing for, or nothing when it has all of them.</summary>
    private string? MissingRequired(UINodeInstance node, List<UINodeConnection>? edges)
    {
        if (!_catalog.TryGetType(node.Type, out UINodeType type))
            return null;

        foreach (UINodePin pin in type.Inputs)
        {
            if (!pin.Required)
                continue;

            PropertyInfo? property = UINodeProperties.Find(node.Node.GetType(), pin.Name);

            if (property is null || !property.CanRead)
                continue;

            // A value type always holds something; with no wire and no field to fill it in, that is only its type's default.
            var unfilled = pin.Editor == UINodeEditor.None && property.PropertyType.IsValueType && !IsFed(edges, pin.Name);

            if (unfilled || IsEmpty(property.GetValue(node.Node)))
                return $"'{pin.Title}' is required.";
        }

        return null;
    }

    private static bool IsFed(List<UINodeConnection>? edges, string pinName)
    {
        if (edges is null)
            return false;

        foreach (UINodeConnection edge in edges)
        {
            if (string.Equals(edge.ToPin, pinName, StringComparison.Ordinal))
                return true;
        }

        return false;
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

    /// <summary>A node's state values as the run hands them to it, to tell afterwards which it changed; null for a node with none.</summary>
    private Dictionary<string, object?>? ReadState(UINodeInstance node)
    {
        if (!_catalog.TryGetType(node.Type, out UINodeType type))
            return null;

        Dictionary<string, object?>? kept = null;

        foreach (UINodePin pin in type.Inputs)
        {
            if (!pin.State || UINodeProperties.Find(node.Node.GetType(), pin.Name) is not { CanRead: true } property)
                continue;

            kept ??= new Dictionary<string, object?>(StringComparer.Ordinal);
            kept[pin.Name] = property.GetValue(node.Node);
        }

        return kept;
    }

    /// <summary>Whether a node's last run may be handed on: a cache to keep it in, no sequence to move on, nothing more than its outputs.</summary>
    private bool CanKeep(UINodeInstance node)
        => Cache is not null
            && node.Node is not IGraphNodeSequence
            && !AlwaysRunsByType.GetOrAdd(node.Node.GetType(), static type => type.GetCustomAttribute<GraphNodeAttribute>()?.AlwaysRuns == true);

    /// <summary>The values a node is about to run on, pin by pin, for the cache to tell a repeat by.</summary>
    private object?[] ReadInputs(UINodeInstance node)
    {
        if (!_catalog.TryGetType(node.Type, out UINodeType type))
            return [];

        var values = new object?[type.Inputs.Length];

        for (var i = 0; i < type.Inputs.Length; i++)
        {
            PropertyInfo? property = UINodeProperties.Find(node.Node.GetType(), type.Inputs[i].Name);

            values[i] = property is { CanRead: true } ? property.GetValue(node.Node) : null;
        }

        return values;
    }

    private static async ValueTask ExecuteAsync(UINodeInstance node, UINodeRunContext context, CancellationToken cancellationToken)
    {
        if (node.Node is IGraphNodeAsync asynchronous)
            await asynchronous.ExecuteAsync(context, cancellationToken).ConfigureAwait(false);
        else if (node.Node is IGraphNode synchronous)
            synchronous.Execute(context);
    }

    /// <summary>
    /// Forgets the last runs of a failed node and of every node above it: the failure may come from what a kept run handed on — a
    /// picture its store has let go since — so the next run makes all of it afresh rather than handing the same thing on again.
    /// </summary>
    private void ForgetAbove(UINodeInstance node, Dictionary<string, List<UINodeConnection>> incoming)
    {
        if (Cache is null)
            return;

        HashSet<string> seen = new(StringComparer.Ordinal) { node.Id };
        Stack<string> pending = new();

        pending.Push(node.Id);

        while (pending.Count > 0)
        {
            var id = pending.Pop();

            Cache.Forget(id);

            if (!incoming.TryGetValue(id, out List<UINodeConnection>? edges))
                continue;

            foreach (UINodeConnection edge in edges)
            {
                if (seen.Add(edge.From.Id))
                    pending.Push(edge.From.Id);
            }
        }
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

    /// <summary>The state values the node's run changed; null when it changed none.</summary>
    private static Dictionary<string, object?>? ChangedState(UINodeInstance node, Dictionary<string, object?> kept)
    {
        Dictionary<string, object?>? changed = null;

        foreach ((var name, var before) in kept)
        {
            var after = UINodeProperties.Find(node.Node.GetType(), name)?.GetValue(node.Node);

            if (Equals(before, after))
                continue;

            changed ??= new Dictionary<string, object?>(StringComparer.Ordinal);
            changed[name] = after;
        }

        return changed;
    }

    /// <summary>What each of a node's display pins ended up holding — whatever reached it, or whatever the node itself put there — passed on and answered.</summary>
    private async ValueTask<List<KeyValuePair<string, object?>>> ReportDisplaysAsync(UINodeInstance node)
    {
        List<KeyValuePair<string, object?>> displays = [];

        if (!_catalog.TryGetType(node.Type, out UINodeType type))
            return displays;

        foreach (UINodePin pin in type.Inputs)
        {
            if (pin.Editor != UINodeEditor.Display || UINodeProperties.Find(node.Node.GetType(), pin.Name) is not { CanRead: true } property)
                continue;

            var value = property.GetValue(node.Node);

            displays.Add(new(pin.Name, value));
            await ReportDisplayAsync(node.Id, pin.Name, value).ConfigureAwait(false);
        }

        return displays;
    }

    private ValueTask ReportDisplayAsync(string nodeId, string pinName, object? value)
        => OnDisplay is null ? ValueTask.CompletedTask : OnDisplay(nodeId, pinName, value);

    private async ValueTask ReportStateAsync(Dictionary<string, IReadOnlyDictionary<string, object?>> state)
    {
        if (OnState is null)
            return;

        foreach ((var nodeId, IReadOnlyDictionary<string, object?> changed) in state)
        {
            foreach ((var pinName, var value) in changed)
                await OnState(nodeId, pinName, value).ConfigureAwait(false);
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
    private UINodeRunResult(IReadOnlyDictionary<string, IReadOnlyDictionary<string, object?>> outputs, IReadOnlyList<UINodeFailure> failures, IReadOnlyList<string> skipped, IReadOnlyDictionary<string, IReadOnlyDictionary<string, object?>> state, bool hasMore)
    {
        Outputs = outputs;
        Failures = failures;
        Skipped = skipped;
        State = state;
        HasMore = hasMore;
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
    /// Gets the state values the run changed, by node id and then by pin name — what the next run starts from.
    /// </summary>
    public IReadOnlyDictionary<string, IReadOnlyDictionary<string, object?>> State { get; }

    /// <summary>
    /// Gets whether a sequence node ran and every one that did has another item for the next run.
    /// </summary>
    public bool HasMore { get; }

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

    /// <summary>
    /// The document with the state values this run changed written into its nodes — the one the next run starts from.
    /// </summary>
    public UINodeDocument ApplyState(UINodeDocument document)
    {
        ArgumentNullException.ThrowIfNull(document);

        foreach ((var nodeId, IReadOnlyDictionary<string, object?> changed) in State)
        {
            foreach ((var pinName, var value) in changed)
                document = document.WithValue(nodeId, pinName, value);
        }

        return document;
    }

    internal static UINodeRunResult Completed(IReadOnlyDictionary<string, IReadOnlyDictionary<string, object?>> outputs, IReadOnlyDictionary<string, IReadOnlyDictionary<string, object?>> state, bool hasMore)
        => new(outputs, [], [], state, hasMore);

    internal static UINodeRunResult Stopped(IReadOnlyDictionary<string, IReadOnlyDictionary<string, object?>> outputs, IReadOnlyList<UINodeFailure> failures, IReadOnlyList<string> skipped, IReadOnlyDictionary<string, IReadOnlyDictionary<string, object?>> state, bool hasMore)
        => new(outputs, failures, skipped, state, hasMore);
}

/// <summary>
/// What <see cref="UINodeRunner.RunAllAsync"/> came to: the document as the last run left it, how many runs there were, and the
/// last one's result.
/// </summary>
public sealed record UINodeRunAllResult(UINodeDocument Document, int Runs, UINodeRunResult Last);
