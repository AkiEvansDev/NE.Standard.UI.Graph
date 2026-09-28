using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using NE.Standard.UI.Abstractions.Effects;

namespace NE.Standard.UI.Graph;

/// <summary>
/// The whole of running a node canvas's sheet from a controller. The run panel (<c>SetShowRunPanel(true)</c>) saves the sheet
/// with a run's reason; the controller's save command hands the save here, and the sheet is run once, or again and again until its
/// sequences run out — every node's state, display and log line and the run's progress pushed to the canvas as they happen, and
/// what the runs left of the nodes' state written back onto the sheet. The panel's Stop ends a run under way.
/// </summary>
/// <example>
/// <code>
/// private readonly UINodeRuns _runs;
///
/// public MyController()
/// {
///     _runs = new(CanvasId, Catalog, () =&gt; Sheet, sheet =&gt; Sheet = sheet);
/// }
///
/// [UICommand(ConcurrencyMode = UICommandConcurrencyMode.Background)]
/// public async Task&lt;UICommandResult&gt; SaveAsync(string reason, CancellationToken cancellationToken)
/// {
///     _ = await _runs.SavedAsync(Context.SendEffectsAsync, Context.Runtime.InvokeAsync, Context.Services, reason, cancellationToken);
///     return UICommandResult.Ok();
/// }
///
/// [UICommand]
/// public void Stop() =&gt; _runs.Stop();
/// </code>
/// The save command is a background one: an ordinary command holds the tab until it answers, and the panel's Stop could not reach
/// the server while a run of all goes on. Running beside the tab, it writes the sheet only through the runtime's own turn.
/// </example>
public sealed class UINodeRuns
{
    private readonly string _canvasId;
    private readonly UINodeCatalog _catalog;
    private readonly Func<UINodeDocument> _sheet;
    private readonly Action<UINodeDocument> _keep;
    private readonly Lock _sync = new();

    // The run under way, for Stop to end; a save command in the background runs it, so Stop comes in beside it. Taken and let go
    // under the lock, so a Stop never meets one already disposed.
    private CancellationTokenSource? _running;

    /// <summary>
    /// Runs the sheet the controller holds for the canvas named <paramref name="canvasId"/>, reading it through
    /// <paramref name="sheet"/> and writing what the runs left of its nodes' state through <paramref name="keep"/>.
    /// </summary>
    public UINodeRuns(string canvasId, UINodeCatalog catalog, Func<UINodeDocument> sheet, Action<UINodeDocument> keep)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(canvasId);
        ArgumentNullException.ThrowIfNull(catalog);
        ArgumentNullException.ThrowIfNull(sheet);
        ArgumentNullException.ThrowIfNull(keep);

