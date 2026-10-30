# Changelog

This slice's changelog. It holds only what is not released yet, under `## X.Y.Z` (the tag is `graph/vX.Y.Z`): the release
workflow cuts that section out as the body of the GitHub release (a tag with no section fails the release), and the notes of every
released version live there — https://github.com/AkiEvansDev/NE.Standard.UI.Graph/releases.

## 2.0.0

- **Breaking:** `UIGraphDraft.ApplyTo(nodes, editStructure, colorChoices = null, maxNodes = DefaultMaxNodes)` and
  `UIProductionDraft.ApplyTo(entries, editStructure, mode, colorChoices = null, maxEntries = DefaultMaxEntries)` answer whether the
  draft was applied: refused whole, nothing written, while `EditStructure` is off, under `Mode = Plan`, or past the cap (10 000).
- **Breaking:** a draft writes only what the canvas edits — a node's title, a colour of `ColorChoices` (or one an item already
  wears) and links; a resource's title and colour; a craft's title, colour and amounts (and, for a new recipe, its time). An added
  item keeps its icon, picture, description, badge, tooltip, category, unit or cost only as a copy of an item already there (what
  Duplicate makes). `UIGraphNodeDraft.WriteTo`, `UIResourceDraft.WriteTo` and `UICraftDraft.WriteTo` are internal.
- **Breaking:** `UIGraphNode.Subtitle` is `Description` and `UIGraphNode.Badge` is `BadgeTitle` (and `UIGraphNodeDraft`'s alike), on
  the wire `description` and `badgeTitle`; the card's class `ui-graph__card-subtitle` is `ui-graph__card-description`.
- **Breaking:** `UINodePicture` is `UINodeImage` (wire key `"$image"`, was `"$picture"`), with `UINodeImageJsonConverter`.
- **Breaking:** the canvas's save event is `graph-save` (`GraphEvents.Save`), no longer the plain `save` CodeInput registers too,
  and the canvas's own: a component around the canvas never runs it.
- **Breaking:** a picture pin's upload event is `graph-image-upload` (`GraphEvents.ImageUpload`), no longer the plain
  `image-upload` CodeInput registers too.
- **Breaking:** `UINodeFiles` with no `Allow` refuses every path (was: everything the process may touch); `Allow = (_, _) => true`
  says "everything" on purpose. New `MaxWriteBytes` (64 MB, `DefaultMaxWriteBytes`) beside `MaxReadBytes`. Its refusals throw
  `UINodeFailureException` (were `UnauthorizedAccessException`, `InvalidOperationException`, `IOException`).
- **Breaking:** `UINodeRuns.ShowRunPanel` (default false): a save under a run's reason runs nothing while it is off — set it as the
  view's `SetShowRunPanel` says. New `UINodeRuns.MaxRunTime` (10 min, a run of all as a whole; past it the run ends as a Stop does
  and `UINodeRunOutcome.TimedOut` says so), `MaxNodes`, `MaxTextLength`, `IncludeExceptionDetail`.
- **Breaking:** a node's exception reaches the viewer by its type alone unless it is a `UINodeFailureException` (new; every built-in
  kind fails through it) or the runner's `IncludeExceptionDetail` is on; the whole exception goes to the server's log
  (`ILoggerFactory` from the services the runner is handed). The package now references `Microsoft.Extensions.Logging.Abstractions`.
- **Breaking:** a document's value outside its pin's `MaxLength`, `Min` or `Max` is not set and fails its node in words
  (`UIGraphWords.RunOutOfBounds`, `UINodeInstance.Refusal`), as a missing `Required` one does — unless an edge fills that input,
  whose value the node reads (a pin taking several keeps its typed values, so its refusal holds). `UINodeRunner.MaxNodes` (2 000)
  refuses a larger sheet whole (`UINodeRunResult.Refusal`, `RunTooManyNodes`), which `UINodeRuns` pushes to the canvas:
  `SetRunProgressEffect.Refusal` (new), drawn on the run line as the run's failure; `UINodeRunner.MaxTextLength` (1 000 000) fails a node
  whose text output is longer (`RunTooLong`), and Join and Replace stop before making it (`UINodeRunContext.MaxTextLength`). A Match
  that ran out of time on a text fails at once the next time instead of holding the run another second.
- An application's menu entry is picked as its menu's own event: `OnMenuEntry` (and `OnMenuEntryLiteral`) stands on the item
  templates of the canvas's five menus, and the canvas raises `menu-entry` on the entry itself, so the server runs the command only
  for an entry that menu holds, enabled and shown — a key no entry holds, a disabled entry and a hidden one are refused; a forged
  pick naming one of the canvas's own entries reaches the command, which ignores a key it does not know.
  `IGraphCanvasComponent` gains `NodeMenu`, `GroupMenu` and `EdgeMenu` beside `Menu` and `CanvasMenu`; the canvas itself carries no
  `menu-entry` event.
- `UIProductionPlanner.Solve(entries, request, maxCells = DefaultMaxCells)` answers the new `UIProductionPlanStatus.TooLarge` for a
  plan past a million cells.
- A whole-number pin's editor takes no fraction, an unsigned one no sign (and a floor of 0); a field's refused value
  (`values.isRefused`) is not copied into the document. New `UINodePinTypes.IsUnsigned`; `UIGraphColorChoice.Defaults`.
- The canvas is `role="group"` with `aria-roledescription` ("canvas"), no longer `role="application"`; a node's fold and pin are
  named with the node's name ("Contents of {node}" with `aria-expanded`, "Pin {node}" with `aria-pressed`); a list row's × and a
  parameter row's × are named by their row; a multi-line text, a checkbox, a large picture and every list-row field are named by
  their pin.
- An empty list draws no rows box; the canvas's heavier words take `--ui-text-title-font-weight`.
- The grid's default step is 32 px (`--ui-graph-grid-size: 32`), drawn in two steps on whole pixels — minor lines
  every cell fading out below zoom 0.4 and major lines every four cells — and straight edge pieces meet at right angles without a
  corner notch (`stroke-linecap="square"`).
- `UINodePin.Enabled` disables an input pin's inline editor while an edge feeds that pin; `[GraphInput(Placeholder = ...)]` sets a pin editor's placeholder (`"—"` by default on text and number pins), single-line pin fields wear `UIInputAppearance.Underline`, `UINodeKinds.UtilityColor` (`var(--ui-color-series-8)`) colours the built-in utility kinds, and `UIGraphColorChoice.Defaults` follows the 8-colour `Series` palette.
- `NodesComponent`'s `Add node` picker draws its transient cursor entry with the neutral hover wash (`--ui-wash-hover`) while keeping `--ui-wash-selected` for the active category, and its log toggle and clear controls align cleanly on the bottom bar; `ProductionGraphComponent`'s `Plan` panel highlights clickable target names with a `Ghost` button wash and resource breakdown rows with a full-row hover and keyboard-focus wash.
