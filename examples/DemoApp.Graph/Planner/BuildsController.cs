using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using NE.Standard.UI.Primitives.Recursive;

namespace DemoApp.Graph.Planner;

/// <summary>
/// Builds over the catalogue: each a tab of goals — a resource and how many, made once or every minute or hour as the build counts
/// them — which are the production graph's plan targets: named in its own panel, solved, drawn and listed there, and saved here as
/// the canvas sends each edit.
/// </summary>
internal sealed partial class BuildsController : UIControllerBase
{
    public const string DeleteDialogKey = "planner-delete-build";
    public const string ImportDialogKey = "planner-import-builds";

    /// <summary>How a file's builds are taken in: merged by id into these, or in their place.</summary>
    public const string MergeImport = "merge";
    public const string ReplaceImport = "replace";

    /// <summary>The form the plan is sent in; the canvas saves every edit, so it is held no longer than one round trip.</summary>
    public const string PlanForm = "planner-plan";

    private const double MaxGoal = 100000;

    private IReadOnlyList<ResourceRecord> _resources = [];
    private string? _openId;
    private string? _pendingDeleteId;

    private PlannerStore Store => Context.Services.GetRequiredService<PlannerStore>();

    private PlannerPictures Pictures => Context.Services.GetRequiredService<PlannerPictures>();

    [RecursiveMember(false)]
    public RecursiveCollection<TabItem> Builds { get; } = [];

    [RecursiveMember]
    public partial string? SelectedKey { get; set; }

    /// <summary>The whole catalogue: the graph draws only what the plan takes part in.</summary>
    [RecursiveMember(false)]
    public RecursiveCollection<UIProductionEntry> Catalogue { get; } = [];

    /// <summary>The graph's document, carrying the open build's goals as its plan request.</summary>
    [RecursiveMember]
    public partial UIProductionDocument Plan { get; set; } = UIProductionDocument.Empty;

    /// <summary>Shown while the catalogue has nothing to plan with.</summary>
    [RecursiveMember]
    public partial UIVisibility EmptyVisibility { get; set; } = UIVisibility.Collapsed;

    [RecursiveMember]
    public partial UIPhrase? DeleteQuestion { get; set; }

    /// <summary>The picker's upload, which the import reads the file back by.</summary>
    [RecursiveMember]
    public partial string? ImportSelection { get; set; }

    [RecursiveMember]
    public partial string? ImportMode { get; set; } = MergeImport;

    protected override Task OnInitializeAsync(CancellationToken cancellationToken)
    {
        _resources = Store.ListResources();

        foreach (UIProductionEntry entry in PlannerCatalogue.Entries(_resources, Pictures))
            Catalogue.Add(entry);

        EmptyVisibility = _resources.Count == 0 ? UIVisibility.Visible : UIVisibility.Collapsed;

        LoadBuilds(null);

        return Task.CompletedTask;
    }

    /// <summary>The tabs read again, the named build open if it is still there and the first otherwise.</summary>
    private void LoadBuilds(string? open)
    {
        IReadOnlyList<BuildRecord> builds = Store.ListBuilds();

        // As in a spreadsheet, there is always a sheet to write in: a first visit finds one waiting.
        if (builds.Count == 0)
        {
            _ = Store.CreateBuild("Build 1");
            builds = Store.ListBuilds();
        }

        Builds.Clear();

        // The store lists the pinned builds first, so the strip's head is theirs as the menu's pin left it.
        for (var i = 0; i < builds.Count; i++)
            Builds.Add(new TabItem { Id = builds[i].Id, Title = builds[i].Name, Order = i, Pinned = builds[i].Pinned });

        _openId = null;
        SelectedKey = open is not null && FindTab(open) is not null ? open : builds[0].Id;

        // A key the same as before notifies nothing, and the build it names was read again all the same.
        if (_openId is null && SelectedKey is { } id)
            OpenBuild(id);
    }

    private TabItem? FindTab(string id)
    {
        foreach (TabItem tab in Builds)
        {
            if (tab.Id == id)
                return tab;
        }

        return null;
    }

    /// <summary>The build's goals as the graph's plan request: the canvas solves it, draws it and lists the calculation in its panel.</summary>
    private void OpenBuild(string id)
    {
        _openId = id;

        List<UIProductionTarget> targets = [];
        BuildRecord? open = null;

        foreach (BuildRecord build in Store.ListBuilds())
        {
            if (build.Id != id)
                continue;

            open = build;
            AddTargets(targets, build.Goals);
        }

        string[] bought = [.. (open?.Bought ?? []).Where(resource => Find(resource) is not null)];

        Plan = UIProductionDocument.Empty.WithPlan(new UIProductionPlanRequest([.. targets], open?.Period ?? UIProductionPeriod.Minute, open?.Objective ?? UIProductionObjective.LeastRaw, bought)).WithKey(id);
    }

