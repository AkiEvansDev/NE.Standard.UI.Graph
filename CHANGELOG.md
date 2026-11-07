# Changelog

This slice's changelog. It holds only what is not released yet, under `## X.Y.Z` (the tag is `graph/vX.Y.Z`): the release
workflow cuts that section out as the body of the GitHub release (a tag with no section fails the release), and the notes of every
released version live there — https://github.com/AkiEvansDev/NE.Standard.UI.Graph/releases.

## 2.6.0

- Aligned `NodeValueEquality.GetHashCode` with `Equals` for date strings in `LogicNodes`, tracked `holdingValue` across `undo`/`redo` while a save is in flight in `CanvasDocumentState`, cloned array defaults in `resetState` (`nodes-kind.ts`), avoided full canvas redraws when editing a collapsed node's non-visibility pin from the parameters panel, and stripped `?query`/`#fragment` suffixes in `UINodeImageMemoryStore.ReadAsync`.
- Built on the framework's 2.6.0 release.
