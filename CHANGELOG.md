# Changelog

One section per release of this slice, headed `## X.Y.Z` and named by the tag — `graph/vX.Y.Z`. The release
workflow cuts the matching section out to become the body of the GitHub release, and a tag with no section
fails the release before anything is published.

## 1.0.0-rc.3

The first version: `NE.Standard.UI.Graph` (the components and their document models) and `NE.Standard.UI.Web.Graph` (the
canvas engine, the layered layout, the production solver and the stylesheet). Three components on one canvas core — a
canvas of typed nodes that runs, a layered graph of the application's own nodes, and a production graph that plans. The
number lines up with the framework's, which goes out as a release candidate with everything that plugs into it.

### The node canvas

- `NodesComponent`: a canvas of typed nodes whose value is the whole document — pan and zoom, a grid that snaps,
  selection by click, Ctrl+click and a Ctrl+drag band, nodes dragged together, groups that carry what they hold,
  edges in three shapes with reroute points, copy and paste, and an undo history that runs until the save.
- **The node kinds are the application's own classes.** `[GraphNode]` on the class and `[GraphInput]`/`[GraphOutput]`
  on its properties are the whole catalogue: the attributes decide whether a value carries a pin, an editor or both
  (`PinOnly`, `NoPin`), what the editor accepts (`Min`, `Max`, `Step`, `MaxLength`, `MaxLines`), how much room it
  takes (`Height` on a pin, `MinWidth` on the node) and what the picker says about the kind (`Description`).
- Editors by type, out of the box: text, number, boolean, date, time, date and time, a combo box for an enum or for a
  text with `Choices`/`ChoicesFrom`, a picture shown from the address it holds (`Image = true`), a list of simple
  values for an array pin, and a pin that shows rather than takes (`Display = true`), drawn from whatever shape the run
  put in it. A developer's own class is a pin type like any other and connects to its own kind or to `object`.
- **A picture is uploaded, not pasted.** A picture pin sends the chosen file through the framework's own upload and
  raises `image-upload` naming the node, the pin, the selection and the file; the application keeps the picture wherever
  it likes and answers with `SetNodeValueEffect`, which writes that one pin rather than pushing the document back.
- A node is dragged wider and taller by its corner, and its size travels in the document; a caption and its value stand
  on one line, and a pin with no editor is a name and a dot at the top of the node beside the outputs. The picker is a
  modal dialog with a search, the categories the attributes declare and each kind's own line.
- **A network runs.** A node kind that implements `IGraphNode` (or `IGraphNodeAsync`) is executed by `UINodeRunner`:
  the saved document becomes instances of the developer's classes, they are walked in the order their connections put
  them, each one's inputs filled from the outputs feeding them, and every node's state reported as it goes.
- Nothing reaches the server until a save: Ctrl+S or the menu's Save commits the document and raises `save`, as the
  code field does. A node's status — a state, a progress bar and a message — arrives the other way, addressed to one
  node through `SetNodeStatusEffect` and never as a patch of the document.
- The canvas's menu is the framework's own, set in the component's constructor with Add node, Delete, Group, Arrange,
  Fit and Save on it; an application appends its own entries with `AddMenuEntries` and dresses the built-in ones with
  `SetCommandIcon`, since a glyph name belongs to the icon pack the application registered.
- **The sheet belongs to the viewer until they save it.** Bound `OnSubmit` with a `FormId`, the canvas holds its document
  from the first edit — a value the server pushes meanwhile is not put on — and a save submits the form. A save marks the
  canvas *unsaved* until the command it raised has answered, and undoing back to the saved sheet lets it go again. An
  application that means to put a sheet on sets the bound value and returns `DiscardFormEffect`; a sheet of any size
  travels, the framework staging one over 8 KB beside the hub.
- **A run is watched as it runs.** The runner's `OnStatus` and `OnDisplay` are awaited, and a controller pushes each effect as
  it arrives (`UIContext.SendEffectsAsync`), so a node lights up when it starts rather than when the run answers. A node that
  waits says how far along it is with `context.ReportAsync`.
- An edge follows its pin: every drawn node's box is watched, since a message appearing above a pin moves it. `Order` on a pin
  is counted from one among its own side's pins rather than against every property of the class. The picker's search field
  names the entry the arrows stand on (`aria-activedescendant`).
