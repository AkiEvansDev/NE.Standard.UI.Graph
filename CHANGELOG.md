# Changelog — Graph

Each section below becomes the GitHub release body for that tag (`v<version>` in `NE.Standard.UI.Graph`) and is removed from this file after the release is cut.

## 2.13.2

- **Incremental keyed node reconciliation**: `CanvasRender.reconcileNodes` and `NodesKind` (`itemSignature`, `updateItemInPlace`, `itemsRedrawn`) now re-render only structurally changed nodes on edits while preserving sibling node DOM elements, inline editors, cached `pinOffsets`, and run status/display state (`NodesLog.reapplyToNodes`).
- **Debounced `AutoSave` and in-memory live document value**: `CanvasDocumentState` coalesces `AutoSave` edits over `400 ms` (flushed immediately on explicit save, `requestSave`, outside `pointerdown`, `pagehide`, and connected `dispose`) and serves `graph-document` values from memory (`readLiveDocumentValue` / `setLiveDocumentValue`) instead of rewriting multi-kilobyte `data-ui-graph-document` attributes on every save.
- **Composited pinch-zoom SVG grid, menu entry caching, and touch-friendly `Picker`**: `CanvasView.pinchGrid` scales and translates the overscanned SVG grid in 2D during two-finger pinch gestures without rebuilding `<path d>` geometry per frame and defers `keepView` timer writes until `endGesture`; `canvas-menus` caches menu entry lookups and skips unchanged attribute/style mutations; `Picker` caches rendered option buttons, tracks `currentEntry` in `O(1)`, and keeps focus on the `<dialog>` when opened by touch so tablet virtual keyboards stay closed until the search field is tapped.
- Built on the framework's 2.13.2 release.
