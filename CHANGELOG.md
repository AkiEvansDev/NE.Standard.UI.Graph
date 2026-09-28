# Changelog

One section per release of this slice, headed `## X.Y.Z` and named by the tag — `graph/vX.Y.Z`. The release
workflow cuts the matching section out to become the body of the GitHub release, and a tag with no section
fails the release before anything is published.

## 1.0.1

- **The first stable release.** No `--prerelease` is needed any more. Until 2.0.0 the public surface may still move
  between versions; every such change is marked **Breaking:** in this file.
- **The planner's builds have the tabs view's own menu**: *Rename*, *Pin* or *Unpin*, and *Delete* — the strip's remove entry
  in its destructive form, in the danger colour, going through the same confirmation as a build's cross. A pinned build stands at the head of the strip, and both
  the pin and the strip's order are kept in `planner.db` (a `pinned` column added in place to an existing file, the order as
  the builds' positions) and travel in the builds file, where a file without the field reads as unpinned.
- **The reroute is out of the picker and has an entry of its own**: the node canvas's menu on the empty sheet offers *Add
  reroute* after *Add node*, putting one down unwired where it was opened, as a wire's menu puts one on the wire. `RerouteNode`
  is `Hidden`, so a document holding reroutes reads, runs and draws as before.
- **A run writes the state it leaves onto the sheet in the runtime's own turn** (`UINodeRuns.SavedAsync` takes
  `Context.Runtime.InvokeAsync`), so a save the viewer makes while a run of all goes on is not overwritten by the sheet read before
  it; the demos' commands write what they read after a wait the same way.
- **Arrange leaves a pinned item where it stands** on the layered and the production graph, as it does on the node canvas.
- **An item added after one was deleted no longer takes the deleted one's key** and vanishes on the save — a layered graph's
  node, a production graph's resource or recipe.
- **Undo keeps what a run wrote into a node's state**, rather than taking the sheet back to a count the server has moved past;
  and an undo or a redo is saved as it is made where `AutoSave` is on.
- **A layered sheet that places a new item beside the ones the viewer moved keeps where it laid the others**, and their long
  edges keep their routes.
- **Deleting a resource on the production graph takes its amounts out of the recipes that named it**, and a recipe left taking
  nothing goes too, rather than staying undrawn and making its product from nothing. A draft or a plan request with empty
  targets or amounts is read around them rather than failing.
- **A row of the plan panel shows its item on a read-only graph too.**
- **On a read-only node canvas a node's fold and pin buttons are drawn disabled**; a second paste pastes what was copied, not
  the first paste as it was edited since; Escape leaves the picker's button no longer marked open; a press on the map lands its
  point beside an open plan panel rather than under it.
- **The planner's import refuses ids that could take a recipe's key or break a picture's address**, and the layered demo's
  *Remove added module* removes the module its form added, whatever the canvas did meanwhile.
- **The calculator's and the pictures' kinds wear the core's own glyphs**, so neither package depends on the Material icon set
  and a host registers nothing for them.
- **A folded node keeps its head's own height** on the grid, so its title keeps the line it stands on, and it wears its head's
  ground; it landed with both corners on the grid, which stretched the head.
- **Arrange on the node canvas runs on the layered layout** the layered graph uses — cycles cut, long wires through a place of
  their own in each column, the order that crosses least, each node lined up with what it is wired to — and lines up a wire's two
  pins rather than the two nodes' middles, so a wire between nodes of different heights comes out straight. On the grid, each run of
  nodes joined by straight wires moves as one, so the grid does not bend them again; a selection is arranged where it stood rather
  than at the sheet's corner. `layered()` takes an edge's own offsets at either end and a gap per layer, and without them lays out
  as before.
- **A multi-line text on a node is sized by the node's corner.** It fills the height the node is dragged to, which is kept and lands
  on the grid; the field's own resize handle is gone — it grew the node past the grid and was lost at the next redraw.
- **A collection out of a set is a list of combo boxes**: an enum array, or an array with `Choices`/`ChoicesFrom`, edits as rows
  each choosing one value, the add button giving another. The enum array's rows were text fields, and an array with `Choices` was a
  single combo box for a value that is a list.