        _canvasId = canvasId;
        _catalog = catalog;
        _sheet = sheet;
        _keep = keep;
    }

    /// <summary>
    /// Gets the most runs one run of all makes, for a sheet whose sequence starts over and so never runs out.
    /// </summary>
    public int MaxRuns { get; init; } = 500;

    /// <summary>
    /// Gets what the sheet's nodes last came to: a node run again on the inputs it last ran on is handed on from here rather than
    /// run. <see cref="UINodeRunCache.Clear"/> makes the next run run every node.
    /// </summary>
    public UINodeRunCache Cache { get; } = new();

    /// <summary>
    /// Gets whether a run is under way.
    /// </summary>
    public bool IsRunning
    {
        get
        {
            lock (_sync)
                return _running is not null;
        }
    }

    /// <summary>
    /// Handles a save of the canvas: one made with <see cref="UIGraphArguments.RunReason"/> runs the sheet once, one made with
    /// <see cref="UIGraphArguments.RunAllReason"/> runs it until its sequences run out, and any other answers null — a save and no
    /// more, as does a run asked for while one is under way. The sheet has landed on the controller's property by the time a save
    /// command runs, so it is the one the viewer sees. What the run says goes to the canvas through <paramref name="send"/> as it
    /// happens — a controller's <c>Context.SendEffectsAsync</c> — and its nodes reach <paramref name="services"/>. What the runs
    /// leave of the nodes' state is written onto the sheet inside <paramref name="invoke"/> — a controller's
    /// <c>Context.Runtime.InvokeAsync</c> — so a save the viewer makes meanwhile is neither lost to it nor half read.
    /// </summary>
    public async Task<UINodeRunOutcome?> SavedAsync(Func<IReadOnlyList<ClientEffect>, CancellationToken, Task> send, Func<Action, CancellationToken, Task> invoke, IServiceProvider? services, string? reason, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(send);
        ArgumentNullException.ThrowIfNull(invoke);

        var all = string.Equals(reason, UIGraphArguments.RunAllReason, StringComparison.Ordinal);

        if (!all && !string.Equals(reason, UIGraphArguments.RunReason, StringComparison.Ordinal))
            return null;

        CancellationTokenSource running = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);

        lock (_sync)
        {
            if (_running is not null)
            {
                running.Dispose();
                return null;
            }

            _running = running;
        }

        // Read before the first wait, as the save left it: afterwards a value the viewer sends may be landing on it.
        UINodeDocument sheet = _sheet();
        var first = true;
        var runs = 1;

        // The canvas's own channel for everything a run says: pushed as it happens, not gathered for the command's answer.
        ValueTask Push(ClientEffect effect)
        {
            return new(send([effect], cancellationToken));
        }

        UINodeRunner runner = new(_catalog, services)
        {
            Cache = Cache,
            OnStatus = (nodeId, state, progress, message) => Push(new SetNodeStatusEffect(_canvasId, nodeId, state) { Progress = progress, Message = message }),
            OnDisplay = (nodeId, pinName, value) => Push(new SetNodeDisplayEffect(_canvasId, nodeId, pinName, value)),
            OnLog = (nodeId, level, message) => Push(new AddNodeLogEffect(_canvasId, nodeId, level, message)),
            // None through begins a run and clears the log — but only the first of a run of all, so the log keeps every run's lines.
            OnRunProgress = (completed, total) => completed == 0 && !first ? ValueTask.CompletedTask : Push(new SetRunProgressEffect(_canvasId, completed, total)),
            OnRunStarting = before =>
            {
                first = before == 0;
                runs = before + 1;
                return ValueTask.CompletedTask;
            },
            // Onto the sheet as it stands now, not the one the run began with: what the viewer saved meanwhile stays. Read and written
            // in the runtime's turn, so a save landing at that moment is not overwritten by the sheet read before it. The server's
            // already, so the canvas takes it as saved rather than as an edit to undo.
            OnState = async (nodeId, pinName, value) =>
            {
                await invoke(() => _keep(_sheet().WithValue(nodeId, pinName, value)), cancellationToken).ConfigureAwait(false);
                await Push(new SetNodeValueEffect(_canvasId, nodeId, pinName, value) { Committed = true }).ConfigureAwait(false);
            }
        };

        try
        {
            await Push(new SetRunningEffect(_canvasId, running: true)).ConfigureAwait(false);

            if (!all)
                return new UINodeRunOutcome(await runner.RunAsync(sheet, running.Token).ConfigureAwait(false), 1, Stopped: false);

            UINodeRunAllResult result = await runner.RunAllAsync(sheet, MaxRuns, running.Token).ConfigureAwait(false);

            return new UINodeRunOutcome(result.Last, result.Runs, Stopped: false);
        }
        catch (OperationCanceledException) when (running.IsCancellationRequested && !cancellationToken.IsCancellationRequested)
        {
            return new UINodeRunOutcome(null, runs, Stopped: true);
        }
        finally
        {
            lock (_sync)
                _running = null;

            running.Dispose();
            await Push(new SetRunningEffect(_canvasId, running: false)).ConfigureAwait(false);
        }
    }

    /// <summary>
    /// Ends the run under way, the node running cut short; the runs through before it keep what they left of the nodes' state, and
    /// the run it ended leaves none.
    /// </summary>
    public void Stop()
    {
        lock (_sync)
            _running?.Cancel();
    }
}

/// <summary>
/// What a run the panel asked for came to: the last run's result (none if it was stopped part way), how many runs there were, and
/// whether Stop ended them.
/// </summary>
public sealed record UINodeRunOutcome(UINodeRunResult? Last, int Runs, bool Stopped);
