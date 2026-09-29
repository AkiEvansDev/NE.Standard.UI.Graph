using System;
using System.Collections.Generic;
using System.Globalization;

namespace DemoApp.Graph;

/// <summary>
/// The modules of a small application and what uses what: a link runs from a module to the ones built on it, so the layers read
/// from the foundation to the apps. Accounts and sessions use each other, which is the cycle a backward edge is drawn for; a module
/// added from the form beside the graph arrives in it while the page runs.
/// </summary>
internal sealed partial class DependenciesController : UIControllerBase
{
    public const string CanvasId = "dependencies";

    /// <summary>The form the layout is held in until it is saved.</summary>
    public const string CanvasForm = "layout";

    // The theme's series by what a module is for, so the layers read as bands of colour.
    private const string Foundation = "var(--ui-color-series-3)";
    private const string Core = "var(--ui-color-series-4)";
    private const string Identity = "var(--ui-color-series-1)";
    private const string Pages = "var(--ui-color-series-5)";
    private const string Hosting = "var(--ui-color-series-8)";

    // A picture the page carries itself, so the demo shows one without a file to fetch: a storefront's awning in the theme's hues.
    private const string ShopPicture = "data:image/svg+xml;charset=utf-8,"
        + "%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E"
        + "%3Crect width='64' height='64' fill='%233b82f6'/%3E"
        + "%3Cpath d='M8 22h48l-4-10H12z' fill='%23fbbf24'/%3E"
        + "%3Crect x='14' y='26' width='36' height='26' rx='2' fill='%23f8fafc'/%3E"
        + "%3Crect x='28' y='36' width='10' height='16' fill='%233b82f6'/%3E%3C/svg%3E";

    // The modules the form added, in the order it added them: the canvas may add and remove modules too, so a count says nothing.
    private readonly List<string> _added = [];

    [RecursiveMember(false)]
    public RecursiveCollection<UIGraphNode> Modules { get; } = [.. StartingModules()];

    [RecursiveMember]
    public partial UIGraphDocument Layout { get; set; } = UIGraphDocument.Empty;

    [RecursiveMember]
    public partial UIGraphDirection Direction { get; set; } = UIGraphDirection.LeftToRight;

    [RecursiveMember]
    public partial UIGraphEdgeShape EdgeShape { get; set; } = UIGraphEdgeShape.Orthogonal;

    [RecursiveMember]
    public partial UIGraphNodeShape NodeShape { get; set; } = UIGraphNodeShape.Card;

    [RecursiveMember]
    public partial bool ReadOnly { get; set; }

    [RecursiveMember]
    public partial bool EditStructure { get; set; } = true;

    [RecursiveMember]
    public partial string NewModule { get; set; } = "Reports";

    [RecursiveMember]
    public partial string UsedModule { get; set; } = "storage";

    [RecursiveMember]
    public partial UIPhrase? Status { get; set; } = new UIPhrase("planner.graph.status.start");

    /// <summary>The modules a new one may be built on, for the form's choice.</summary>
    public static IReadOnlyList<(string Id, string Title)> Choices { get; } =
    [
        ("primitives", "Primitives"),
        ("storage", "Storage"),
        ("runtime", "Runtime"),
        ("components", "Components"),
        ("accounts", "Accounts")
    ];

    [UICommand]
    public UICommandResult AddModule()
    {
        var title = NewModule.Trim();
        var id = title.ToLowerInvariant().Replace(' ', '-');

        if (title.Length == 0 || FindModule(id) is not null)
        {
            Status = title.Length == 0 ? new UIPhrase("planner.graph.status.no-name") : UIPhrase.Of("planner.graph.status.taken", ("module", title));
            return UICommandResult.Ok();
        }

        if (FindModule(UsedModule) is not UIGraphNode used)
        {
            Status = new UIPhrase("planner.graph.status.no-base");
            return UICommandResult.Ok();
        }

        // The new link is the used module's: its whole list is replaced, which is what reaches the browser as that node replaced.
        used.Links = [.. used.Links, new UIGraphLink($"{used.Id}>{id}", id)];
        Modules.Add(Module(id, title, "Added while the page runs", MaterialIcons.Extension, Pages));
        _added.Add(id);

        Status = UIPhrase.Of("planner.graph.status.added", ("module", title), ("used", used.Title));
        return UICommandResult.Ok();
    }

    /// <summary>The last module added from the form goes, with every link that reached it.</summary>
    [UICommand]
    public UICommandResult RemoveAdded()
    {
        UIGraphNode? last = null;

        // One the canvas has taken off since is no longer there to go.
        while (last is null && _added.Count > 0)
        {
            last = FindModule(_added[^1]);
            _added.RemoveAt(_added.Count - 1);
        }

        if (last is null)
        {
            Status = new UIPhrase("planner.graph.status.nothing-added");
            return UICommandResult.Ok();
        }

        foreach (UIGraphNode module in Modules)
        {
            List<UIGraphLink> kept = [.. RemoveLinksTo(module.Links, last.Id)];

            if (kept.Count != module.Links.Count)
                module.Links = kept;
        }

        _ = Modules.Remove(last);

        Status = UIPhrase.Of("planner.graph.status.removed", ("module", last.Title));
        return UICommandResult.Ok();
    }