- **A node may fail, and a failure belongs to its branch.** `[GraphInput(Required = true)]` stops a node the value never
  reached before it runs, and a node that throws stops the same way: it goes red, everything fed by it is `Skipped`, and
  every chain that does not pass through it runs to the end. `UINodeRunResult` carries `Failures` and `Skipped` beside the
  outputs it did produce.
- **A command may ask for the sheet the viewer is looking at.** `SaveDocumentEffect` asks the canvas to commit, under a
  reason the `save` event then carries as its key (`UIGraphArguments.Reason`) — which is how the demo's Run works off what
  is on screen rather than off the sheet last committed.
- A progress line is a kind's own choice (`[GraphNode(ShowProgress = true)]`): edge to edge under the head, the theme's
  primary, square at both ends, and gone the moment the node stops running.
- A picture pin may be one large surface (`[GraphInput(Image = true, Large = true)]`) — the shape of the framework's own
  picture field, with no address beside it.
- The canvas's menu has a button of its own in the leading top corner (`ShowMenuButton`), opening the menu the right button
  opens, application entries and all. The picker's entries wear a button's corners and the kind's `Icon`.
- A required value wears the framework's own mark beside its caption.
- The grid takes hold when a drag ends rather than under the hand; the resize corner's reach hangs past the node's edge and
  its mark is half the size; a refused pin's caption and editor go back with the pin while a connection is pulled; a chosen
  node wears `--ui-color-primary` rather than the focus ring; and the pin at a node's head works — it was answered on the
  click that a captured pointer never delivers, and is answered on the press now.
- **One pin may take several connections.** `[GraphInput(Multiple = true)]` on a collection property gathers every edge that
  reaches it, in the document's own order, and types the pin by its element — one edge carries one element. The pin is drawn
  as a square rather than a dot, and its editor goes inert as soon as anything feeds it.
- **A pin may be shown only when it matters.** `VisibleWhen` names another input and `VisibleValues` the values of it that
  show this one; what is hidden is still saved and still fed, so a rule turned off throws nothing away.
- `Description` on a pin is the line it says under the pointer, through the framework's own tooltip; `Unit` is written after
  the value inside the field's box; `Format` is how a number the canvas writes itself — a display pin's answer — is written,
  in the page's own culture.
- `[GraphNode(Resizable = false)]` takes the corner away from a kind whose size says nothing, and `Hidden = true` keeps a kind
  out of the picker while every sheet that already holds it is still read, drawn and run.
- **A node folds to its head** at the chevron there: the body goes and its pins gather on the head's two edges, where the
  edges that reach them converge. `collapsed` travels in the document, so a folded sheet opens folded.
- **A map of the whole sheet**, `SetShowMinimap(true)`: every node in its own colour, the part now in view marked over them,
  and a press anywhere on it taking the view there. Off by default — a map of four nodes is a box in the way. It stands over the
  zoom bar, in one corner stack with it.
- **A log at the canvas's foot**, folded to a strip along the bottom edge whose count takes the colour of its worst line: every failure — a node itself
  only turns red — and whatever a node writes (`context.LogAsync` while it waits, `context.Log` straight through). A line names its
  node, and a press on the name chooses the node and brings it into view. A run that begins clears it.
- **A run line along the canvas's top** (`ShowRunProgress`, on by default): the whole run above, the running node's own steps
  below, its name at the start and the share done at the end. It keeps the last run's end, in the danger colour with the first
  failure named when a node failed. A finished node keeps its plain frame; only a running and a failed one are coloured.
- `CanvasHeight` is the canvas's least height: given a height of its own — a fill in a page's row — the canvas grows to it.
- A picture pin drawn large and a display showing a picture alone fit the height the node is dragged to.
- The unsaved word stands at the end of the log's strip, and the zoom bar is as wide as the map over it. The runner reports it through `OnRunProgress`, and
  the two new effects are `AddNodeLogEffect` and `SetRunProgressEffect`.
- **Menus by what is pressed**: the corner button's menu carries every command and the application's (`AddMenuEntries`);
  the right button's on the empty surface edits the sheet (`AddContextMenuEntries`); on a node or a group's band it pins,
  renames in place — emptied, the kind's name again — and paints one of `SetColorChoices` (the theme's series by default).
  An entry acting on nothing chosen is disabled. A group can be pinned (`UIGraphGroup.Pinned`).