- **The common kinds gain logic, lists, more text and dates.** *Logic*: `ChooseNode` (one of two values by a yes or no),
  `AndNode`, `OrNode`, `NotNode` and `EqualsNode` (any two values — numbers as numbers, texts ignoring case if asked, dates as
  dates, lists item by item). *Lists*: `ItemAtNode` (-1 the last, *Found* when out of range), `ListCountNode`, `ForEachNode`
  (one item a run, *Taken* kept with its reset, *Start over*, *Wrapped* and *Advance* as a counter's, played by Run all),
  `SortNode`, `ReverseNode` and `DistinctNode`. *Text*: `TrimNode`, `SliceNode` (clamps, never fails), `ToNumberNode` (the
  invariant culture, with *Valid*) and `MatchNode` (a regular expression with a one-second timeout; a pattern that cannot be read
  fails the node). *Dates*: `AddToDateNode`, `DateDifferenceNode` and `DatePartsNode`, over a day or a date and time alike. Each wears a glyph of the core face drawn for it,
  and *Join* and *Split* trade their plus and columns for the merge and split of two ways.
- **An `object[]` property is the universal array pin** (`array`), which every typed array connects to, rather than an array
  of `any`, which none did.
- **Load image and Save image are `ImageNodes.FileKinds`**, apart from `ImageNodes.Kinds`, which holds the kinds that work a
  picture in the store: the two reach the disk, and a catalogue takes them on purpose, as it takes `UINodeKinds.Files`. **Load
  image refuses a file that is not a picture**, read by its first bytes (PNG, JPEG, GIF, WebP, BMP) rather than by its name.
- **`UINodeImageLimits` bounds what the picture kinds take of the server**: a picture is decoded to at most 50 million pixels
  (`MaxPixels`) and the process decodes two at once (`MaxConcurrentDecodes`), a run past it waiting its turn — each holds several
  full-size bitmaps until it is encoded. A resize decodes a large photograph at the codec's smaller scale where the format allows,
  so the cap bounds what is decoded rather than what the file claims. An application registers its own as a service;
  unregistered, the kinds use the defaults.
- **The memory image store keeps a picture under the hash of what it is.** The same file loaded again, or a node run again on it,
  is one picture at one address, so the nodes below it are handed on from the run cache rather than run and write nothing new.
  `AddGraphImages(maxBytes)` caps it, letting go of the pictures used longest ago; `UINodeImageMemoryStore.Count` says how many it
  keeps.
- **A node that fails forgets its own last run and those of every node above it**, so the next run makes them afresh rather than
  handing the same thing on — a picture a capped store let go is made again after the one run that found it gone.
- **A plan the solver cannot settle says so**: `UIProductionPlanStatus.Unsettled` and the panel's *No plan could be settled for
  these targets* (`ui.graph.plan-unsettled`), where it said *infeasible* — a cost that falls without bound, or a table that
  would not settle, is not a cycle that takes more than it gives. **A source's cost below zero, or not a number, counts as
  one**, on both sides: a source that paid to be taken made the least cost fall without end.
- **A display pin is sent a readable share of its value**: a text past 10 000 characters or a list past 200 entries is cut short
  with what was left out said at its end, a record past 256 KB of JSON — or one that cannot travel as JSON at all, which broke the
  connection it was sent over — is sent as its text. A whole file's text crossed the connection and stood in the page on every
  run.
- **Files in folder takes the file after the one it took last**, in name order, kept in the sheet (`Last`, hidden beside
  *Taken*), so a file added or removed between runs takes none twice and skips none.
- **The wheel zooms a canvas by how far it turned**, so a trackpad's many small steps and a mouse's one notch come to the same zoom
  for the same distance, a flick held to three notches; a turn that is mostly sideways zooms nothing.
- **A drag goes on over a document the server sends mid-drag** rather than over the objects it replaced. A pan or a zoom restyles
  only the grid, not every node of the sheet, and the view is kept in the browser once it rests rather than on every frame; a
  drag's frames build the layered list once a move rather than once a node, count two lanes' crossings once a pair, and tell a
  production sheet's change by its edit count rather than by its document written out as text.
- **The log's buttons and the plan panel's toggle wear the keyboard's focus ring**; a colour alone read as the pointer passing.
- **A canvas is named by its caption** for a screen reader, the viewport that takes the keyboard rather than the box around it.
- **The packages' stylesheets and scripts are served under `/_ne/css/` and `/_ne/js/`** with the framework's own paths (see the
  core's changelog).
- **The nodes demo's page removes its own folder when it goes**, and ends a run under way, so the temporary folder keeps no
  page's leftovers.
- **An edge running level between two cards keeps the middle of both their sides**, the card's other edges fanning out either side
  of it: set apart evenly, a card's three edges and its neighbour's two met at different points, and every straight edge stepped.
- **A panel over a canvas opens none of its menus** — the plan panel, the corner menu, the zoom bar and map, the run panel and the
  log: a right press there is not one on the sheet.
- **The plan's recipes wear what they make** — the product's picture or glyph — as the rows of resources above them do.
- **Counter shows its *Next* and the ranges their *Taken***, each with its reset; `Hidden` on a state is for a kind that keeps
  one out of sight, with the node menu's Reset.
- **A circle lines up by the circle, not by the room its name takes under it.** The layout aligned the middle of each node's
  whole room, so every long edge between circles ran a name's half-height below them and stepped at both ends. A node may say
  where its edges meet it (`LayeredNode.anchor`, and `nodeBox` on the sheet's host); the layout lines those up.
- **An edge's words are HTML over the lines**, a chip each, rather than SVG text: Chrome lays SVG text out for the scale of every
  transform above it and does not lay it out again when the zoom changes, so a label stood at its old place until the edges were
  drawn again.
- **The layered layout sets a node in line with one of what it is joined to**, not half way between two, and a long edge runs
  flat: the straightening is Brandes–Köpf's — the four alignments made, the narrowest of them taken — in place of the median
  method, so a chain reads as one row and a merge lands on one of its inputs' rows.
- **A plan with nothing solved draws an empty sheet** rather than the whole catalogue, which read as a plan; the panel names the
  first target.
- **The plan's picker and panel show a resource's picture** where it has one, the picker at a list row's size.
- **A row of the plan panel naming a recipe drawn on its edges shows it**: its edges are chosen and the resource they run into is
  brought to the middle; the camera used to stay where it was.
- **An entry of the node picker takes one press after a search is typed.** The field's change on losing the focus drew the list
  again under the press, and the entry pressed was gone before its click.
- **The text kinds**: *Join* (values joined by a separator, or set into a template such as `{0} - {1}`), *Split*, *Replace*,
  *Length*, *Contains* and *Change case*, under `Text` in the picker beside *To text*.
- **Range XY and Range XYZ** (`RangeXYNode`, `RangeXYZNode`): every point of a grid or a box, one a run, X fastest — the nested
  counters in one node, ending a run of all after the last point or starting over.
- **A state can be kept out of sight**: `[GraphInput(State = true, Hidden = true)]` draws nothing for the value, and a node whose
  kind keeps a state carries **Reset** in its menu (`UIGraphCommands.ResetState`), which puts every state value back to its
  default as one edit.
- **The documentation is a site of its own**, [akievansdev.github.io/NE.Standard.UI.Graph](https://akievansdev.github.io/NE.Standard.UI.Graph/):
  the node canvas, the ready-made kinds, the canvas, the layered graph, the production graph, and a reference page per
  component read off the code. The README is a short overview that links to it.
- **The common node kinds** (`UINodeKinds.Common`): a number, a text, a date, a yes or no and an image filled in on the node, *To
  text*, *Display*, *Note* and *Delay* (holds the run for the seconds asked, reporting its progress, and passes its value on), in
  the framework's own `ne-` glyphs; *Note* is passed over by a run.
- **`NE.Standard.UI.Graph.Image`, a package of picture kinds worked on the server with SkiaSharp**: *Image size*, *Resize*
  (stretch, contain or cover), *Crop*, *Rotate*, *Flip*, *Greyscale*, *Blur* and *Convert* (PNG, JPEG, WebP), each under
  `Image` in the picker and writing a new picture. They read and keep pictures through the application's `IUINodeImageStore`;
  `services.AddGraphImages()` registers `UINodeImageMemoryStore`, which keeps them in memory and serves them as the content
  provider; `ImageNodes.Kinds` for a catalogue. A picture going out as JPEG is laid on white, JPEG having no transparency.
- **A node can keep a value between runs**: `[GraphInput(State = true)]` is a value the node itself changes as it runs — a
  counter's next value, a place in a list. The runner reports what a run changed (`OnState`, `UINodeRunResult.State`,
  `ApplyState`, `UINodeDocument.WithValue`), a controller sends it back as a committed `SetNodeValueEffect`
  (`Committed = true`: no step to undo, the canvas no dirtier for it), and the node offers a button that puts it back to its
  default — or, for a state kept out of sight, its menu's Reset.
- **Run all**: `UINodeRunner.RunAllAsync(document, maxRuns)` runs a sheet again and again, each run from the state the last
  left, until a sequence node (`IGraphNodeSequence`) has nothing left; a failure in another branch does not stop it. The common
  kinds gain *Counter*, which counts one step further a run and starts over or ends a run of all at its end.
- **The file kinds** (`UINodeKinds.Files`, not among the common ones): *Files in folder* (a folder's files matching a filter,
  one a run), *Read text* and *Write text*; `NE.Standard.UI.Graph.Image` gains *Load image* and *Save image*. A node names a file
  by its path on the server, absolute or relative to `UINodeFiles.BasePath`; what may be read or written is the application's
  own check, `UINodeFiles.Allow(fullPath, access)`, registered with `services.AddGraphFiles(new UINodeFiles { ... })` — with
  none registered, the file kinds reach nothing, and `new UINodeFiles()` alone lets them touch whatever the process may. The
  nodes demo runs a folder of pictures into thumbnails from its canvas's run panel, its check keeping the kinds inside the demo's
  own folder.
- **A run panel and the whole of a run, from the package**: `SetShowRunPanel(true)` puts Run, Run all and Stop in the canvas's
  top corner, as the zoom bar stands in the bottom one. Run and Run all save the sheet under `UIGraphArguments.RunReason` and
  `RunAllReason`; the application's save command (a background one) hands the save to `UINodeRuns.SavedAsync`, which runs the
  sheet, pushes every status, display, log line, progress and state to the canvas and keeps what the runs left on the sheet, and
  `OnStop` → `UINodeRuns.Stop()` ends a run under way. `SetRunningEffect` tells the panel when a run begins and ends. It takes
  the controller's `Context.SendEffectsAsync`, `Context.Runtime.InvokeAsync` and `Context.Services`, so the package needs nothing
  of the Shell; one run goes at a
  time.
- **A node run on the inputs it last ran on is handed on, not run again** (`UINodeRunCache`, `UINodeRunner.Cache`; `UINodeRuns`
  keeps one per canvas): one entry a node, its last run, drawn as *Cached* (`UINodeState.Cached`). A node with state and one
  marked `[GraphNode(AlwaysRuns = true)]` — *Delay*, *Date*, the file kinds — always runs. A chain of picture kinds re-run on the
  same picture writes no new pictures.
- **Stop leaves nothing half done**: the state a run changed is written only when the run is through, so a folder's place moves
  on only for a file whose whole run happened; the node cut short stands idle again and the log says *Stopped*. A node's own
  cancellation (a timeout of its own) fails its branch rather than the run.
- **What a pin takes**: a required number with no wire and no field is missing, as a required text is; an edge into a state, an
  output or a field with no pin feeds nothing.
- **Counter** reaches an end its step lands on however the sum rounds (0.1 three times reaches 0.3), on the same axis a range walks:
  a counter whose step leads away from its end, whose ends are not numbers or that would count past a million values fails
  rather than hand out a value it cannot reach. **Random** mixes its seed (SplitMix64), so neighbouring seeds draw no pattern and
  the numbers are the same on every runtime. **Date** left empty is the day of the run. **Blur**'s radius is how far it reaches
  (a third of it is the Gaussian's sigma).
- **The canvas counts a run's save as landed once the run begins**: the command answers only when the run ends, and the canvas
  showed *Saving…* and held back every save the viewer made for the whole of a Run all. Saves are numbered, so a late answer is
  matched to its own save; a Run queued behind a save is not replaced by an automatic one, and the panel is freed only by its own
  save's answer or the run's end. A stopped run's line says so in the warning colour, and the node cut short stands idle.
- **The node canvas's own fixes**: a press on a wired input let go where it began keeps the wire, its reroutes and its id rather
  than laying a new one; a pointer the browser takes away mid-drag puts a pulled wire back and records what moved; a field shows
  its kind's default only on an input with no wire; an emptied text stays empty rather than showing a default the run does not
  take; a pin shown beside another reads that one's default; a state a run writes updates its own field rather than every node;
  a click that moved nothing no longer saves; a Ctrl band adds to what was chosen; a chosen node that failed wears the failure's
  ring; a node handed on from its last run is edged dotted (*Cached*).
- **The production graph writes its numbers in the page's culture** through the framework's formatting, one precision for a chip
  and a table alike, and reads a typed one by the culture's decimal mark. **Fit never zooms past 100%**, an edge's label moves
  along its edge off a node it would cover, and a target's badge stands on its ring.
- **The planner keeps a build's plan whole** — its period, what it makes least of and what it brings in, beside its targets —
  in its store and in its builds file; a build opened again counted a minute and made least of what is brought in whatever was
  chosen. A target the store would not keep as sent goes back to the canvas as kept. Every add-on demo's sidebar runs the page's
  height with a search, as the framework demo's does.
- **Pictures stand the way their file says** (a phone's photograph taken on its side), in every kind and in *Image size*; a
  picture that would decode to more than `UINodeImageLimits.MaxPixels` is refused before a pixel is allocated.
- **The calculator's choices are enums** — `UICalculatorOperation`, `UIDivisionByZero`, `UIComparison`, `UIMinMax`; *Not equal*,
  *At most* and *At least* are saved as `NotEqual`, `AtMost`, `AtLeast`. *Round* rounds a half away from zero — 2.5 to 3, as a
  calculator does.
- **Counter** takes *Advance* and gives *Wrapped*: one counter's Wrapped into another's Advance is a loop inside a loop, every
  value of the inner one for each value of the outer. **Random** (`RandomNode`) draws a number between two ends, whole or not,
  from a seed the sheet keeps, the seed after a run the same, drawn anew, one more or one less (`UIRandomMode`).
- **A stepped wire turns half way along its own run, and only wires whose uprights would meet are set apart**, in lanes around
  where they would have turned. Wires were bundled by the stretch of the sheet they crossed alone, however far apart they stood,
  so moving one node shifted the turns of wires nowhere near it; now only its own wires move.
- **Arrange widens the gap after a column for the wires leaving it**, a lane apiece and a margin either side, rather than
  squeezing their uprights into one another in a fixed 80 pixels.
- **A field shows its kind's default when the sheet holds no value for it** — a node an application wrote, a field emptied —
  which is what a run takes for it: a counter's step reads 1, not blank. A date defaults to today rather than the calendar's
  first day.
- **A picture's pin is a picture's without an editor**: `[GraphInput(Image = true)]` makes the pin an image pin on a `PinOnly`
  input too, and `[GraphOutput(Image = true)]` makes an output's; the common `ImageNode`'s output is one.
- **The picker's categories fold**: one with others under it stands folded behind a chevron until it is chosen or the chevron is
  pressed, a second press on the chosen one folds it again, and what the viewer unfolded stays so while the page lives.
- **Every node catalogue carries a reroute** (`RerouteNode`, `[GraphNode(Compact = true)]`): a small box a wire is led through, which
  hands on what reaches it to every input wired to it and wears the name and colour of the output feeding it. A wire's right
  button offers *Add reroute* and *Delete*: the edge menu is every canvas's now (`EdgeMenu`, `AddEdgeMenuEntries`), not only
  a layered one's.
- **`GraphComponent` is `LayeredGraphComponent`**, its renderer `LayeredGraphComponentRenderer` and its type key
  `graph.canvas.layered`: *graph* is the package's word for all three canvases, and this one is the graph laid out in layers,
  on `LayeredGraphComponentBase` beside the production graph. Breaking; the package is still pre-release.
- **`NE.Standard.UI.Graph.Calculator`, a package of node kinds**: an operation, rounding, a sum, a clamp, the least or
  most of several, a comparison and a result, each under `Calculator/` in the picker, with `CalculatorNodes.Kinds` for a
  catalogue; the number they work on is the common one (`graph.number`). The node canvas's demo is a demo of its own,
  `DemoApp.Nodes`, on the common kinds and the two packages' alone; `DemoApp.Graph` keeps the planner and the layered graph.
- **The picker's categories nest by their paths**: `Maths/Rounding` stands under `Maths`, and a category chosen shows what
  stands under it too. Choosing *Uncategorized* showed every kind, its key being the one *All* had.
- **A wire let go on the empty sheet opens the picker there**, and the kind chosen takes the wire into its first input that
  accepts its type, or stands unwired where it was dropped if none does.
- **The picker's search stands at the end of its head**, a field of its own width with air between it and the title.
- **A card on a layered graph sets the edges of one side apart along it**, in the order their other ends lie, so no two leave or
  enter at one point and each keeps a lane of its own; stepped edges are bundled into one lane only where they share a point,
  as a circle's do.
- **`AutoSave` saves every edit as it is made**, through the same save Ctrl+S raises, with `UIGraphArguments.AutoSaveReason`
  as its reason — for a page whose document is the application's at once, such as a plan whose targets are a build's goals.
- **A save leaves the canvas clean when a layout placed something after the last edit.** A layered sheet puts a node it had not
  placed into the document as it draws, which the history had not recorded, so the document sent never matched the step it
  was saved as and the canvas stood *unsaved* after the save answered; the history now takes those places into that step.
- **A layered canvas drawn where it has no size — a dialog not open yet, a tab not shown — is laid out once it is shown.** It
  was laid out then and there, with every node measured at nothing, so the nodes stood on one another and the view was fitted
  to a box of no size.
- **The plan panel ends above the zoom bar** rather than pushing the bar aside, so the bar keeps its corner however long the
  plan runs.
- **A layered sheet forgets where it laid a node that leaves.** A node taken out of the bound collection and put back later
  was dropped on the place the last layout had given it, where another node could stand by then; now a place the layout
  chose goes with the node, and one the viewer chose stays in the document.
- **The package checks the plugin contract it was built for.** The framework's client says which contract it implements
  (`GlobalApi.contractVersion`), and the package refuses to register against another one, with an error naming both
  numbers, instead of working in part.
- **Each package brings its namespaces as global usings.** Installing the package is enough to write against it; a
  project that would rather write its own `using` lines sets `NEStandardUIImplicitUsings` to `false`.
- **The demo is a planner built from nothing**: resources with pictures and recipes, and builds, over SQLite; goals
  planned on the server and on the canvas; import and export as files. The layered graph keeps its page.
- The package descriptions name all three components, not the node editor alone.
- **The mirror's demo builds against the framework's packages.** It reached this slice's own namespaces only through
  the monorepo's usings, and this slice's sources wrote `using` lines the framework's packages now bring, which is
  IDE0005; `Directory.Build.targets` travels to the mirror and a package's sources keep their own lines.
- The README's licence link names the mirror, so it resolves on nuget.org too.
- **The packages carry their symbols and sources inside their assemblies**, so a debugger steps into them.


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
  primary, square at both ends, and gone the moment the node stops running. It lies over the body's top padding, so the rows do
  not move when a run begins, and a running node's frame is the theme's primary too. A tall row's pin (a display, a picture)
  stands as far under the node's top as a plain row's, so a wire between two nodes on one grid line runs straight.
- **Every graph document carries a `Key`** (`UIGraphDocument`, `UIProductionDocument`, `UINodeDocument`, `WithKey`): what the
  application calls it, sent back by the canvas as it was given, so a save names the document it was made on. The planner keys
  each build's plan by its id, and an edit made just before a tab switch is saved into the build it was made on rather than the
  one opened after it.
- A document the server sends in the middle of a drag no longer strands it: a group's drag finds its group by id as a node's
  drag does, and goes on over the new document, whose drop saves the move; a wire being pulled is let go, since it holds the
  old sheet's parts.
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

- `LayeredGraphComponent`: the application's own nodes and the links between them, laid out in layers — a layer is a column
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
