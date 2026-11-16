# Changelog — Graph

Each section below becomes the GitHub release body for that tag (`v<version>` in `NE.Standard.UI.Graph`) and is removed from this file after the release is cut.

## 2.10.0

- **Multiline `TextArea` stretch inside growing node editors**: `.ui-graph__editor > .ui-text-area` stretches across `.ui-graph__row--grow` (`--ui-graph-editor-height`) with compact node-sized field padding and `@ui-list-entry-gap` row spacing, eliminating blank vertical dead space above following pins both initially and during node resize.
- **Stable `NE.Standard.UI.Desktop` `2.10.0` host**: `DemoApp.Nodes.Desktop` and `DemoApp.Graph.Desktop` updated to the stable `2.10.0` desktop host.