- A pin's tooltip names its type — `number[]` for an array, an enum by its own name, `number, several` for a pin taking several.
- `examples/DemoApp.Graph` (port 5600) is a calculator built out of nodes, with the picture nodes beside it — and a `Pause`
  node, the one kind slow enough to watch report.

### The layered graphs

- `GraphComponent`: the application's own nodes and the links between them, laid out in layers — a layer is a column
  (or a row, `SetDirection`), the chains run straight, a circle wears its name under it (`SetNodeShape`), and a node
  the document does not place is placed by the layout. The viewer moves, groups and reroutes as on the node canvas,
  and — where the graph lets its structure be edited (`SetEditStructure`) — adds, renames, recolours, links and
  removes nodes; what they changed travels as `UIGraphDocument.Draft`, which the application applies to its nodes
  with `UIGraphDraft.ApplyTo` and puts the layout back without (`WithoutDraft`). A node the server changed under an
  unsaved change of the viewer's is marked as a conflict until the save answers.
- `ProductionGraphComponent`: resources and the crafts between them on the same sheet — a craft that gives one
  resource nothing else makes is drawn on its edges, every other one as a junction its ingredients enter and its
  products leave, each edge labelled with its amount; `UIProductionDraft` and `UIProductionDocument` are the
  production graph's own draft and document.
- The item under the pointer brings out the whole line it stands on, up and down, and the rest of the sheet steps back;
  `HighlightOnHover` turns it, on for the layered graphs and off for `NodesComponent`.
- A production graph plans (`SetMode(UIProductionMode.Plan)`): the viewer names amounts to reach, the canvas solves the runs in
  the browser and draws the plan with its totals, and a panel beside the sheet says what is brought in, made, taken and left
  over — counted once or over a minute or an hour, making least what is brought in, the time or the cost. What was asked travels
  in the document (`UIProductionDocument.Plan`), and `UIProductionPlanner.Solve` is the same solver on the server.
- Edges are stepped unless told otherwise (`EdgeShape`), and stepped edges turn in lanes: the edges crossing one gap do not
  share one upright, a fork keeps one lane and the lanes stand in the order that crosses least — on the layered graphs and the
  node canvas alike. A stepped edge on a sheet whose layers run right to left or bottom to top is drawn as it should be.
- A sheet of circles keeps the gap between its layers clear of the chips and names the circles wear, so what an edge says there is
  never under one; and nodes arriving on a sheet the layout alone made lay it out again, rather than leave its long edges running
  over them.
- A plan made once runs every craft a whole number of times, what the rounding leaves over shown as surplus; a made resource may be
  marked Brought in, which takes what makes it out of the plan (`UIProductionPlanRequest.Bought`); and a plan that changes which
  nodes it draws is laid out and fitted again.
- A link dropped on a resource that one recipe, drawn as its edges, already makes asks which was meant: another ingredient of that
  recipe, or a recipe of its own.
- A conflict is the viewer's to answer: an item the application changed under an unsaved change carries Take the server's and Keep
  mine in its menu.
- An application puts entries of its own under the canvas's in every menu — `AddNodeMenuEntries`, `AddGroupMenuEntries` beside
  the corner's, the surface's and the edge's — and `OnMenuEntry` hears them all through one event naming the entry and what the
  menu was opened on; the canvas's own entries never reach that command. The corner menu is the sheet's commands alone: Add
  node and Add resource are the right button's.
- The grid holds unless told otherwise (`SetSnapToGrid(false)`), and takes sizes as well as places: a node dragged by its corner,
  folded, or simply as large as its contents lands with both corners on the grid, and a layered graph is taken by the middles of
  its nodes so its lines stay straight. A folded node is its head alone — no taller, and no wider than its words.
- The layered layout stands a source beside what it feeds, bends a long edge once, and does not push a sheet apart where a
  long edge passes over a chain it is joined to; Fit keeps a node's name and chip in view.
- `examples/DemoApp.Graph` has a dependencies page and a real game's two production chains — a battery and a drink sharing
  their water and their sandleaf powder — and their plan.
