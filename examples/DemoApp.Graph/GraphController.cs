using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using NE.Standard.UI.Abstractions.Effects;
using NE.Standard.UI.Controllers;
using NE.Standard.UI.Graph;
using NE.Standard.UI.Primitives.Annotations;
using NE.Standard.UI.Shell.Commands;
using NE.Standard.UI.Shell.Files;

namespace DemoApp.Graph;

/// <summary>
/// A calculator built out of nodes: the canvas holds the sheet, Ctrl+S commits it, and Run works the network out on the server
/// through the same classes the canvas drew.
/// </summary>
internal sealed partial class GraphController : UIControllerBase
{
    /// <summary>The kinds the canvas offers and the runner reads a saved sheet back through — one catalogue, both halves.</summary>
    public static UINodeCatalog Catalog { get; } = UINodeCatalog.FromTypes(
        typeof(NumberNode),
        typeof(OperationNode),
        typeof(RoundNode),
        typeof(SumNode),
        typeof(ResultNode),
        typeof(LoadImageNode),
        typeof(ShowImageNode),
        typeof(PictureSizeNode),
        typeof(ResizePictureNode),
        typeof(PauseNode),
        typeof(DisplayNode),
        typeof(NameNode),
        typeof(EventNode),
        typeof(ReminderNode));

    public const string CanvasId = "calculator";

    /// <summary>The form the canvas's sheet is held in until it is saved.</summary>
    public const string CanvasForm = "sheet";

    /// <summary>What a save asked for by <see cref="Run"/> names itself, so the save handler knows to run the sheet after it.</summary>
    public const string RunReason = "run";

    [RecursiveMember]
    public partial UINodeDocument Sheet { get; set; } = StartingSheet();

    [RecursiveMember]
    public partial string Status { get; set; } = "Drag from a pin to wire two nodes, double-click the background to add one, Ctrl+S to save. Choose a picture on the Load image node and press Run.";

    [RecursiveMember]
    public partial string Answer { get; set; } = string.Empty;

    [RecursiveMember]
    public partial UIGraphEdgeShape EdgeShape { get; set; } = UIGraphEdgeShape.Orthogonal;

    [RecursiveMember]
    public partial bool SnapToGrid { get; set; } = true;

    [RecursiveMember]
    public partial bool ReadOnly { get; set; }

    /// <summary>
    /// Ctrl+S, the menu's Save, or a save this controller asked for: the whole document has already landed on <see cref="Sheet"/>
    /// by the time this runs, and <paramref name="reason"/> says who asked — which is how Run gets the sheet the viewer is
    /// looking at rather than the one last committed.
    /// </summary>
    [UICommand]
    public async Task<UICommandResult> SaveAsync(string reason, CancellationToken cancellationToken)
    {
        Status = $"Saved {Sheet.Nodes.Length} nodes and {Sheet.Edges.Length} connections at {DateTime.Now.ToString("HH:mm:ss", CultureInfo.InvariantCulture)}.";

        return string.Equals(reason, RunReason, StringComparison.Ordinal)
            ? await RunSheetAsync(cancellationToken).ConfigureAwait(false)
            : UICommandResult.Ok();
    }

