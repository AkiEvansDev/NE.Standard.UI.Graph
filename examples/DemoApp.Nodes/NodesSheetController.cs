using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;

namespace DemoApp.Nodes;

/// <summary>
/// A sheet of nodes, which every page of the demo is: the canvas holds it, Ctrl+S commits it, and Run works the network out on the
/// server through the same classes the canvas drew. A page brings its kinds — the common ones and one package's — and its sheet.
/// </summary>
internal abstract partial class NodesSheetController : UIControllerBase
{
    /// <summary>The form the canvas's sheet is held in until it is saved.</summary>
    public const string CanvasForm = "sheet";

    // The whole of a run, from the package: the canvas's run panel saves under a run's reason, and SaveAsync hands the save here.
    private readonly UINodeRuns _runs;
    private readonly UINodeCatalog _catalog;
    private readonly string _canvasId;
    private readonly Func<string, UINodeDocument> _startingSheet;

    // The page's own folder under the demo's out, so one viewer's thumbnails never overwrite another's, and what its file kinds
    // reach: that folder, and the demo's pictures to read.
    private readonly string _out = $"{DemoFolders.Out}/{Guid.NewGuid().ToString("N")[..8]}";
    private readonly UINodeFiles _files;

    /// <summary>
    /// A page's sheet: its canvas's id, its kinds, the sheet it opens with (handed the page's own folder to write into) and its first
    /// line. The id is the page's own, since the browser keeps a canvas's view under it: one shared by three sheets opened each at
    /// another's view.
    /// </summary>
    protected NodesSheetController(string canvasId, UINodeCatalog catalog, Func<string, UINodeDocument> startingSheet, UIPhrase status)
    {
        _canvasId = canvasId;
        _catalog = catalog;
        _startingSheet = startingSheet;
        _runs = new UINodeRuns(canvasId, catalog, () => Sheet, sheet => Sheet = sheet);
        _files = DemoFolders.For(_out);
        Sheet = startingSheet(_out);
        Status = status;
    }

    [RecursiveMember]
    public partial UINodeDocument Sheet { get; set; } = UINodeDocument.Empty;

    [RecursiveMember]
    public partial UIPhrase? Status { get; set; }

    [RecursiveMember]
    public partial UIPhrase? Answer { get; set; }

    [RecursiveMember]
    public partial UIGraphEdgeShape EdgeShape { get; set; } = UIGraphEdgeShape.Orthogonal;

    [RecursiveMember]
    public partial bool SnapToGrid { get; set; } = true;

    [RecursiveMember]
    public partial bool ReadOnly { get; set; }

    /// <summary>
    /// Ctrl+S, the menu's Save, or a save this controller asked for: the whole document has already landed on <see cref="Sheet"/>
    /// by the time this runs, and <paramref name="reason"/> says who asked — which is how Run gets the sheet the viewer is
    /// looking at rather than the one last committed. A background command: a run may go on for a while, and the tab sends Stop
    /// and every other command while it does — and the saves the viewer's edits make while a run goes on, so more than one at a time.
    /// </summary>
    [UICommand(ConcurrencyMode = UICommandConcurrencyMode.Background, MaxConcurrent = 4)]
    public async Task<UICommandResult> SaveAsync(string reason, CancellationToken cancellationToken)
    {
        Status = UIPhrase.Of("nodes.status.saved", ("time", DateTime.Now.ToString("HH:mm:ss", CultureInfo.InvariantCulture)), ("nodes", Sheet.Nodes.Length), ("edges", Sheet.Edges.Length));

        UINodeRunOutcome? outcome = await _runs.SavedAsync(Context.SendEffectsAsync, Context.Runtime.InvokeAsync, new PageServices(Context.Services, _files), reason, cancellationToken).ConfigureAwait(false);

        // In the runtime's turn: past its first wait the command runs beside the tab and its other commands.
        if (outcome is not null)
            _ = await Context.Runtime.InvokeAsync(() => Report(outcome), cancellationToken).ConfigureAwait(false);

        return UICommandResult.Ok();
    }

