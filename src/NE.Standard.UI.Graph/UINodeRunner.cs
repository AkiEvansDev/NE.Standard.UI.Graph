using System;
using System.Collections;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using NE.Standard.UI.Abstractions.Items;
using NE.Standard.UI.Primitives.Localization;

namespace NE.Standard.UI.Graph;

/// <summary>Runs a saved document in connection order, filling each node's inputs from the outputs feeding it.</summary>
/// <remarks>Values stay the developer's typed properties throughout.</remarks>
public sealed partial class UINodeRunner(UINodeCatalog catalog, IServiceProvider? services = null)
{
    /// <summary>The most nodes one run takes unless the caller says otherwise.</summary>
    public const int DefaultMaxNodes = 2_000;

    /// <summary>The most characters a node's text output holds unless the caller says otherwise.</summary>
    public const int DefaultMaxTextLength = 1_000_000;

    private static readonly ConcurrentDictionary<Type, bool> AlwaysRunsByType = new();

    private readonly UINodeCatalog _catalog = catalog ?? throw new ArgumentNullException(nameof(catalog));
    private readonly IServiceProvider? _services = services;
    private readonly ILogger? _logger = (services?.GetService(typeof(ILoggerFactory)) as ILoggerFactory)?.CreateLogger<UINodeRunner>();

    /// <summary>Called as a node's state changes: before it runs, while it reports, and when done or failed.</summary>
    /// <remarks>
    /// A controller turns this into <see cref="SetNodeStatusEffect"/>s. Awaited before the next node starts, so a controller
    /// pushing status to the canvas (<c>UIContext.SendEffectsAsync</c>) makes the run visible as it happens. The runner's own
    /// messages are its words (<see cref="UIGraphWords"/>); a node's are its text.
    /// </remarks>
    public Func<string, UINodeState, double?, UIPhrase?, ValueTask>? OnStatus { get; set; }

    /// <summary>
    /// Called with a display pin's value once its node has run — node id, pin name and value. A controller turns this into
    /// <see cref="SetNodeDisplayEffect"/>s.
    /// </summary>
    public Func<string, string, object?, ValueTask>? OnDisplay { get; set; }

    /// <summary>
    /// Called with every log line — node id, level and message — from a node's own logging and every failure. A controller turns
    /// this into <see cref="AddNodeLogEffect"/>s.
    /// </summary>
    public Func<string, UINodeLogLevel, UIPhrase, ValueTask>? OnLog { get; set; }

    /// <summary>
    /// Called with how many nodes are through, of how many — once before the first node and after each one. A controller turns
    /// this into <see cref="SetRunProgressEffect"/>s.
    /// </summary>
    public Func<int, int, ValueTask>? OnRunProgress { get; set; }

    /// <summary>
    /// Called once the run is through with each state value it changed — node id, pin name and value
    /// (<see cref="GraphInputAttribute.State"/>).
    /// </summary>
    /// <remarks>
    /// A controller turns this into a committed <see cref="SetNodeValueEffect"/>, so the canvas holds what the next run starts
    /// from; a run stopped part way changes nothing.
    /// </remarks>
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
    /// Gets or sets whether the viewer reads an unforeseen exception's own message, as the application's
    /// <c>IncludeExceptionDetail</c> says for a command; off, only its type, and the whole of it goes to the server's log.
    /// </summary>
    /// <remarks>A <see cref="UINodeFailureException"/> is a node's own word, read as written either way.</remarks>
    public bool IncludeExceptionDetail { get; set; }

    /// <summary>Gets or sets the most nodes a run takes; a document with more is refused whole, before any node runs.</summary>
    /// <remarks>The document may be the browser's, on a page anyone viewing drives.</remarks>
    public int MaxNodes { get; set; } = DefaultMaxNodes;

    /// <summary>
    /// Gets or sets the most characters a node's text output holds; a node whose text comes to more fails, and the text kinds stop
    /// before they make it (<see cref="UINodeRunContext.MaxTextLength"/>).
    /// </summary>
    public int MaxTextLength { get; set; } = DefaultMaxTextLength;

