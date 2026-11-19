# Changelog — Graph

Each section below becomes the GitHub release body for that tag (`v<version>` in `NE.Standard.UI.Graph`) and is removed from this file after the release is cut.

## 2.12.0

- **Structural document value equality and unchanged save-echo suppression**: `UINodeDocument`, `UIGraphDocument`, `UIProductionDocument`, and their nested model types now implement `IEquatable<T>` (including deep map/list and cross-numeric comparison on `UINode.Values`), allowing `UIRuntime` to set `ExceptInstanceId` on unchanged `OnSubmit` / `AutoSave` saves so other attached tabs still receive updates while the submitting client avoids redundant document echoes (server-mutated documents in `OnSave` continue to echo).
- **HiDPI touch panning, pinch-zooming, and node-dragging optimizations**: promotes `.ui-graph__scene` and `.ui-graph__grid-lines` (`256 px` integer-snapped overscan translated via `translate3d` without per-frame `<path>` rebuilds) onto composited layers, isolates `.ui-graph__node` with `contain: layout style` and `translate:` positioning (`translate:` on `.ui-graph__group` as well), replaces `.ui-graph--panning .ui-graph__viewport *` restyling with `.ui-graph--panning .ui-graph__scene { pointer-events: none; }`, coalesces two-finger touch pinch moves onto `requestAnimationFrame`, updates single-path `<g class="ui-graph__edge-line">` elements in place during edge redraws, and caches per-gesture/per-draw viewport, minimap, and palette metrics.
- Built on the framework's 2.12.0 release.
