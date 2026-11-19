# Changelog — Graph

Each section below becomes the GitHub release body for that tag (`v<version>` in `NE.Standard.UI.Graph`) and is removed from this file after the release is cut.

## 2.11.1

- **Hover and keyboard focus wash on side panel toggles**: `.ui-graph__menu-panel-toggle` and `.ui-graph__plan-toggle` (`.ui-graph-side-toggle()`) now apply `--ui-wash-hover` on `:hover` and keyboard focus, `--ui-wash-active` on `:active`, inset focus outlines (including `forced-colors: active`), and `overflow: clip` on `.ui-graph-side-panel` so the toggle wash clips cleanly to the panel corners both open and folded.
- Built on the framework's 2.11.1 release.