    /// <summary>The application's services as this page's runs reach them, the files being the page's own.</summary>
    private sealed class PageServices(IServiceProvider services, UINodeFiles files) : IServiceProvider
    {
        public object? GetService(Type serviceType)
            => serviceType == typeof(UINodeFiles) ? files : services.GetService(serviceType);
    }

    /// <summary>What a run came to, on the page's lines.</summary>
    private void Report(UINodeRunOutcome outcome)
    {
        if (outcome.Stopped)
        {
            Status = UIPhrase.Of("nodes.status.stopped", ("run", outcome.Runs));
        }
        else if (outcome.Last is { } last)
        {
            Answer = AnswerOf(last);
            Status = outcome.Runs > 1 ? UIPhrase.Of("nodes.status.runs", ("runs", outcome.Runs), ("line", Describe(last))) : Describe(last);
        }
    }

    /// <summary>The run panel's Stop: the run under way ends, cut short.</summary>
    [UICommand]
    public void Stop()
        => _runs.Stop();

    /// <summary>
    /// One of the page's own menu entries was clicked: Run in the corner menu — the panel's Run, asked for by the server — and
    /// Show node position in a node's, which hears the node it was opened on. The canvas's own entries never come here.
    /// </summary>
    [UICommand]
    public UICommandResult MenuEntry(string key, string target)
    {
        // Not while a run is under way: the canvas would queue the save behind the run's, and it would run again once Stop ended it.
        if (string.Equals(key, NodesSheetView.RunEntryKey, StringComparison.Ordinal))
            return _runs.IsRunning ? UICommandResult.Ok() : UICommandResult.Ok([new SaveDocumentEffect(_canvasId, UIGraphArguments.RunReason)]);

        if (string.Equals(key, NodesSheetView.PositionEntryKey, StringComparison.Ordinal))
            NodeClicked(target);

        return UICommandResult.Ok();
    }

    /// <summary>A click on a node, with the node's id as the key the event named.</summary>
    [UICommand]
    public void NodeClicked(string node)
    {
        foreach (UINode candidate in Sheet.Nodes)
        {
            if (string.Equals(candidate.Id, node, StringComparison.Ordinal))
                Status = UIPhrase.Of("nodes.status.position", ("node", NameOf(candidate)), ("x", candidate.X.ToString("0", CultureInfo.InvariantCulture)), ("y", candidate.Y.ToString("0", CultureInfo.InvariantCulture)));
        }
    }

    /// <summary>What the viewer calls a node: its own title, else the kind's, as the catalogue titles it — content, shown as written.</summary>
    private string NameOf(string nodeId)
    {
        foreach (UINode node in Sheet.Nodes)
        {
            if (string.Equals(node.Id, nodeId, StringComparison.Ordinal))
                return NameOf(node);
        }

        return nodeId;
    }

    private string NameOf(UINode node)
        => node.Title ?? (_catalog.TryGetType(node.Type, out UINodeType type) ? type.Title : node.Type);

    /// <summary>
    /// A picture chosen on a node has reached the server. Where it is kept is this application's own business — here, the picture
    /// package's store in memory, served through the framework's content endpoint, which the picture kinds read and write too —
    /// and the pin shows nothing until this answers with an address.
    /// </summary>
    [UICommand]
    public async Task<UICommandResult> ImageUploadedAsync(string node, string pin, string selection, string fileName, CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(node) || string.IsNullOrEmpty(pin) || string.IsNullOrEmpty(selection))
            return UICommandResult.Ok();

        UIUploadSelection chosen = await Context.Uploads.GetSelectionAsync(Context.Handle, selection, cancellationToken).ConfigureAwait(false);
        UIUploadFile? file = chosen.SingleFile;

        if (file is null)
        {
            _ = await Context.Runtime.InvokeAsync(() => Status = new UIPhrase("nodes.status.no-picture"), cancellationToken).ConfigureAwait(false);
            return UICommandResult.Ok();
        }

