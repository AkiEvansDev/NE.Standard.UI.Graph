# Changelog

This slice's changelog. It holds only what is not released yet, under `## X.Y.Z` (the tag is `graph/vX.Y.Z`): the release
workflow cuts that section out as the body of the GitHub release (a tag with no section fails the release), and the notes of every
released version live there — https://github.com/AkiEvansDev/NE.Standard.UI.Graph/releases.

## 2.1.1

- `NodesComponent` registers item-template bindings for `[GraphInput(ChoicesKey = "...")]` dropdown selects so live `PinChoices`
  pushes update rendered node pin options in place, and clears optional empty-default choices when the offered list changes (#267).
- Validate duplicate and invalid node/pin catalog definitions in `UINodeType` and `NodesComponent`, and harden canvas, layered-sheet
  and production-model state resets and edge cases. Built on the framework's 2.1.1.
