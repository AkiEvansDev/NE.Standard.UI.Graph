# Changelog — Graph

Each section below becomes the GitHub release body for that tag (`v<version>` in `NE.Standard.UI.Graph`) and is removed from this file after the release is cut.

## 2.9.0

- **Runtime-bound `NodesComponent.BindCatalog` and live `UINodeRuns` catalogues**: `NodesComponent.Catalog` is now bindable (`.BindCatalog(...)`, alongside static `.SetCatalog(...)`), backed by 16 canonical view-compiled editor `<template>` regions (`UIGraphRegions.Editor*`) parameterized on the client from `UINodePin` metadata (`WholeNumber` and `Unsigned` now public on `UINodePin`) so pushing an updated `UINodeCatalog` updates the node picker, parameter inspector, and existing canvas nodes live without recompiling view regions or reloading the page. `UINodeRuns` adds a `Func<UINodeCatalog>` constructor overload and a mutable thread-safe `Catalog` property so background runs materialize against the latest catalogue.
- **Lossless unresolved plugin nodes**: nodes whose `Type` is absent from the active `UINodeCatalog` stay intact on the canvas (`data-ui-graph-missing`) with a localized missing-kind badge (`UIGraphWords.MissingKind`), read-only synthesized `any` wire pins preserving connected edges, and untouched `UINode.Values` across edits, saves, copy/paste, and live `BindCatalog` updates; `UINodeRunner.RunAsync` includes enabled unresolved nodes in topological execution, failing the branch cleanly with `UIGraphWords.RunMissingKind` and marking downstream nodes `Skipped`.
- **Windows `WebView2` desktop demo hosts**: added `DemoApp.Nodes.Desktop` and `DemoApp.Graph.Desktop` alongside the web demos.
