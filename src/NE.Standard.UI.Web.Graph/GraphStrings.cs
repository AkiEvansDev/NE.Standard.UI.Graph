using System;
using System.Collections.Frozen;
using System.Collections.Generic;
using NE.Standard.UI.Graph;
using NE.Standard.UI.Shell.Localization;

namespace NE.Standard.UI.Web.Graph;

/// <summary>
/// The words the canvas's own chrome writes (picker, zoom bar, node parts), with their English; translated like the framework's
/// <c>UIStrings</c>.
/// </summary>
public sealed class GraphStrings : IUIStringsSource
{
    public const string Canvas = "ui.graph.canvas";
    public const string AddNode = "ui.graph.add-node";
    public const string NoKinds = "ui.graph.no-kinds";
    public const string Categories = "ui.graph.categories";
    public const string AllKinds = "ui.graph.all-kinds";
    public const string Uncategorized = "ui.graph.uncategorized";
    public const string ZoomIn = "ui.graph.zoom-in";
    public const string ZoomOut = "ui.graph.zoom-out";
    public const string Fit = "ui.graph.fit";
    public const string Menu = "ui.graph.menu";
    public const string Minimap = "ui.graph.minimap";
    public const string Log = "ui.graph.log";
    public const string ClearLog = "ui.graph.clear-log";
    public const string LogEmpty = "ui.graph.log-empty";
    public const string RunProgress = "ui.graph.run-progress";
    public const string PinMany = "ui.graph.pin-many";
    public const string Collapse = "ui.graph.collapse";
    public const string Expand = "ui.graph.expand";
    public const string Pin = "ui.graph.pin";
    public const string Unpin = "ui.graph.unpin";
    public const string Group = "ui.graph.group";
    public const string NewNode = "ui.graph.new-node";
    public const string NewResource = "ui.graph.new-resource";
    public const string Recipe = "ui.graph.recipe";
    public const string Remove = UIGraphWords.Remove;
    public const string AddValue = UIGraphWords.AddValue;
    public const string NoValue = "ui.graph.no-value";
    public const string ChooseFile = UIGraphWords.ChooseFile;
    public const string UploadFailed = "ui.graph.upload-failed";
    public const string Unsaved = "ui.graph.unsaved";
    public const string Saving = "ui.graph.saving";
    public const string Plan = "ui.graph.plan";
    public const string PlanTargets = "ui.graph.plan-targets";
    public const string AddTarget = UIGraphWords.AddTarget;
    public const string SearchResources = UIGraphWords.SearchResources;
    public const string NoResources = "ui.graph.no-resources";
    public const string Target = UIGraphWords.Target;
    public const string Period = UIGraphWords.Period;
    public const string PeriodOnce = UIGraphWords.PeriodOnce;
    public const string PeriodMinute = UIGraphWords.PeriodMinute;
    public const string PeriodHour = UIGraphWords.PeriodHour;
    public const string Objective = UIGraphWords.Objective;
    public const string LeastRaw = UIGraphWords.LeastRaw;
    public const string LeastTime = UIGraphWords.LeastTime;
    public const string LeastCost = UIGraphWords.LeastCost;
    public const string PlanEmpty = "ui.graph.plan-empty";
    public const string PlanInfeasible = "ui.graph.plan-infeasible";
    public const string PlanTotals = "ui.graph.plan-totals";
    public const string PlanBroughtIn = "ui.graph.plan-brought-in";
    public const string PlanResources = "ui.graph.plan-resources";
    public const string PlanCrafts = "ui.graph.plan-crafts";
    public const string PlanResource = "ui.graph.plan-resource";
    public const string PlanAmount = "ui.graph.plan-amount";
    public const string PlanMade = "ui.graph.plan-made";
    public const string PlanTaken = "ui.graph.plan-taken";
    public const string PlanLeft = "ui.graph.plan-left";
    public const string PlanRuns = "ui.graph.plan-runs";
    public const string PlanTime = "ui.graph.plan-time";
    public const string PlanWorkers = "ui.graph.plan-workers";
    public const string PlanAtOnce = "ui.graph.plan-at-once";
    public const string PerMinute = "ui.graph.per-minute";
    public const string PerHour = "ui.graph.per-hour";

    /// <inheritdoc/>
    public IReadOnlyDictionary<string, string> English { get; } = new Dictionary<string, string>(StringComparer.Ordinal)
    {
        [Canvas] = "Node canvas",
        [AddNode] = "Add node",
        [NoKinds] = "No node kinds match",
        [Categories] = "Categories",
        [AllKinds] = "All",
        [Uncategorized] = "Other",
        [ZoomIn] = "Zoom in",
        [ZoomOut] = "Zoom out",
        [Fit] = "Fit to content",
        [Menu] = "Canvas menu",
        [Minimap] = "Map of the sheet",
        [Log] = "Log",
        [ClearLog] = "Clear the log",
        [LogEmpty] = "Nothing has been written yet",
        [RunProgress] = "Run progress",
        [PinMany] = "{type}, several",
        [Collapse] = "Fold",
        [Expand] = "Unfold",
        [Pin] = "Pin",
        [Unpin] = "Unpin",
        [Group] = "Group",
        [NewNode] = "New node",
        [NewResource] = "New resource",
        [Recipe] = "Recipe",
        [Remove] = "Remove",
        [AddValue] = "Add",
        [NoValue] = "Nothing yet",
        [ChooseFile] = "Choose a picture",
        [UploadFailed] = "Upload failed",
        [Unsaved] = "Unsaved",
        [Saving] = "Saving…",
        [Plan] = "Plan",
        [PlanTargets] = "Targets",
        [AddTarget] = "Add target",
        [SearchResources] = "Search resources",
        [NoResources] = "No resources match",
        [Target] = "Target",
        [Period] = "Counted",
        [PeriodOnce] = "Once",
        [PeriodMinute] = "Every minute",
        [PeriodHour] = "Every hour",
        [Objective] = "Make least",
        [LeastRaw] = "What is brought in",
        [LeastTime] = "The time",
        [LeastCost] = "The cost",
        [PlanEmpty] = "Name a resource to plan for: Add target, or Target on a resource's own menu.",
        [PlanInfeasible] = "No runs reach these targets: a cycle takes more than it gives.",
        [PlanTotals] = "Time {time} · brought in {raw} · cost {cost}",
        [PlanBroughtIn] = "Brought in",
        [PlanResources] = "Resources",
        [PlanCrafts] = "Recipes",
        [PlanResource] = "Resource",
        [PlanAmount] = "Amount",
        [PlanMade] = "Made",
        [PlanTaken] = "Taken",
        [PlanLeft] = "Left over",
        [PlanRuns] = "Runs",
        [PlanTime] = "Time",
        [PlanWorkers] = "Workers",
        [PlanAtOnce] = "{count} at once",
        [PerMinute] = "/min",
        [PerHour] = "/h"
    }.ToFrozenDictionary(StringComparer.Ordinal);
}