    /// <summary>One target per resource: a resource a file asked for in two rows is asked for once, the rows' amounts added up.</summary>
    private void AddTargets(List<UIProductionTarget> targets, IReadOnlyList<AmountRecord> goals)
    {
        foreach (AmountRecord goal in goals)
        {
            if (goal.ResourceId is not { } resource || Find(resource) is null || goal.Amount <= 0)
                continue;

            var index = targets.FindIndex(target => target.Resource == resource);

            if (index < 0)
                targets.Add(new UIProductionTarget(resource, goal.Amount));
            else
                targets[index] = targets[index] with { Amount = targets[index].Amount + goal.Amount };
        }
    }

    private ResourceRecord? Find(string id)
    {
        foreach (ResourceRecord resource in _resources)
        {
            if (resource.Id == id)
                return resource;
        }

        return null;
    }

    /// <summary>
    /// The strip reports what the viewer did to it through the values it binds: a tab picked, a caption renamed in place, or a build
    /// pinned or unpinned from its menu, which moves it and writes its new place as its order.
    /// </summary>
    protected override void OnNotify(RecursiveChange change)
    {
        base.OnNotify(change);

        ArgumentNullException.ThrowIfNull(change);

        RecursivePath path = change.Path;

        if (path.Count == 1 && path[0].Kind == PathSegmentKind.Property && path[0].Property == nameof(SelectedKey))
        {
            if (SelectedKey is { } id && id != _openId)
                OpenBuild(id);
        }
        else if (path.Count == 3
            && path[0].Kind == PathSegmentKind.Property && path[0].Property == nameof(Builds)
            && path[1].Kind == PathSegmentKind.Key
            && path[2].Kind == PathSegmentKind.Property
            && FindTab(path[1].Key) is TabItem tab)
        {
            OnTabChanged(tab, path[2].Property);
        }
    }

    private void OnTabChanged(TabItem tab, string property)
    {
        switch (property)
        {
            case nameof(TabItem.Title):
                // A caption renamed to nothing gets a name back rather than a blank tab.
                if (string.IsNullOrWhiteSpace(tab.Title))
                    tab.Title = "Build";
                else
                    Store.RenameBuild(tab.Id, tab.Title.Trim());

                break;
            case nameof(TabItem.Pinned):
                Store.PinBuild(tab.Id, tab.Pinned == true);
                break;
            // The strip's order is kept as the builds' positions, so a pinned build opens where the pin put it.
            case nameof(TabItem.Order):
                Store.OrderBuilds([.. Builds.OrderBy(static build => build.Order ?? double.MaxValue).Select(static build => build.Id)]);
                break;
            default:
                break;
        }
    }

    [UICommand]
    public void AddBuild()
    {
        var name = string.Create(CultureInfo.InvariantCulture, $"Build {Builds.Count + 1}");
        var id = Store.CreateBuild(name);
        var order = 0d;

        foreach (TabItem tab in Builds)
            order = Math.Max(order, (tab.Order ?? 0) + 1);

        Builds.Add(new TabItem { Id = id, Title = name, Order = order });
        SelectedKey = id;
    }

    /// <summary>A tab's close asks first: a build is its goals, and they go with it.</summary>
    [UICommand]
    public UICommandResult AskDelete(string id)
    {
        if (FindTab(id) is not TabItem tab)
            return UICommandResult.Ok();

        if (Builds.Count == 1)
            return UICommandResult.Ok([new ShowNotificationEffect(new UIPhrase("planner.build.last-stays"), UIColorStyle.Warning)]);

        _pendingDeleteId = id;
        // The build's name is content, an argument as written.
        DeleteQuestion = UIPhrase.Of("planner.build.delete.question", ("name", tab.Title ?? string.Empty));

        return UICommandResult.Ok([new OpenDialogEffect(DeleteDialogKey)]);
    }

    [UICommand]
    public UICommandResult Delete()
    {
        if (_pendingDeleteId is not { } id || FindTab(id) is not TabItem tab)
            return UICommandResult.Ok([new CloseDialogEffect(DeleteDialogKey)]);

        Store.DeleteBuild(id);

        var index = Builds.IndexOf(tab);
        _ = Builds.Remove(tab);
        _pendingDeleteId = null;

        if (SelectedKey == id)
            SelectedKey = Builds[Math.Min(index, Builds.Count - 1)].Id;

        return UICommandResult.Ok([new CloseDialogEffect(DeleteDialogKey)]);
    }

