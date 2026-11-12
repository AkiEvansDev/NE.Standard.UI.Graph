# Changelog — Graph

Each section below becomes the GitHub release body for that tag (`v<version>` in `NE.Standard.UI.Graph`) and is removed from this file after the release is cut.

## 2.7.0

- **Breaking:** targets `.NET 11` (`net11.0`; building requires the `.NET 11` SDK), with `SkiaSharp` updated to `4.156.0` on `NE.Standard.UI.Graph.Image`.
- **Breaking:** choice, enum, `ChoicesFrom` and `ChoicesKey` `[GraphInput]` parameters carry no wireable input pin by default (`HasPin = false`) unless `HasPin = true` (or `PinOnly`, `Display`, or `Multiple`) is set; `PinOnly` inputs ignore literal entries in `UINode.Values`; out-of-set choice values (literal or wired) fail the node with `RunOutOfBounds`; and `UINodeCatalog.Materialize` accepts optional runtime `pinChoices` (`UINodeRunner.PinChoices` / `UINodeRuns.PinChoices`).
- Added JSON element/depth bounds (`1024` elements, depth `16`) on `UINode.Values`, pre-write `MaxTextLength` checks in `WriteTextNode`, non-finite and overflow guards in `RandomNode`, `GraphCanvasComponentBase` and `UIProductionPlanner` (returning `Unsettled` instead of `NaN`/`Infinity`), and cryptographic `HMACSHA256` keys plus single-entry `MaxBytes` checks in `UINodeImageMemoryStore`.
- Reused SVG edge and minimap DOM elements across redraws, coalesced pointer drags onto `requestAnimationFrame`, gated grid snapping and undo recording on pointer movement past click slop so clicking an off-grid node never shifts it, lifted opaque `ProductionGraphComponent` resource badges clear above circle borders, added bottom resize-grip clearance on resizable nodes, fixed planner focus-ring clipping in `DemoApp.Graph`, and improved node-picker `Escape` handling and accessible labels.
- Built on the framework's 2.7.0 release.
