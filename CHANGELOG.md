# Changelog — Graph

Each section below becomes the GitHub release body for that tag (`v<version>` in `NE.Standard.UI.Graph`) and is removed from this file after the release is cut.

## 2.14.0

- **Mutual folding of narrow-viewport corner side panels**: `SidePanelFold` coordinates sibling corner panels per graph root and folds an open sibling panel when the opposite corner's panel unfolds on narrow viewports where side panels start folded (`--ui-graph-side-folded`), preventing overlapping corner panels over the sheet.
- Built on the framework's 2.14.0 release.
