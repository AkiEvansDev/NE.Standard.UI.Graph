# NE.Standard.UI.Graph

Three canvases for the [NE.Standard](https://github.com/AkiEvansDev/NE.Standard) UI framework, over one canvas core — pan and
zoom, the grid, selection, groups, reroute points, undo, the menus and the save. Two packages, on the framework's own pattern — the
**component**, which is platform-independent, and its **web rendering**, which carries the canvas engine and its stylesheet embedded
in its assembly.

| Component | The viewer... | Its items come from |
|---|---|---|
| `NodesComponent` | **builds** a network of typed nodes — values, pins, connections — which the package then runs | your own C# classes, read by their attributes |
| `GraphComponent` | **reads or edits** a graph of nodes and links laid out in layers, its cycles drawn as backward edges | a bound live collection of `UIGraphNode`, each carrying its links |
| `ProductionGraphComponent` | **reads, edits or plans** resources and the recipes between them: how many runs of what reach the amounts asked for | a bound live collection of `UIResource` and `UICraft` |

Each is an input whose value is its document, edited in the browser and committed whole by an explicit save. The first sections are
the node canvas; [a graph of the application's nodes](#a-graph-of-the-applications-nodes) and
[a production graph](#a-production-graph) follow, and what is said of the canvas — the grid, the menus, the save — holds for all three.

On the node canvas the node kinds are **your own C# classes**. You write ordinary types, mark them with attributes, and the canvas
builds the catalogue, the picker, the pins, the editors and the wiring from them — and a saved sheet deserializes
straight back into instances of those types, so the network you run is typed, not JSON.

## Install

```
dotnet add package NE.Standard.UI.Graph --prerelease
dotnet add package NE.Standard.UI.Web.Graph --prerelease
```

Register the web rendering beside the framework's renderers:

```csharp
services.AddStandardRenderers();
services.AddGraph();
```

## A node kind

```csharp
[GraphNode(Category = "Maths", Title = "Operation", Color = "#8b5cf6")]
public sealed class OperationNode : IGraphNode
{
    [GraphInput(Title = "Left")]
    public double Left { get; set; }

    [GraphInput(Title = "Right")]
    public double Right { get; set; }

    [GraphInput(NoPin = true, Choices = ["Add", "Subtract", "Multiply", "Divide"])]
    public string Operation { get; set; } = "Add";

    [GraphOutput]
    public double Result { get; set; }

    public void Execute(UINodeRunContext context)
        => Result = Operation switch
        {
            "Subtract" => Left - Right,
            "Multiply" => Left * Right,
            "Divide" => Left / Right,
            _ => Left + Right
        };
}
```

## The canvas

```csharp
new NodesComponent("sheet")
    .SetCatalog(typeof(OperationNode), typeof(NumberNode), typeof(ResultNode))
    .SetCanvasHeight(34)
    .BindValue(nameof(Controller.Sheet))
    .OnSave(nameof(Controller.Save));
```

`Value` is the whole document — the nodes, the edges and the groups — bound two-way. **Nothing reaches the server
until a save**: Ctrl+S, or the menu's Save, commits the document and then raises `save`, so the command sees what
the viewer built. A reload shows the saved sheet, and unsaved work is lost as it is in any editor.

The canvas itself: `SetGridSize(step)` for the grid behind it, `SetSnapToGrid(false)` to let go of the grid — it holds unless
told otherwise, taking a moved node, and on the node canvas a node's size, to the grid's step as the pointer lets go —
`SetZoomRange(min, max)` for how far it zooms out and in, and `SetEdgeShape(...)` for how an edge is drawn — stepped unless told
otherwise, curved or straight on request. Stepped edges turn in lanes: the ones that cross one gap between two columns of nodes do
not share one upright, a fork keeps one lane, and the lanes stand in the order that crosses least.

## What the attributes decide

`[GraphNode]` — `Key`, `Title`, `Description` (the line under the title in the picker), `Category` (how the picker
groups the kinds), `Icon`, `Color`, `MinWidth` (rem — the floor; the viewer drags a node wider by its corner).

The icon is an icon value: a glyph name from whatever icon pack your application registered, or one of the framework's own
`ne-` marks (`UIGlyphs`), which need no pack. The package names no glyph class of its own, and
`SetCommandIcon(UIGraphCommands.AddNode, …)` dresses a built-in menu entry the same way.

`[GraphInput]` — a value with an input pin and the editor its type asks for:

| Ask for | Write |
| --- | --- |
| A pin with no editor | `PinOnly = true` |
| An editor with no pin | `NoPin = true` |
| A combo box over a text | `Choices = ["a", "b"]`, or `ChoicesFrom = nameof(Members)` naming a public static member |
| A picture, from the address the value holds, with a file the viewer sends the server | `Image = true` |
| A pin that shows what a run put there rather than taking a value | `Display = true` |
| What a number editor accepts | `Min`, `Max`, `Step` (a whole number steps by one on its own) |
| What a text editor accepts | `MaxLength`, `MaxLines` |
| How much room the editor takes | `Height` (rem) |
| Where the pin stands | `Order` — counted from one among its own side's pins; unset, the place the class declares it in |

`[GraphOutput]` — an output pin of the property's type; `TypeOf = nameof(SomeInput)` makes its type follow whatever
is connected to that input.

**Pins are typed.** A connection is allowed between matching types and always to or from `object`, the universal
type; a picture and a text join, since a picture is an address. An input takes one edge, an output feeds any number.
An array pin (`T[]`, `List<T>`) accepts an array of the same element type or the universal array. Your own class is
a pin type named by the class and connects to its own kind or to `object`.

## Running the network

```csharp
UINodeCatalog catalog = UINodeCatalog.FromTypes(typeof(OperationNode), typeof(NumberNode), typeof(ResultNode));
UINodeRunner runner = new(catalog) { OnStatus = (id, state, progress, message) => … };

UINodeRunResult result = await runner.RunAsync(sheet);
```

The runner materializes the document into instances of your classes, walks them in the order their connections put
them — a cycle is refused rather than followed — fills each node's inputs from the outputs feeding them, calls
`Execute`, and answers every node's outputs. A kind that waits on something implements `IGraphNodeAsync` instead.

`OnStatus` is what a controller turns into `SetNodeStatusEffect`s, and `OnDisplay` — what each display pin came to
hold — into `SetNodeDisplayEffect`s. Both reach a node without touching the document: a state colouring its frame, a
progress bar and a message line, and a panel drawn from whatever shape the value turns out to have — a number, a text,
a picture, a list of lines, a table of records, or an object's fields (one carrying a picture and a `width` and `height`
is drawn at that size). Pass the application's services to the runner (`new UINodeRunner(catalog, services)`) and a node
reaches them through `context.Services`: a node kind is built from a parameterless constructor, so that is the way in.

Both hooks are awaited, so a run is watched as it runs rather than all at once when it answers — push each effect as it
arrives instead of collecting them for the command's result:

```csharp
OnStatus = (id, state, progress, message)
    => new(Context.SendEffectsAsync([new SetNodeStatusEffect(CanvasId, id, state) { Progress = progress, Message = message }]))
```

A node says how far along it is with `context.ReportAsync("Reading", 0.4)`; only a kind that waits (`IGraphNodeAsync`)
can, since a kind that runs straight through has nothing to say in the middle of itself.

## A picture a node uploads

A picture pin's control sends the chosen file through the framework's own upload and raises `image-upload`, naming the
node, the pin, the selection and the file's name:

```csharp
canvas.OnImageUpload(nameof(Controller.ImageUploadedAsync));

[UICommand]
public async Task<UICommandResult> ImageUploadedAsync(string node, string pin, string selection, string fileName, CancellationToken cancellationToken)
{
    UIUploadSelection chosen = await Context.Uploads.GetSelectionAsync(Context.Handle, selection, cancellationToken);
    var address = …;   // keep the file wherever this application keeps its pictures

    return UICommandResult.Ok([new SetNodeValueEffect(CanvasId, node, pin, address)]);
}
```

Where the picture is kept, and whether it is kept at all, is the application's own business; the pin shows nothing until
the command answers. `SetNodeValueEffect` writes that one pin rather than pushing the whole document back, so the
viewer's unsaved work survives it — and the canvas is left dirty, so save before running the sheet.

## Whose document it is

The sheet on the canvas is the viewer's until they save it. Bind the value `OnSubmit` with a `FormId`, the framework's own
way of holding an edit until it is sent:

```csharp
new NodesComponent(CanvasId)
    .SetFormId(CanvasForm)
    .BindValue(nameof(Controller.Sheet), mode: UIBindingMode.OnSubmit)
    .OnSave(nameof(Controller.SaveAsync), UIGraphArguments.Reason("reason"))
```

From the first edit the canvas holds its document: a value the server pushes meanwhile is not put on, so a flush that
happens to carry the sheet cannot take the viewer's work with it. A save submits the form and the canvas stands *unsaved*
until the command it raised has answered — a command that fails leaves it unsaved, as it should — and undoing back to the
saved sheet lets the document go again. An application that means to put a sheet on sets the value and says so:

```csharp
Sheet = StartingSheet();

return UICommandResult.Ok([new DiscardFormEffect(CanvasForm)]);
```

`DiscardFormEffect` lets the viewer's unsaved work go, and the canvas takes the server's sheet with a fresh undo history.
A sheet of any size travels: the framework sends a value over 8 KB beside the connection, both ways.

## What the viewer can do

Pan and zoom with the wheel and a drag on the background; double-click the background for the picker; drag from a
pin to wire, and pull an edge off an input to move or drop it; double-click an edge to add a reroute point; click,
Ctrl+click or Ctrl+drag a band to choose; Delete removes; Ctrl+C and Ctrl+V copy and paste with the inner connections;
Ctrl+Z and Ctrl+Y undo and redo until the save; Ctrl+A chooses everything; right-click opens a menu for what it lands on.

A node is dragged wider and taller by its bottom-right corner — every kind's, unless it says `Resizable = false`; the kind's
`MinWidth` is the floor for one and the contents' own height for the other. Folded, a node is its head alone: as wide as the
head's own words, the size it was dragged to kept for when it opens again. While the grid holds, a node's far corner lands on it
as its near one does — dragged there, folded, or simply as wide and tall as its contents came to — and on a layered graph it is a
node's middle the grid takes, so a chain of nodes of different heights stays one straight line. The canvas draws no ring when it takes the keyboard unless `ShowFocusRing` asks for
it, since it takes the keyboard on every press.

The menus are each the framework's own `MenuComponent`: the canvas's fixed entries first, and an application's under them, a
rule between. `Menu`, the core's folding menu in the canvas's leading corner — folded to its switch, slid open over the sheet, and
folded back once an entry is pressed — carries what is done to the sheet as a whole — Arrange, Fit to content, Save — and
`AddMenuEntries` appends to it; adding to the sheet is the right button's. `CanvasMenu`, the right button's on the empty surface,
carries what edits the sheet — Add node, Group selection, Delete selection, Arrange, Fit to content — and
`AddContextMenuEntries` appends to it; an entry that would act on nothing chosen, or on a read-only canvas, is disabled.
`NodeMenu` and `GroupMenu`, the right button's on a node and on a group's band, pin it, rename it over its title (emptied, the
name is its kind's again) and paint it one of `ColorChoices` — the theme's series by default, `SetColorChoices` for an
application's own — and take an application's entries through `AddNodeMenuEntries` and `AddGroupMenuEntries`; a layered graph's
`EdgeMenu` takes them through `AddEdgeMenuEntries`. A right press on something not chosen chooses it, and pin and colour act on
every chosen item of that kind. `SetCommandIcon` dresses a command in every menu that has it.

An application's entries, in whichever menu, are heard through one event: `OnMenuEntry(command)`, whose command takes the clicked
entry's id — or, named, `UIGraphArguments.Entry`, `TargetKind` and `Target`: which entry, the kind of thing the menu was opened
on (`UIGraphMenuTargets`: the sheet, a node, a group, an edge) and that thing's id. The canvas's own entries are done in the
browser and never reach it. A node's click is `OnNodeClick(command)`, whose command takes the node's id.

## A graph of the application's nodes

```csharp
public RecursiveCollection<UIGraphNode> Modules { get; } =
[
    new("storage") { Title = "Storage", Subtitle = "Tables and files", Icon = MaterialIcons.Storage, Links = [new("storage>runtime", "runtime")] },
    new("runtime") { Title = "Runtime", Badge = "3" }
];

new GraphComponent("dependencies")
    .BindItems(nameof(Controller.Modules))
    .SetFormId("layout")
    .BindValue(nameof(Controller.Layout), mode: UIBindingMode.OnSubmit)
    .SetDirection(UIGraphDirection.TopToBottom)
    .OnNodeClick(nameof(Controller.ModuleClicked));
```

`GraphComponent` draws a bound collection of `UIGraphNode`s as cards — a title and a second line, an icon or a picture (`Image`), a
colour, a badge and a tooltip — and every `UIGraphLink` a node carries as an edge with an arrow and a caption. A node whose `Shape`
is `Icon` is a circle holding its picture, or its icon when it has none, with its title under the pointer and its badge on the
rim; `NodeShape` on the graph is the shape of every node that names none. The nodes are the application's: a node
added, changed or removed arrives while the page runs, and a change to a link is its node replaced (`Links` is set whole).

The layout is the layered one, left to right or top to bottom (`Direction`): the nodes stand in layers from what nothing links to
towards what links to nothing, a cycle is broken at the edges that run back against the layers and those are drawn dashed, arced
beside their two ends, and an edge longer than one layer is routed round the layers it crosses for as long as its two ends stand
where the layout put them. `Value` is the layout document (`UIGraphDocument`): where the viewer dragged each node, the points an
edge was bent through, and the groups. A node the document does not place is placed by the layout — all of them when no document
is bound — and a node added while the page runs steps past what it would cover. Turning the direction, or changing the nodes'
shape, lays out again every node still where the layout put it; one the viewer moved stays.

### Editing the graph

`EditStructure` lets the viewer change the nodes and their links, beside moving them: Add node puts a node where the pointer was
and names it at once; a node's menu renames and recolours it; a dot on the node's outgoing side, under the pointer, pulls a link
to another node; the right button on an edge captions it or takes it out; Delete takes out what is chosen. None of it reaches the
application until the save: the document carries the draft — every node added or changed, whole, and the keys removed — and the
save command applies it.

```csharp
[UICommand]
public void Save()
{
    Layout.Draft.ApplyTo(Modules);
    Layout = Layout.WithoutDraft();
}
```

A node the application changed or removed while the viewer's own change to it waits is marked on the canvas, and its menu — an
edge's, where a recipe is drawn as its edges — then carries the two answers: **Take the server's** lets the viewer's change to
that node go, and **Keep mine** keeps it knowingly, tied to the node as the application now has it (one the application removed
becomes one the viewer adds). Left unanswered the viewer's change still stands, and saving writes it over the application's;
`UIGraphNodeDraft.Baseline` is the node as the browser had it when the viewer began, for an application that wants to refuse or
merge instead. A drafted node is its whole state, so there is no merge by field.

## A production graph

```csharp
public RecursiveCollection<UIProductionEntry> Catalogue { get; } =
[
    new UIResource("ore") { Title = "Iron ore", Icon = MaterialIcons.Landscape, Category = "Ores", Cost = 1 },
    new UIResource("plate") { Title = "Iron plate", Icon = MaterialIcons.Layers },
    new UICraft("smelt") { Title = "Smelting", Ingredients = [new("ore", 1)], Products = [new("plate", 1)], Time = TimeSpan.FromSeconds(3.2) }
];

new ProductionGraphComponent("factory")
    .BindItems(nameof(Controller.Catalogue))
    .SetFormId("factory-layout")
    .BindValue(nameof(Controller.Layout), mode: UIBindingMode.OnSubmit)
    .SetEditStructure(true)
    .OnSave(nameof(Controller.Save));
```

`ProductionGraphComponent` draws resources and the crafts between them from one bound collection of `UIProductionEntry`. A
resource (`UIResource`: title, icon or picture, colour, category, unit, cost) is drawn as a graph's node — a circle by default,
a card with `NodeShape = Card`; a circle carries its name under it. A craft (`UICraft`) is what one run of a recipe takes
(`Ingredients`), gives (`Products`, several when a recipe has by-products) and lasts (`Time`). Every edge says how much of its
resource one run takes, written as a count of the run (`×100 L`) beside that resource, and the arrow says which way it goes. The
layout, the directions — left to right, right to left, top to bottom, bottom to top — the backward edges of a cycle and the document
of places are the graph's.

A recipe that gives one resource nothing else makes is drawn on its edges rather than as a node of its own: its ingredients run
straight into that resource, each edge saying `×N`, and the resource carries the run on itself — `×1 · 3.2 s`, what one run gives of
it and how long it lasts. A junction is drawn where one is needed to say which edges belong to one run: a craft with several products,
or a resource several crafts make. While the pointer rests on a resource or a craft, the whole line it stands on keeps its colour —
everything it is made from, all the way up, and everything made from it, all the way down, with the edges between — and the rest of
the sheet steps back; a branch that leaves the line sideways is not on it. `HighlightOnHover` says whether a canvas does this: a
layered graph does unless told otherwise, and the node canvas does not unless asked.

With `EditStructure`, Add resource puts a resource where the pointer was; a dot pulled from a resource to another resource makes
a craft of one of each, into a craft adds an ingredient, and out of a craft to a resource adds a product. A recipe drawn as its
edges has no junction to drop on, so a link dropped on the resource it makes asks, in a menu where the pointer let go, which was
meant — Add as an ingredient of that recipe, or New recipe, a second way to make the resource (`LinkMenu`); dismissed, the link is
let go. The right button on an edge edits its amount or takes it out, and on a craft its Time. It all goes into `UIProductionDocument.Draft` until the save,
which applies it as the graph's does: `Layout.Draft.ApplyTo(Catalogue)` and `Layout = Layout.WithoutDraft()`.

### A plan over the catalogue

```csharp
new ProductionGraphComponent("plan")
    .BindItems(nameof(PlanController.Catalogue))
    .SetMode(UIProductionMode.Plan)
    .SetFormId("plan").BindValue(nameof(PlanController.Plan), mode: UIBindingMode.OnSubmit)
    .OnSave(nameof(PlanController.Save));
```

`Mode` puts the same component to its second use. In `UIProductionMode.Plan` the viewer names amounts to reach — Add target in the
panel, which opens a picker of the catalogue's resources, or Target on a resource's own menu — and the canvas solves, in the
browser and at once, how many runs of which craft reach them. Brought in, on the menu of a resource something makes, takes what
makes it out of the plan: the resource is then counted with the sources, as a part bought rather than built is. The sheet then draws the plan rather than the catalogue: the crafts
that run and the resources they touch, the plan's totals where one run's numbers stood (`×20 · 40 s` on a resource made once,
`×120 · 4 at once` on one counted over a period), the targets ringed. The sheet says each number once: the period is the panel's
to name, and an edge carries its amount only where the resource it leaves is shared out between several crafts or not all taken —
along a chain the resource's own chip has said it. With no target, or none that can be reached, the whole catalogue stands to choose from. The catalogue is
not edited in this mode, whatever `EditStructure` says; each use keeps a document of its own, so an application that wants both
binds two — a second component, or a `Mode` it switches with another document behind it.

The panel over the sheet's trailing side is where the plan is asked for and read: the targets and their amounts, what they are
**counted** over — once, or every minute or hour of a line that keeps running — and what is **made least** where the catalogue
leaves a choice (two recipes for one resource, a by-product that covers a demand): what is brought in, the time, or the cost
(`UIResource.Cost`, a source with none counting as one; among equals the second thing decides — the soonest, or the least brought
in). Under them, what is brought in of every source, every made resource's balance (made, taken, left over — a by-product nobody
takes shows here), and every craft's runs, their time and, for a plan counted over a period, how many of the craft keep up
(`ceil(runs × time / period)`). A row pressed chooses its item on the sheet. The panel's fields are the core's own
(`PlanPeriod`, `PlanObjective` and `PickerSearch` are the component's, for an application to re-title); it folds to its switch, and
Fit keeps clear of it while it is open.

What was asked is part of the document — `UIProductionDocument.Plan`, a `UIProductionPlanRequest` of `Targets`, `Period`,
`Objective` and `Bought` — so a plan is saved as a layout is, `WithoutDraft()` keeps it, and `WithPlan(...)` is how an application names the
targets itself. `UIProductionPlanner.Solve(entries, request)` is the same solver on the server, for a controller that wants the
numbers: a `UIProductionPlan` of `Crafts` (runs, time, workers), `Resources` (made, taken, surplus, `BroughtIn`) and the totals,
with `Status` saying `Empty`, `Solved` or `Infeasible` — a cycle that takes more than it gives has no plan. The two ports are one
algorithm (a dense simplex walked by Bland's rule, so both end on the same answer) held to one corpus,
`Client/tests/plan-corpus.json`. A plan counted over a period is steady-state — two and a half runs a minute is a rate like any
other — and nothing is queued or scheduled. A plan made once runs every craft a whole number of times: the runs are rounded up,
what that leaves short further up is made up by whole runs until nothing is, and what it leaves over shows as surplus; that is the
least such plan wherever each resource has one recipe, and close to it elsewhere. A sheet whose plan changes which nodes it draws
is laid out and shown whole again.

## What it does not do

- No sub-graphs, and no collapsing a group into one node.
- A graph has no copy and paste: a copied node would need a key the application did not make.

## Inside the package

The canvas draws no mark of its own: a node's pin, a select's chevron, the file button, a list row's cross and the zoom bar's three
are the framework's `ne-` glyphs (`UIGlyphs` on the server, `icons.apply` on the client for what a node builds in the browser), so
they are the same drawing family as every field's chevron and cross. A choice pin's list is the framework's `UIChoice`, its
captions come from `UINaming.Humanize`, and its stylesheet imports the framework's Less contract
(`Client/plugin/ne-standard-ui.less` — the tokens and the mixins, copied like the TypeScript contract beside it) rather than
restating the motion, the elevation or the dialog's veil. The engine is a class started once per page from the framework's engine
context, in the shape the framework's own engines take, and the status and display effects write through it.

The canvas is a core with kinds on it. The core (`GraphCanvasComponentBase<T, TDocument>` and `IGraphCanvasComponent` on the server,
`GraphCanvasRendererBase<TDocument>` for the frame, `Client/src/canvas/` in the browser) owns the view, the grid, the choice, the
drags, the groups, reroute points, the undo history, the save and the four menus. A kind — the node canvas is `NodesComponent`,
`NodesComponentRenderer` and `Client/src/nodes/` — owns what an item looks like, what may be joined to what, and its own panels;
the renderer names the kind on the root (`data-ui-graph-kind`) and the engine draws the canvas with the kind of that name
(`CanvasKind`). The colour choices every kind's menus offer are `UIGraphColorChoice`. Two parts a kind may want are the core's
too: the picker (`RenderPicker` and `Client/src/canvas/picker.ts` — the node kinds to add, the resources to plan for) and a
framework component as a template the engine clones (`RenderTemplate`). A panel a kind stands over the viewport's trailing side
says so with `data-ui-graph-side`, and Fit and a centred item keep to what it leaves.

## Licence

The framework's: the [Prosperity Public License 3.0.0](LICENSE.md). Free for noncommercial use, with a thirty-day
trial for commercial use.