    /// <summary>
    /// One of the page's own menu entries was clicked: Run in the corner menu, Describe in a node's — which hears the node it was
    /// opened on. The canvas's own entries never come here.
    /// </summary>
    [UICommand]
    public UICommandResult MenuEntry(string key, string target)
    {
        if (string.Equals(key, NodesView.RunEntryKey, StringComparison.Ordinal))
            return Run();

        if (string.Equals(key, NodesView.DescribeEntryKey, StringComparison.Ordinal))
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
                Status = $"{candidate.Title ?? candidate.Type} at {candidate.X:0}, {candidate.Y:0}.";
        }
    }

    /// <summary>
    /// A picture chosen on a node has reached the server. Where it is kept is this application's own business — here, a store
    /// in memory served through the framework's content endpoint — and the pin shows nothing until this answers with an address.
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
            Status = "That upload carried no single picture.";
            return UICommandResult.Ok();
        }

        UIUploadedFile opened = await Context.Uploads.OpenAsync(Context.Handle, file.FileId, cancellationToken: cancellationToken).ConfigureAwait(false);

        await using (opened.ConfigureAwait(false))
        {
            using MemoryStream bytes = new();

            await opened.Content.CopyToAsync(bytes, cancellationToken).ConfigureAwait(false);

            var address = Context.Services.GetRequiredService<PictureStore>()
                .Add(bytes.ToArray(), file.ContentType ?? "application/octet-stream", file.FileName ?? fileName);

            // The address reaches the node, not the sheet: the document is the viewer's until a save. Run commits it first,
            // so nothing has to be saved by hand before the picture can be used.
            Status = $"Kept {file.FileName ?? fileName} ({bytes.Length / 1024} KB). Press Run.";

            // One pin's value, not the whole document: a patch of the value would take the viewer's unsaved work with it.
            return UICommandResult.Ok([new SetNodeValueEffect(CanvasId, node, pin, address)]);
        }
    }

    /// <summary>
    /// Run: the sheet is committed first and the work happens in <see cref="SaveAsync"/>, since the document belongs to the
    /// viewer until they save it and running the one the server happens to hold would run yesterday's sheet.
    /// </summary>
    [UICommand]
    public UICommandResult Run()
    {
        Status = "Committing the sheet, then running it…";

        return UICommandResult.Ok([new SaveDocumentEffect(CanvasId, RunReason)]);
    }

    /// <summary>
    /// Runs the sheet: the document becomes instances of the node classes, the runner walks them in order, and every node's
    /// state goes back to the canvas through the addressed status channel — as it happens, not when the command answers.
    /// </summary>
    private async Task<UICommandResult> RunSheetAsync(CancellationToken cancellationToken)
    {
        UINodeRunner runner = new(Catalog, Context.Services)
        {
            // Pushed one at a time: effects otherwise travel only as a command's answer, and a run nobody can watch is no better
            // than a spinner. A node that waits (Pause) reports its own progress through the same channel.
            OnStatus = (nodeId, state, progress, message)
                => PushAsync(new SetNodeStatusEffect(CanvasId, nodeId, state) { Progress = progress, Message = message }, cancellationToken),
            // What every display pin came to hold; nothing of it is saved, so it never touches the sheet.
            OnDisplay = (nodeId, pinName, value) => PushAsync(new SetNodeDisplayEffect(CanvasId, nodeId, pinName, value), cancellationToken),
            // The log: what the nodes wrote and every failure, each line naming its node — the canvas turns a node red and no more.
            OnLog = (nodeId, level, message) => PushAsync(new AddNodeLogEffect(CanvasId, nodeId, level, message), cancellationToken),
            // The line along the canvas's top: none through begins the run and clears the last run's log, all through ends it.
            OnRunProgress = (completed, total) => PushAsync(new SetRunProgressEffect(CanvasId, completed, total), cancellationToken)
        };

        UINodeRunResult result = await runner.RunAsync(Sheet, cancellationToken).ConfigureAwait(false);
        List<string> lines = [];

        foreach (UINode node in Sheet.Nodes)
        {
            if (string.Equals(node.Type, nameof(ResultNode), StringComparison.Ordinal) && result.TryGetOutput(node.Id, nameof(ResultNode.Text), out var text) && text is string line)
                lines.Add(line);
        }

        // Answers even when something failed: a node that falls takes its own branch with it, and every other chain still ran.
        Answer = lines.Count == 0 ? "Add a Result node to see an answer." : string.Join("   •   ", lines);
        Status = Describe(result);

        return UICommandResult.Ok();
    }

    /// <summary>What the run came to, in a line: how much ran, or which node stopped and how much it took with it.</summary>
    private string Describe(UINodeRunResult result)
    {
        if (result.Success)
            return $"Ran {result.Outputs.Count} nodes.";

        UINodeFailure first = result.Failures[0];
        var skipped = result.Skipped.Count == 0 ? string.Empty : $" {result.Skipped.Count} below it were skipped.";

        return $"{NameOf(first.NodeId)}: {first.Error}{skipped} Ran {result.Outputs.Count} of {Sheet.Nodes.Length} nodes.";
    }

    /// <summary>What the viewer calls a node: its own title, else the kind's, as the catalogue titles it.</summary>
    private string NameOf(string nodeId)
    {
        foreach (UINode node in Sheet.Nodes)
        {
            if (!string.Equals(node.Id, nodeId, StringComparison.Ordinal))
                continue;

            return node.Title ?? (Catalog.TryGetType(node.Type, out UINodeType type) ? type.Title : node.Type);
        }

        return nodeId;
    }

    /// <summary>One effect on its way to the canvas now, outside the answer this command has not given yet.</summary>
    private ValueTask PushAsync(ClientEffect effect, CancellationToken cancellationToken)
        => new(Context.SendEffectsAsync([effect], cancellationToken));

    /// <summary>Puts the sheet back to the one the page opened with.</summary>
    [UICommand]
    public UICommandResult Reset()
    {
        Sheet = StartingSheet();
        Answer = string.Empty;
        Status = "The sheet is back to the one the page opened with.";

        // The canvas holds a viewer's unsaved work against a push of its value, so a sheet the application puts back says so itself.
        return UICommandResult.Ok([new DiscardFormEffect(CanvasForm)]);
    }

    /// <summary>
    /// Three sheets on one canvas: the calculator above — two numbers into an operation, rounded, written out — and below it the
    /// picture chain, which is the same wiring over something that is not a number. Choose a picture on the Load image node and
    /// run: its own size comes back off the file, the maths halves the width, the Pause node holds the run long enough to watch
    /// it report, and the display shows the picture at the new size.
    /// Under both, a planned event: every kind of field a node draws, two names wired into its guest list ahead of the one typed
    /// there, and a reminder read off the moment it starts.
    /// </summary>
    private static UINodeDocument StartingSheet()
    {
        UINode left = new("n-left", nameof(NumberNode), 40, 40, values: new Dictionary<string, object?>(StringComparer.Ordinal) { ["Value"] = 12 });
        UINode right = new("n-right", nameof(NumberNode), 40, 200, values: new Dictionary<string, object?>(StringComparer.Ordinal) { ["Value"] = 7 });
        UINode operation = new("n-op", nameof(OperationNode), 320, 90, values: new Dictionary<string, object?>(StringComparer.Ordinal) { ["Operation"] = "Multiply" });
        UINode round = new("n-round", nameof(RoundNode), 620, 110, values: new Dictionary<string, object?>(StringComparer.Ordinal) { ["Digits"] = 2 });
        UINode answer = new("n-answer", nameof(ResultNode), 880, 120, values: new Dictionary<string, object?>(StringComparer.Ordinal) { ["Label"] = "Area" });
        // One input fed by a wire and one left to its typed value: the empty pin wears the optional dot beside the solid one.
        UINode offset = new("n-offset", nameof(OperationNode), 880, 250, values: new Dictionary<string, object?>(StringComparer.Ordinal) { ["Operation"] = "Add", ["Right"] = 1 });
        UINode offsetAnswer = new("n-offset-answer", nameof(ResultNode), 1140, 260, values: new Dictionary<string, object?>(StringComparer.Ordinal) { ["Label"] = "Plus one" });
        UINode total = new("n-total", nameof(SumNode), 320, 260);
        UINode totalAnswer = new("n-total-answer", nameof(ResultNode), 620, 280, values: new Dictionary<string, object?>(StringComparer.Ordinal) { ["Label"] = "Total" });

        UINode picture = new("p-load", nameof(LoadImageNode), 40, 420);
        UINode size = new("p-size", nameof(PictureSizeNode), 360, 420);
        UINode half = new("p-half", nameof(NumberNode), 360, 560, values: new Dictionary<string, object?>(StringComparer.Ordinal) { ["Value"] = 0.5 });
        UINode scale = new("p-scale", nameof(OperationNode), 620, 430, values: new Dictionary<string, object?>(StringComparer.Ordinal) { ["Operation"] = "Multiply" });
        UINode resize = new("p-resize", nameof(ResizePictureNode), 900, 420);
        Dictionary<string, object?> pauseValues = new(StringComparer.Ordinal) { ["Seconds"] = 1.5 };
        UINode pause = new("p-pause", nameof(PauseNode), 1180, 420, values: pauseValues);
        UINode display = new("p-display", nameof(DisplayNode), 1440, 420);

        UINode ann = new("e-ann", nameof(NameNode), 40, 760, values: new Dictionary<string, object?>(StringComparer.Ordinal) { ["Value"] = "Ann" });
        UINode boris = new("e-boris", nameof(NameNode), 40, 880, values: new Dictionary<string, object?>(StringComparer.Ordinal) { ["Value"] = "Boris" });
        UINode meeting = new("e-event", nameof(EventNode), 320, 740, values: new Dictionary<string, object?>(StringComparer.Ordinal)
        {
            ["Name"] = "Release review",
            ["Day"] = "2026-09-21",
            ["Time"] = "14:30:00",
            ["AllDay"] = false,
            ["Length"] = 60,
            ["Priority"] = nameof(EventPriority.High),
            ["Guests"] = new List<object?> { "Chen" },
            ["Notes"] = "Walk through the open issues first."
        });
        UINode reminder = new("e-reminder", nameof(ReminderNode), 700, 740, values: new Dictionary<string, object?>(StringComparer.Ordinal) { ["Before"] = 15 });
        UINode summary = new("e-summary", nameof(DisplayNode), 700, 900);
        UINode reminderText = new("e-reminder-text", nameof(DisplayNode), 980, 740);

        return new UINodeDocument(
            [left, right, operation, round, answer, offset, offsetAnswer, total, totalAnswer, picture, size, half, scale, resize, pause, display, ann, boris, meeting, reminder, summary, reminderText],
            [
                new UINodeEdge("e-1", left.Id, nameof(NumberNode.Result), operation.Id, nameof(OperationNode.Left)),
                new UINodeEdge("e-2", right.Id, nameof(NumberNode.Result), operation.Id, nameof(OperationNode.Right)),
                new UINodeEdge("e-3", operation.Id, nameof(OperationNode.Result), round.Id, nameof(RoundNode.Value)),
                new UINodeEdge("e-4", round.Id, nameof(RoundNode.Result), answer.Id, nameof(ResultNode.Value)),
                new UINodeEdge("e-4d", round.Id, nameof(RoundNode.Result), offset.Id, nameof(OperationNode.Left)),
                new UINodeEdge("e-4e", offset.Id, nameof(OperationNode.Result), offsetAnswer.Id, nameof(ResultNode.Value)),

                // Both numbers into the one pin that takes several: the Sum node is fed by two connections, not by a value typed in.
                new UINodeEdge("e-4a", left.Id, nameof(NumberNode.Result), total.Id, nameof(SumNode.Values)),
                new UINodeEdge("e-4b", right.Id, nameof(NumberNode.Result), total.Id, nameof(SumNode.Values)),
                new UINodeEdge("e-4c", total.Id, nameof(SumNode.Result), totalAnswer.Id, nameof(ResultNode.Value)),

                new UINodeEdge("e-5", picture.Id, nameof(LoadImageNode.Image), size.Id, nameof(PictureSizeNode.Picture)),
                new UINodeEdge("e-6", picture.Id, nameof(LoadImageNode.Image), resize.Id, nameof(ResizePictureNode.Picture)),
                new UINodeEdge("e-7", size.Id, nameof(PictureSizeNode.Width), scale.Id, nameof(OperationNode.Left)),
                new UINodeEdge("e-8", half.Id, nameof(NumberNode.Result), scale.Id, nameof(OperationNode.Right)),
                new UINodeEdge("e-9", scale.Id, nameof(OperationNode.Result), resize.Id, nameof(ResizePictureNode.Width)),
                new UINodeEdge("e-10", size.Id, nameof(PictureSizeNode.Height), resize.Id, nameof(ResizePictureNode.Height)),
                new UINodeEdge("e-11", resize.Id, nameof(ResizePictureNode.Result), pause.Id, nameof(PauseNode.Value)),
                new UINodeEdge("e-12", pause.Id, nameof(PauseNode.Result), display.Id, nameof(DisplayNode.Value)),

                // The guests wired in come first, then the one typed on the event.
                new UINodeEdge("e-13", ann.Id, nameof(NameNode.Result), meeting.Id, nameof(EventNode.Guests)),
                new UINodeEdge("e-14", boris.Id, nameof(NameNode.Result), meeting.Id, nameof(EventNode.Guests)),
                new UINodeEdge("e-15", meeting.Id, nameof(EventNode.Moment), reminder.Id, nameof(ReminderNode.At)),
                new UINodeEdge("e-16", meeting.Id, nameof(EventNode.Summary), summary.Id, nameof(DisplayNode.Value)),
                new UINodeEdge("e-17", reminder.Id, nameof(ReminderNode.Text), reminderText.Id, nameof(DisplayNode.Value))
            ]);
    }
}