    /// <summary>
    /// The layout has landed with the draft of what the viewer changed about the modules: the draft is applied to the modules, which
    /// reach the page as they change, and the layout is kept without it.
    /// </summary>
    [UICommand]
    public void Save()
    {
        UIGraphDraft draft = Layout.Draft;
        var at = DateTime.Now.ToString("HH:mm:ss", CultureInfo.InvariantCulture);

        if (draft.IsEmpty)
        {
            Status = UIPhrase.Of("planner.graph.status.kept", ("count", Layout.Nodes.Length), ("time", at));
            return;
        }

        draft.ApplyTo(Modules);
        Layout = Layout.WithoutDraft();

        Status = UIPhrase.Of("planner.graph.status.applied", ("changed", draft.Nodes.Length), ("count", draft.Removed.Length), ("time", at));
    }

    [UICommand]
    public void ModuleClicked(string node)
    {
        if (FindModule(node) is UIGraphNode module)
            Status = UIPhrase.Of("planner.graph.status.used-by", ("module", module.Title), ("count", module.Links.Count));
    }

    /// <summary>The layout forgotten: every module goes back to where the layered layout puts it.</summary>
    [UICommand]
    public UICommandResult ResetLayout()
    {
        Layout = UIGraphDocument.Empty;
        Status = new UIPhrase("planner.graph.status.reset");

        return UICommandResult.Ok([new DiscardFormEffect(CanvasForm)]);
    }

    private UIGraphNode? FindModule(string id)
    {
        foreach (UIGraphNode module in Modules)
        {
            if (string.Equals(module.Id, id, StringComparison.Ordinal))
                return module;
        }

        return null;
    }

    private static IEnumerable<UIGraphLink> RemoveLinksTo(IReadOnlyList<UIGraphLink> links, string id)
    {
        foreach (UIGraphLink link in links)
        {
            if (!string.Equals(link.To, id, StringComparison.Ordinal))
                yield return link;
        }
    }

    private static UIGraphNode[] StartingModules()
    {
        UIGraphNode[] modules =
        [
            Module("primitives", "Primitives", "Values and names", MaterialIcons.DataObject, Foundation, "3 types"),
            Module("storage", "Storage", "Tables and files", MaterialIcons.Storage, Foundation),
            Module("schema", "Schema", "What is kept, and how", MaterialIcons.Schema, Foundation),
            Module("runtime", "Runtime", "Commands and state", MaterialIcons.Terminal, Core),
            Module("components", "Components", "What a page is built of", MaterialIcons.Widgets, Core, "54"),
            Module("accounts", "Accounts", "Who may sign in", MaterialIcons.Security, Identity),
            Module("sessions", "Sessions", "Who is signed in", MaterialIcons.Hub, Identity),
            Module("api", "API", "What other programs call", MaterialIcons.Api, Pages),
            Module("web", "Web", "Pages in a browser", MaterialIcons.Web, Pages),
            Module("admin", "Admin", "The operators' pages", MaterialIcons.AccountTree, Pages),
            Module("shop", "Shop", "The customers' pages", MaterialIcons.Language, Pages),
            Module("cloud", "Cloud", "Where it all runs", MaterialIcons.Cloud, Hosting)
        ];

        Link(modules, "primitives", "schema", "runtime", "components");
        Link(modules, "schema", "storage");
        Link(modules, "storage", "runtime", "accounts");
        Link(modules, "runtime", "api", "web", "sessions");
        Link(modules, "components", "web");
        // The cycle: an account keeps its sessions, and a session names its account.
        Link(modules, "accounts", "sessions");
        Link(modules, "sessions", "accounts");
        Link(modules, "api", "shop");
        Link(modules, "web", "admin", "shop");
        Link(modules, "admin", "cloud");
        Link(modules, "shop", "cloud");

        // The cloud is a circle wherever the graph draws cards, and the shop wears a picture instead of its icon.
        modules[11].Shape = UIGraphNodeShape.Icon;
        modules[10].Image = ShopPicture;

        // Captions on the two edges of the cycle, which is what the page is about.
        Caption(modules, "accounts", "sessions", "keeps");
        Caption(modules, "sessions", "accounts", "names");

        return modules;
    }

    private static UIGraphNode Module(string id, string title, string subtitle, string icon, string color, string? badge = null)
        => new(id) { Title = title, Subtitle = subtitle, Icon = icon, Color = color, Badge = badge, Tooltip = $"{title} — {subtitle.ToLowerInvariant()}." };

    private static void Link(UIGraphNode[] modules, string from, params string[] to)
    {
        UIGraphNode source = Array.Find(modules, module => module.Id == from)!;
        List<UIGraphLink> links = [.. source.Links];

        foreach (var target in to)
            links.Add(new UIGraphLink($"{from}>{target}", target));

        source.Links = links;
    }

    private static void Caption(UIGraphNode[] modules, string from, string to, string caption)
    {
        UIGraphNode source = Array.Find(modules, module => module.Id == from)!;
        List<UIGraphLink> links = [];

        foreach (UIGraphLink link in source.Links)
            links.Add(link.To == to ? link with { Caption = caption } : link);

        source.Links = links;
    }
}