    /// <summary>Gets or sets the runtime choices for <see cref="GraphInputAttribute.ChoicesKey"/> inputs enforced when materializing.</summary>
    public IReadOnlyDictionary<string, IReadOnlyList<UIChoice>>? PinChoices { get; set; }

    /// <summary>
    /// Runs the document again and again, each run from the state the last one left, until its sequence node
    /// (<see cref="IGraphNodeSequence"/>) runs out or <paramref name="maxRuns"/> is reached.
    /// </summary>
    /// <remarks>
    /// A document with no sequence node runs once. A failure takes its own branch and that run's, as in a single run, and the next
    /// run goes on with the next item — one bad file does not stop a folder — unless the sequence node itself failed.
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
    /// way, waiting for itself; unrelated chains still complete. A kind that does no work and has no pin — a note — is passed over,
    /// and so is a node turned off, whose inputs it fed take their own values.
    /// </remarks>
    public async Task<UINodeRunResult> RunAsync(UINodeDocument document, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(document);

        if (document.Nodes.Length > MaxNodes)
            return UINodeRunResult.Refused(UIPhrase.Of(UIGraphWords.RunTooManyNodes, ("max", MaxNodes)));

        UINodeNetwork network = WithoutPassive(_catalog.Materialize(document, PinChoices));

        Cache?.Retain(network.Nodes.Select(static node => node.Id));

        Order(network, out UINodeInstance[] ordered, out UINodeInstance[] cyclic, out UINodeInstance[] beneath);

        Dictionary<string, List<UINodeConnection>> incoming = [with(StringComparer.Ordinal)];

        foreach (UINodeConnection connection in network.Connections)
        {
            if (!incoming.TryGetValue(connection.To.Id, out List<UINodeConnection>? edges))
                incoming[connection.To.Id] = edges = [];

            edges.Add(connection);
        }

        Dictionary<string, IReadOnlyDictionary<string, object?>> outputs = [with(StringComparer.Ordinal)];
        List<UINodeFailure> failures = [];
        List<string> skipped = [];
        // Both failed and skipped nodes stop their branch; the topological order lets this be one pass rather than a graph walk.
        HashSet<string> stopped = [with(StringComparer.Ordinal)];
        Dictionary<string, IReadOnlyDictionary<string, object?>> state = [with(StringComparer.Ordinal)];
        // Whether each sequence node that ran has more to hand out.
        List<bool> sequences = [];
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

            UINodeRunContext context = new(node.Id, node.Type, OnStatus, OnLog, _services, MaxTextLength);
            UIPhrase? failure;

            try
            {
                failure = await RunNodeAsync(node, edges, network.PinChoices ?? PinChoices, context, outputs, state, sequences, cancellationToken).ConfigureAwait(false);
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                // Stopped under way: the node stands as it did before, not drawn running for good, and the log says where it ended.
                await ReportStatusAsync(node.Id, UINodeState.Idle, null, null).ConfigureAwait(false);

                if (OnLog is not null)
                    await OnLog(node.Id, UINodeLogLevel.Warning, new UIPhrase(UIGraphWords.RunStopped)).ConfigureAwait(false);

                throw;
            }
            catch (Exception exception)
            {
                // A node's own cancellation — a timeout of its own — fails its branch like any other failure, not the whole run.
                // A failed node hands nothing on, even when only a report after its outputs fell. What the node wrote before it
                // fell comes first: it is usually the line that says why.
                _ = outputs.Remove(node.Id);
                _ = state.Remove(node.Id);
                ForgetAbove(node, incoming);
                await context.FlushAsync().ConfigureAwait(false);
                failure = FailureOf(node, exception);
            }

            if (failure is not null)
                await FailAsync(node, failure, stopped, failures).ConfigureAwait(false);

            await ReportRunAsync(++completed, total).ConfigureAwait(false);
        }

