# Changelog — Graph

Each section below becomes the GitHub release body for that tag (`v<version>` in `NE.Standard.UI.Graph`) and is removed from this file after the release is cut.

## 2.12.1

- **Crisp vector node labels across zoom levels**: removed `will-change: transform` from `.ui-graph__scene` and `.ui-graph__grid-lines` and switched `CanvasView.panGrid` overscan to 2D `translate(...)` settled back onto `<path>` attributes on `endGesture()`, keeping `.ui-graph__scene` unpromoted so the browser rasterizes node SVG and DOM text as sharp vectors at the active `scale(...)` with subpixel antialiasing intact instead of stretching a `1x`-locked GPU layer texture or promoting overlapping node cards.
- **Grid-snapped `Arrange` run clearance and `DemoApp.Nodes` sheet layout**: `placeOnGrid` (`separateRunsOnGrid`) now steps lower level-wire runs down by whole grid cells whenever independent grid rounding squeezes vertically adjacent runs in overlapping columns closer than `rowGap` (`32 px`), and all four `DemoApp.Nodes` sheets (`/`, `/calculator`, `/image`, `/all`) are realigned to uniform grid spacing and group margins.
- Built on the framework's 2.12.1 release.
