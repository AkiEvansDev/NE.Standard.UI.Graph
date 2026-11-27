# Changelog — Graph

Each section below becomes the GitHub release body for that tag (`v<version>` in `NE.Standard.UI.Graph`) and is removed from this file after the release is cut.

## 2.15.2

- Scopes the `ui-graph` stylesheet and script bundle per view via `WebPackageClient.AddPackageClient` required component types so pages without `GraphComponent` or `NodeGraphComponent` omit the bundle, and builds on the framework's 2.15.2 release.