        // A node on a cycle fails like any failed node; what it feeds is skipped the same way — a cycle costs only its own corner.
        foreach (UINodeInstance node in cyclic)
        {
            await FailAsync(node, new UIPhrase(UIGraphWords.RunCycle), stopped, failures).ConfigureAwait(false);
            await ReportRunAsync(++completed, total).ConfigureAwait(false);
        }

        foreach (UINodeInstance node in beneath)
        {
            await SkipAsync(node, stopped, skipped).ConfigureAwait(false);
            await ReportRunAsync(++completed, total).ConfigureAwait(false);
        }

        // A sequence node that could not run — failed, or skipped under a failure — has nothing to go on with: a run of all ends
        // there, rather than going round on another sequence with this one no further on.
        var exhausted = sequences.Contains(false);

        foreach (UINodeInstance node in network.Nodes)
        {
            if (node.Node is IGraphNodeSequence && stopped.Contains(node.Id))
                exhausted = true;
        }

        // Written only now the run is through, so a run stopped part way leaves nothing half done behind it: a folder's place
        // moves on only for the file whose whole run happened.
        await ReportStateAsync(state).ConfigureAwait(false);

        return failures.Count == 0
            ? UINodeRunResult.Completed(outputs, state, sequences.Count > 0 && !exhausted)
            : UINodeRunResult.Stopped(outputs, failures, skipped, state, sequences.Count > 0 && !exhausted);
    }

    /// <summary>
    /// Runs one node the run has reached, or hands its last run on from the cache, and answers the required input it lacks, or null.
    /// </summary>
    /// <remarks>
    /// Everything here may call the node's own code — a setter, a getter, <see cref="IGraphNodeSequence.HasMore"/> — so all of it
    /// stands under the caller's catch: a getter that throws fails the node as its execution would, rather than the run.
    /// </remarks>
    private async ValueTask<UIPhrase?> RunNodeAsync(UINodeInstance node, List<UINodeConnection>? edges, IReadOnlyDictionary<string, IReadOnlyList<UIChoice>>? pinChoices, UINodeRunContext context, Dictionary<string, IReadOnlyDictionary<string, object?>> outputs, Dictionary<string, IReadOnlyDictionary<string, object?>> state, List<bool> sequences, CancellationToken cancellationToken)
    {
        UIPhrase? refusedChoice = null;
        HashSet<string>? fed = edges is null ? null : Feed(node, edges, outputs, pinChoices, out refusedChoice);

        if (refusedChoice is not null)
            return refusedChoice;

        // A value of the document's own held outside its pin's bounds, refused in words as a missing one is — unless an edge replaced
        // it, since the node reads the edge's.
        if (RefusedValue(node, fed) is { } refused)
            return refused;

        if (MissingRequired(node, edges) is { } missing)
            return missing;

        Dictionary<string, object?>? kept = ReadState(node);
        // Read before it runs: a node may write to its own inputs, a display pin above all.
        var inputs = kept is null && CanKeep(node) ? ReadInputs(node) : null;

        if (inputs is not null && Cache!.TryGet(node.Id, node.Type, inputs, out UINodeRunCache.Entry last))
        {
            outputs[node.Id] = last.Outputs;

            foreach ((var pinName, var value) in last.Displays)
                await ReportDisplayAsync(node.Id, pinName, value).ConfigureAwait(false);

            await ReportStatusAsync(node.Id, UINodeState.Cached, null, null).ConfigureAwait(false);
            return null;
        }

        await ReportStatusAsync(node.Id, UINodeState.Running, null, null).ConfigureAwait(false);
        await ExecuteAsync(node, context, cancellationToken).ConfigureAwait(false);
        await context.FlushAsync().ConfigureAwait(false);

        Dictionary<string, object?> produced = ReadOutputs(node);

        if (TooLong(node, produced) is { } tooLong)
            return tooLong;
        Dictionary<string, object?>? changed = kept is null ? null : ChangedState(node, kept);
        bool? more = node.Node is IGraphNodeSequence sequence ? sequence.HasMore : null;
        List<KeyValuePair<string, object?>> displays = await ReportDisplaysAsync(node).ConfigureAwait(false);

        // Only once nothing of the node's own code is left to throw, so a node that fails leaves nothing of itself behind.
        outputs[node.Id] = produced;

        if (changed is not null)
            state[node.Id] = changed;

        if (more is bool hasMore)
            sequences.Add(hasMore);

        if (inputs is not null)
            Cache!.Keep(node.Id, new UINodeRunCache.Entry(node.Type, inputs, produced, displays));

        // No progress with the last word: the line a running node draws goes when the node is done, rather than standing full.
        await ReportStatusAsync(node.Id, UINodeState.Done, null, null).ConfigureAwait(false);

        return null;
    }

    /// <summary>The failure of the first text output longer than <see cref="MaxTextLength"/>, or nothing.</summary>
    private UIPhrase? TooLong(UINodeInstance node, Dictionary<string, object?> produced)
    {
        foreach ((var pinName, var value) in produced)
        {
            if (value is string text && text.Length > MaxTextLength)
                return UIPhrase.Of(UIGraphWords.RunTooLong, ("pin", OutputTitle(node, pinName)));
        }

        return null;
    }

    /// <summary>An output's title as the catalogue gives it, or its name.</summary>
    private string OutputTitle(UINodeInstance node, string pinName)
    {
        if (_catalog.TryGetType(node.Type, out UINodeType type))
        {
            foreach (UINodePin pin in type.Outputs)
            {
                if (string.Equals(pin.Name, pinName, StringComparison.Ordinal))
                    return pin.Title;
            }
        }

        return pinName;
    }

    /// <summary>
    /// What the viewer reads of a node's exception: a deliberate failure's own words; any other's type alone, unless the runner shows
    /// detail — its message may name a server's path or host — with the whole of it in the server's log.
    /// </summary>
    private UIPhrase FailureOf(UINodeInstance node, Exception exception)
    {
        if (exception is UINodeFailureException)
            return UINodeRunContext.Said(exception.Message) ?? UIPhrase.Text(exception.GetType().Name);

        if (_logger is not null)
            Log.NodeFailed(_logger, exception, node.Type, node.Id);

        return (IncludeExceptionDetail ? UINodeRunContext.Said(exception.Message) : null) ?? UIPhrase.Text(exception.GetType().Name);
    }

    /// <summary>The network without the nodes a run passes over: no work to do, and no pin to feed or be read.</summary>
    private UINodeNetwork WithoutPassive(UINodeNetwork network)
    {
        List<UINodeInstance> nodes = [];
        HashSet<string> kept = [with(StringComparer.Ordinal)];

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

        return new UINodeNetwork([.. nodes], [.. connections]) { PinChoices = network.PinChoices };
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
        Dictionary<string, int> waitingFor = [with(StringComparer.Ordinal)];
        Dictionary<string, List<UINodeInstance>> feeds = [with(StringComparer.Ordinal)];

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
        HashSet<string> waiting = [with(StringComparer.Ordinal)];
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
        HashSet<string> seen = [with(StringComparer.Ordinal)];
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
    private ValueTask ReportStatusAsync(string nodeId, UINodeState state, double? progress, UIPhrase? message)
        => OnStatus is null ? ValueTask.CompletedTask : OnStatus(nodeId, state, progress, message);

    private ValueTask ReportRunAsync(int completed, int total)
        => OnRunProgress is null ? ValueTask.CompletedTask : OnRunProgress(completed, total);

    /// <summary>
    /// Puts what feeds a node's input pins onto its properties, coerced into the types the class declares, and answers the pins an edge
    /// replaced the node's own value of; a pin that takes several keeps its typed values beside the connected ones, so it is none of them.
    /// </summary>
    private HashSet<string> Feed(UINodeInstance node, List<UINodeConnection> edges, Dictionary<string, IReadOnlyDictionary<string, object?>> outputs, IReadOnlyDictionary<string, IReadOnlyList<UIChoice>>? pinChoices, out UIPhrase? refusedChoice)
    {
        refusedChoice = null;

        UINodeType? type = _catalog.TryGetType(node.Type, out UINodeType found) ? found : null;
        // A pin that takes several gathers them and is written once, in the edges' own order; every other takes the one edge.
        Dictionary<string, List<object?>> gathered = [with(StringComparer.Ordinal)];
        HashSet<string> replaced = [with(StringComparer.Ordinal)];

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
                if (!UINodeCatalog.WithinChoices(target.PropertyType, UINodeCatalog.AllowedChoices(pin, pinChoices), value))
                {
                    refusedChoice ??= UIPhrase.Of(UIGraphWords.RunOutOfBounds, ("pin", pin.Title));
                    _ = replaced.Add(edge.ToPin);
                    continue;
                }

                UINodeProperties.Set(target, node.Node, value);
                _ = replaced.Add(edge.ToPin);
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

            UINodePin? definition = FindInput(type, pin.Key);

            if (!UINodeCatalog.WithinChoices(target.PropertyType, UINodeCatalog.AllowedChoices(definition, pinChoices), pin.Value))
            {
                if (definition is not null)
                    refusedChoice ??= UIPhrase.Of(UIGraphWords.RunOutOfBounds, ("pin", definition.Title));

                continue;
            }

            // Connected values first, then any typed on the node itself — a Multiple pin's typed row is one more element, not a replacement.
            if (target.CanRead && target.GetValue(node.Node) is IEnumerable typed and not string)
            {
                foreach (var value in typed)
                    pin.Value.Add(value);
            }

            UINodeProperties.Set(target, node.Node, UINodeProperties.Collect(target.PropertyType, pin.Value));
        }

        return replaced;
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

    /// <summary>The refusal of the first of the document's values held outside its input's bounds that no edge replaced, or nothing.</summary>
    private static UIPhrase? RefusedValue(UINodeInstance node, HashSet<string>? fed)
    {
        foreach (KeyValuePair<string, UIPhrase> refused in node.RefusedInputs)
        {
            if (fed is null || !fed.Contains(refused.Key))
                return refused.Value;
        }

        return null;
    }

    /// <summary>The failure of the first required input the node was handed nothing for, or nothing when it has all of them.</summary>
    private UIPhrase? MissingRequired(UINodeInstance node, List<UINodeConnection>? edges)
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
                return UIPhrase.Of(UIGraphWords.RunRequired, ("pin", pin.Title));
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

    private async ValueTask FailAsync(UINodeInstance node, UIPhrase message, HashSet<string> stopped, List<UINodeFailure> failures)
    {
        _ = stopped.Add(node.Id);
        failures.Add(new UINodeFailure(node.Id, message));

        await ReportStatusAsync(node.Id, UINodeState.Error, null, message).ConfigureAwait(false);

        // The node itself only turns red; why it did is a line of the log, which has room for the whole of it.
        if (OnLog is not null)
            await OnLog(node.Id, UINodeLogLevel.Error, message).ConfigureAwait(false);
    }

    /// <summary>A node's state values as the run hands them to it, to tell afterwards which it changed; null for a node with none.</summary>
    /// <remarks>A collection is kept as the items it held: a node may change it in place, leaving the same reference behind.</remarks>
    private Dictionary<string, object?>? ReadState(UINodeInstance node)
    {
        if (!_catalog.TryGetType(node.Type, out UINodeType type))
            return null;

        Dictionary<string, object?>? kept = null;

        foreach (UINodePin pin in type.Inputs)
        {
            if (!pin.State || UINodeProperties.Find(node.Node.GetType(), pin.Name) is not { CanRead: true } property)
                continue;

            kept ??= [with(StringComparer.Ordinal)];
            kept[pin.Name] = Held(property.GetValue(node.Node));
        }

        return kept;
    }

    /// <summary>A collection's items as they stand now, for the same reference changed in place to compare unequal; any other value as it is.</summary>
    private static object? Held(object? value)
    {
        if (value is not IEnumerable collection || value is string)
            return value;

        List<object?> items = [];

        foreach (var item in collection)
            items.Add(item);

        return items;
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

    /// <summary>Forgets the last runs of a failed node and of every node above it, so the next run makes all of it afresh.</summary>
    /// <remarks>
    /// The failure may come from what a kept run handed on — a picture its store has let go since — which handing on again would
    /// repeat.
    /// </remarks>
    private void ForgetAbove(UINodeInstance node, Dictionary<string, List<UINodeConnection>> incoming)
    {
        if (Cache is null)
            return;

        HashSet<string> seen = [with(StringComparer.Ordinal), node.Id];
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
        Dictionary<string, object?> values = [with(StringComparer.Ordinal)];

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

            if (UINodeRunCache.SameValue(before, after))
                continue;

            changed ??= [with(StringComparer.Ordinal)];
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

    private static partial class Log
    {
        [LoggerMessage(Level = LogLevel.Warning, Message = "A node of the kind {Kind} ({NodeId}) failed unforeseen; the viewer reads only the exception's type.")]
        public static partial void NodeFailed(ILogger logger, Exception exception, string kind, string nodeId);
    }
}

/// <summary>
/// One node that did not run, and why: the runner's word, or the text the node's exception said.
/// </summary>
public sealed record UINodeFailure(string NodeId, UIPhrase Error);

/// <summary>
/// What a run came to: every node's outputs, and the nodes that failed along with the ones their failure took with them.
/// </summary>
public sealed class UINodeRunResult
{
    private UINodeRunResult(IReadOnlyDictionary<string, IReadOnlyDictionary<string, object?>> outputs, IReadOnlyList<UINodeFailure> failures, IReadOnlyList<string> skipped, IReadOnlyDictionary<string, IReadOnlyDictionary<string, object?>> state, bool hasMore, UIPhrase? refusal = null)
    {
        Refusal = refusal;
        Outputs = outputs;
        Failures = failures;
        Skipped = skipped;
        State = state;
        HasMore = hasMore;
    }

    /// <summary>
    /// Gets whether every node ran.
    /// </summary>
    public bool Success => Failures.Count == 0 && Refusal is null;

    /// <summary>
    /// Gets why the run was refused whole before any node ran — a document past the runner's <see cref="UINodeRunner.MaxNodes"/> —
    /// or nothing.
    /// </summary>
    public UIPhrase? Refusal { get; }

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
    /// Gets what went wrong on <see cref="FailedNodeId"/>, or why the run was refused (<see cref="Refusal"/>).
    /// </summary>
    public UIPhrase? Error => Failures.Count == 0 ? Refusal : Failures[0].Error;

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

    internal static UINodeRunResult Refused(UIPhrase refusal)
        => new(new Dictionary<string, IReadOnlyDictionary<string, object?>>(StringComparer.Ordinal), [], [], new Dictionary<string, IReadOnlyDictionary<string, object?>>(StringComparer.Ordinal), hasMore: false, refusal);

    internal static UINodeRunResult Stopped(IReadOnlyDictionary<string, IReadOnlyDictionary<string, object?>> outputs, IReadOnlyList<UINodeFailure> failures, IReadOnlyList<string> skipped, IReadOnlyDictionary<string, IReadOnlyDictionary<string, object?>> state, bool hasMore)
        => new(outputs, failures, skipped, state, hasMore);
}

/// <summary>
/// What <see cref="UINodeRunner.RunAllAsync"/> came to: the document as the last run left it, how many runs there were, and the
/// last one's result.
/// </summary>
public sealed record UINodeRunAllResult(UINodeDocument Document, int Runs, UINodeRunResult Last);
