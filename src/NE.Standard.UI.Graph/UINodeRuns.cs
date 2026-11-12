using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using NE.Standard.UI.Abstractions.Effects;
using NE.Standard.UI.Abstractions.Items;

namespace NE.Standard.UI.Graph;

/// <summary>Runs a node canvas's sheet from a controller: the run panel's Run, Run all and Stop.</summary>
/// <example>
/// <code>
/// private readonly UINodeRuns _runs;
///
/// public MyController()
/// {
///     _runs = new(CanvasId, Catalog, () =&gt; Sheet, sheet =&gt; Sheet = sheet) { ShowRunPanel = true };
/// }
///
/// [UICommand(ConcurrencyMode = UICommandConcurrencyMode.Background, MaxConcurrent = 4)]
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
/// the server while a run of all goes on. Running beside the tab, it writes the sheet only through the runtime's own turn. It allows
/// more than one run at a time, since an edit saved while a run of all goes on is a second run of the same command.
/// </example>
public sealed class UINodeRuns
{
    /// <summary>The longest one asked-for run lasts unless the application says otherwise: ten minutes.</summary>
    public static readonly TimeSpan DefaultMaxRunTime = TimeSpan.FromMinutes(10);

    private readonly string _canvasId;
    private readonly UINodeCatalog _catalog;
    private readonly Func<UINodeDocument> _sheet;
    private readonly Action<UINodeDocument> _keep;
    private readonly Lock _sync = new();

    // The run under way, for Stop to end; a save command in the background runs it, so Stop comes in beside it. Taken and let go
    // under the lock, so a Stop never meets one already disposed.
    private CancellationTokenSource? _running;

    /// <summary>
    /// Runs the sheet the controller holds for <paramref name="canvasId"/>, read through <paramref name="sheet"/> and its nodes'
    /// state written back through <paramref name="keep"/>.
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
    /// Gets or sets whether the canvas carries its run panel, as the view's <c>SetShowRunPanel</c> says; while it does not, a save
    /// under a run's reason runs nothing.
    /// </summary>
    /// <remarks>
    /// The reason is the browser's to send, so the server holds the panel's rule: a controller whose panel is bound sets this as it
    /// sets the bound value.
    /// </remarks>
    public bool ShowRunPanel { get; set; }

    /// <summary>Gets the most nodes a sheet may hold to be run (<see cref="UINodeRunner.MaxNodes"/>).</summary>
    public int MaxNodes { get; init; } = UINodeRunner.DefaultMaxNodes;

    /// <summary>Gets the most characters a node's text output may hold (<see cref="UINodeRunner.MaxTextLength"/>).</summary>
    public int MaxTextLength { get; init; } = UINodeRunner.DefaultMaxTextLength;

    /// <summary>Gets or sets the runtime choices for <see cref="GraphInputAttribute.ChoicesKey"/> inputs (<see cref="UINodeRunner.PinChoices"/>).</summary>
    public IReadOnlyDictionary<string, IReadOnlyList<UIChoice>>? PinChoices { get; set; }

    /// <summary>
    /// Gets the longest one asked-for run lasts — a run of all as a whole; past it, the run ends as a Stop ends it, and the outcome
    /// says it ran out of time.
    /// </summary>
    public TimeSpan MaxRunTime { get; init; } = DefaultMaxRunTime;

    /// <summary>
    /// Gets whether the viewer reads an unforeseen exception's own message (<see cref="UINodeRunner.IncludeExceptionDetail"/>): the
    /// application's <c>IncludeExceptionDetail</c>, handed on.
    /// </summary>
    public bool IncludeExceptionDetail { get; init; }

    /// <summary>
    /// Gets what the sheet's nodes last came to, so a node run again on the inputs it last ran on is handed on rather than run.
    /// </summary>
    /// <remarks><see cref="UINodeRunCache.Clear"/> makes the next run run every node.</remarks>
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
    /// Runs the sheet for a save made with <see cref="UIGraphArguments.RunReason"/> once, and with
    /// <see cref="UIGraphArguments.RunAllReason"/> until its sequences run out; any other save answers null.
    /// </summary>
    /// <remarks>
    /// So does a run asked for while one is under way, or while the canvas carries no run panel (<see cref="ShowRunPanel"/>). What
    /// the run says goes to the canvas through <paramref name="send"/> as it
    /// happens (a controller's <c>Context.SendEffectsAsync</c>). The state the runs leave is written onto the sheet inside
    /// <paramref name="invoke"/> (a controller's <c>Context.Runtime.InvokeAsync</c>), so a save the viewer makes meanwhile is
    /// neither lost nor half read.
    /// </remarks>
    public async Task<UINodeRunOutcome?> SavedAsync(Func<IReadOnlyList<ClientEffect>, CancellationToken, Task> send, Func<Action, CancellationToken, Task> invoke, IServiceProvider? services, string? reason, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(send);
        ArgumentNullException.ThrowIfNull(invoke);

        var all = string.Equals(reason, UIGraphArguments.RunAllReason, StringComparison.Ordinal);

        if ((!all && !string.Equals(reason, UIGraphArguments.RunReason, StringComparison.Ordinal)) || !ShowRunPanel)
            return null;

        using CancellationTokenSource budget = new(MaxRunTime);
        CancellationTokenSource running = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, budget.Token);

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
            IncludeExceptionDetail = IncludeExceptionDetail,
            MaxNodes = MaxNodes,
            MaxTextLength = MaxTextLength,
            PinChoices = PinChoices,
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
            // Onto the sheet as it stands, read and written in the runtime's turn, so nothing the viewer saved meanwhile is
            // overwritten; committed, since the server has it already, so the canvas takes it as saved rather than as an edit to undo.
            OnState = async (nodeId, pinName, value) =>
            {
                // As the canvas will hold it, so the sheet the controller keeps travels as surely as the effect does.
                SetNodeValueEffect effect = new(_canvasId, nodeId, pinName, value) { Committed = true };

                await invoke(() => _keep(_sheet().WithValue(nodeId, pinName, effect.Value)), cancellationToken).ConfigureAwait(false);
                await Push(effect).ConfigureAwait(false);
            }
        };

        try
        {
            await Push(new SetRunningEffect(_canvasId, running: true)).ConfigureAwait(false);

            UINodeRunOutcome outcome;

            if (!all)
            {
                outcome = new UINodeRunOutcome(await runner.RunAsync(sheet, running.Token).ConfigureAwait(false), 1, Stopped: false);
            }
            else
            {
                UINodeRunAllResult result = await runner.RunAllAsync(sheet, MaxRuns, running.Token).ConfigureAwait(false);

                outcome = new UINodeRunOutcome(result.Last, result.Runs, Stopped: false);
            }

            // Refused whole, the runner reported no progress at all: the canvas's run line would say nothing of why nothing ran.
            if (outcome.Last?.Refusal is { } refusal)
                await Push(new SetRunProgressEffect(_canvasId, 0, 0) { Refusal = refusal }).ConfigureAwait(false);

            return outcome;
        }
        catch (OperationCanceledException) when (running.IsCancellationRequested && !cancellationToken.IsCancellationRequested)
        {
            return new UINodeRunOutcome(null, runs, Stopped: true) { TimedOut = budget.IsCancellationRequested };
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
public sealed record UINodeRunOutcome(UINodeRunResult? Last, int Runs, bool Stopped)
{
    /// <summary>Gets whether the run was ended for lasting past <see cref="UINodeRuns.MaxRunTime"/> rather than by Stop.</summary>
    public bool TimedOut { get; init; }
}