    [UICommand]
    public UICommandResult CloseDialog()
    {
        _pendingDeleteId = null;

        return UICommandResult.Ok([new CloseDialogEffect(DeleteDialogKey), new CloseDialogEffect(ImportDialogKey)]);
    }

    /// <summary>Every build written to a file the browser saves, its goals naming resources by id.</summary>
    [UICommand]
    public async Task ExportAsync(CancellationToken cancellationToken)
    {
        var content = PlannerFiles.WriteBuilds(Store.ListBuilds());

        _ = await Context.Downloads.DownloadAsync(Context.Handle, PlannerFiles.BuildsFileName, PlannerFiles.BuildsContentType, content, cancellationToken).ConfigureAwait(false);
    }

    [UICommand]
    public UICommandResult OpenImport()
    {
        ImportSelection = null;
        ImportMode = MergeImport;

        return UICommandResult.Ok([new OpenDialogEffect(ImportDialogKey)]);
    }

    /// <summary>The picked file read, checked and taken in; a goal naming a resource this catalogue lacks is left out.</summary>
    [UICommand]
    public async Task<UICommandResult> ImportAsync(CancellationToken cancellationToken)
    {
        (var content, var uploadError) = await PlannerFiles.ReadUploadAsync(Context, ImportSelection, cancellationToken).ConfigureAwait(false);
        UICommandResult answer = UICommandResult.Ok();

        // In the runtime's turn: past its first wait the command runs beside the tab, whose values write these members too.
        _ = await Context.Runtime.InvokeAsync(() => answer = TakeImport(content, uploadError), cancellationToken).ConfigureAwait(false);

        return answer;
    }

    private UICommandResult TakeImport(byte[]? content, string? uploadError)
    {
        if (content is null)
            return Refuse(uploadError);

        (IReadOnlyList<BuildRecord>? builds, var fileError) = PlannerFiles.ReadBuilds(content);

        if (builds is null)
            return Refuse(fileError);

        var replace = ImportMode == ReplaceImport;

        Store.ImportBuilds(builds, replace);
        LoadBuilds(_openId);

        // A toast is written once, in the language the page shows as it opens.
        UIPhrase taken = UIPhrase.Of(replace ? "planner.builds.imported.replace" : "planner.builds.imported.merge", ("count", builds.Count));

        return UICommandResult.Ok([new CloseDialogEffect(ImportDialogKey), new ShowNotificationEffect(taken, UIColorStyle.Success)]);
    }

    /// <summary>A notification of why nothing was taken, the reason one of the demo's keys.</summary>
    private static UICommandResult Refuse(string? reason)
        => UICommandResult.Ok([new ShowNotificationEffect(new UIPhrase(reason ?? "planner.file.nothing-read"), UIColorStyle.Danger)]);

    /// <summary>
    /// The canvas sent an edit in its plan panel — a target added, changed or taken off, the period or what is made least of chosen,
    /// a resource brought in: the plan of the build the document names, written whole. Node places are the layout's own and are not
    /// kept. A target the store would not keep as sent — too large, or of a resource no longer in the catalogue — goes back to the
    /// canvas as it was kept.
    /// </summary>
    [UICommand]
    public void SaveGoals()
    {
        // The build the edit was made on, which the document carries: an edit made just before a tab switch arrives after it.
        if ((Plan.Key ?? _openId) is not { } id || FindTab(id) is null)
            return;

        UIProductionPlanRequest request = Plan.Plan;
        List<AmountRecord> rows = new(request.Targets.Length);
        List<UIProductionTarget> kept = new(request.Targets.Length);

        foreach (UIProductionTarget? target in request.Targets)
        {
            // The document is the browser's: a target it sent as null, or naming nothing, is no goal.
            if (target?.Resource is null || Find(target.Resource) is null || !double.IsFinite(target.Amount) || target.Amount <= 0)
                continue;

            var amount = Math.Min(target.Amount, MaxGoal);

            rows.Add(new AmountRecord(PlannerDatabase.NewId(), target.Resource, amount));
            kept.Add(new UIProductionTarget(target.Resource, amount));
        }

        string[] bought = [.. request.Bought.Where(resource => Find(resource) is not null)];

        Store.SetPlan(id, rows, request.Period, request.Objective, bought);

        // Saved where it belongs; the canvas goes back to the build now open, which the arriving document took the place of.
        if (id != _openId)
        {
            if (_openId is { } open)
                OpenBuild(open);

            return;
        }

        if (kept.Count != request.Targets.Length || bought.Length != request.Bought.Length || kept.Where((target, at) => target.Amount != request.Targets[at].Amount).Any())
            Plan = Plan.WithPlan(new UIProductionPlanRequest([.. kept], request.Period, request.Objective, bought));
    }
}
