using System.Collections.Generic;
using NE.Standard.UI.Abstractions.Interaction;

namespace NE.Standard.UI.Graph;

/// <summary>
/// Argument keys for the canvas's own events, read by a command by position — the canvas has no item template to name them
/// otherwise.
/// </summary>
public static class UIGraphArguments
{
    /// <summary>What a save sent by <see cref="IGraphCanvasComponent.AutoSave"/> is for, as <see cref="Reason"/> reads it.</summary>
    public const string AutoSaveReason = "auto";

    /// <summary>What a save the run panel's Run makes is for: <see cref="UINodeRuns"/> runs the sheet once after it.</summary>
    public const string RunReason = "graph.run";

    /// <summary>What a save the run panel's Run all makes is for: <see cref="UINodeRuns"/> runs the sheet until its sequences run out.</summary>
    public const string RunAllReason = "graph.run-all";

    /// <summary>The node the event belongs to, by its id in the document.</summary>
    public static KeyValuePair<string, UIActionArgument> Node(string name)
        => UIAction.ArgEventKey(name, 0);

    /// <summary>What a save was for: empty for Ctrl+S and the menu, <see cref="AutoSaveReason"/> for an edit saved as it was made, and whatever a <see cref="SaveDocumentEffect"/> asked under.</summary>
    public static KeyValuePair<string, UIActionArgument> Reason(string name)
        => UIAction.ArgEventKey(name, 0);

    /// <summary>The entry of the application's own that was clicked, by its id: the first key of <see cref="GraphEvents.MenuEntry"/>.</summary>
    public static KeyValuePair<string, UIActionArgument> Entry(string name)
        => UIAction.ArgEventKey(name, 0);

    /// <summary>What the menu was opened on, as one of <see cref="UIGraphMenuTargets"/>: the second key of <see cref="GraphEvents.MenuEntry"/>.</summary>
    public static KeyValuePair<string, UIActionArgument> TargetKind(string name)
        => UIAction.ArgEventKey(name, 1);

    /// <summary>The id of what the menu was opened on, empty for the sheet as a whole: the third key of <see cref="GraphEvents.MenuEntry"/>.</summary>
    public static KeyValuePair<string, UIActionArgument> Target(string name)
        => UIAction.ArgEventKey(name, 2);

    /// <summary>The pin the event belongs to, by its name — the property's name on the node's class.</summary>
    public static KeyValuePair<string, UIActionArgument> Pin(string name)
        => UIAction.ArgEventKey(name, 1);

    /// <summary>The upload the file landed in, read back with <c>IUIUploadService.GetSelectionAsync</c>.</summary>
    public static KeyValuePair<string, UIActionArgument> Selection(string name)
        => UIAction.ArgEventKey(name, 2);

    /// <summary>The name the file was chosen under.</summary>
    public static KeyValuePair<string, UIActionArgument> FileName(string name)
        => UIAction.ArgEventKey(name, 3);
}