        UIUploadedFile opened = await Context.Uploads.OpenAsync(Context.Handle, file.FileId, cancellationToken: cancellationToken).ConfigureAwait(false);

        await using (opened.ConfigureAwait(false))
        {
            using MemoryStream bytes = new();

            await opened.Content.CopyToAsync(bytes, cancellationToken).ConfigureAwait(false);

            UINodeImageFile picture = new(bytes.ToArray(), file.ContentType ?? "application/octet-stream", file.FileName ?? fileName);
            var address = await Context.Services.GetRequiredService<IUINodeImageStore>().WriteAsync(picture, cancellationToken).ConfigureAwait(false);

            UIPhrase kept = UIPhrase.Of("nodes.status.kept", ("file", file.FileName ?? fileName), ("size", bytes.Length / 1024));

            // The address reaches the node, not the sheet: the document is the viewer's until a save. Run commits it first,
            // so nothing has to be saved by hand before the picture can be used.
            _ = await Context.Runtime.InvokeAsync(() => Status = kept, cancellationToken).ConfigureAwait(false);

            // One pin's value, not the whole document: a patch of the value would take the viewer's unsaved work with it.
            return UICommandResult.Ok([new SetNodeValueEffect(_canvasId, node, pin, address)]);
        }
    }

    /// <summary>What the page reads off a run beside the sheet; nothing, unless the page has an answer to give.</summary>
    protected virtual UIPhrase? AnswerOf(UINodeRunResult result)
        => null;

    /// <summary>What the run came to, in a line: how much ran, or which node stopped — in the runner's words — and what it took with it.</summary>
    private UIPhrase Describe(UINodeRunResult result)
    {
        if (result.Success)
            return UIPhrase.Of("nodes.status.ran", ("count", result.Outputs.Count));

        UINodeFailure first = result.Failures[0];
        var node = NameOf(first.NodeId);

        return result.Skipped.Count == 0
            ? UIPhrase.Of("nodes.status.failed", ("node", node), ("error", first.Error), ("ran", result.Outputs.Count), ("total", Sheet.Nodes.Length))
            : UIPhrase.Of("nodes.status.failed-skipped", ("node", node), ("error", first.Error), ("skipped", result.Skipped.Count), ("ran", result.Outputs.Count), ("total", Sheet.Nodes.Length));
    }

    /// <summary>Puts the sheet back to the one the page opened with.</summary>
    [UICommand]
    public UICommandResult Reset()
    {
        // A run under way would carry on over the sheet it began with, and what it last came to belongs to that sheet.
        _runs.Stop();
        _runs.Cache.Clear();

        Sheet = _startingSheet(_out);
        Answer = null;
        Status = new UIPhrase("nodes.status.reset");

        // The canvas holds a viewer's unsaved work against a push of its value, so a sheet the application puts back says so itself.
        return UICommandResult.Ok([new DiscardFormEffect(CanvasForm)]);
    }

    /// <summary>The page is gone: a run under way ends, and the page's own folder goes with it, so the temporary folder keeps no page's leftovers.</summary>
    protected override void OnDispose()
    {
        _runs.Stop();

        var folder = Path.Combine(DemoFolders.Root, _out);

        try
        {
            if (Directory.Exists(folder))
                Directory.Delete(folder, recursive: true);
        }
        catch (Exception exception) when (exception is IOException or UnauthorizedAccessException)
        {
            // A file still held — a run's last write — is left for the system's own cleaning of its temporary folder.
        }

        base.OnDispose();
    }

    /// <summary>A node's values as a starting sheet writes them.</summary>
    protected static Dictionary<string, object?> Values(params (string Name, object? Value)[] values)
    {
        ArgumentNullException.ThrowIfNull(values);

        Dictionary<string, object?> map = new(StringComparer.Ordinal);

        foreach ((var name, var value) in values)
            map[name] = value;

        return map;
    }
}
