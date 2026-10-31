# Changelog

This slice's changelog. It holds only what is not released yet, under `## X.Y.Z` (the tag is `graph/vX.Y.Z`): the release
workflow cuts that section out as the body of the GitHub release (a tag with no section fails the release), and the notes of every
released version live there — https://github.com/AkiEvansDev/NE.Standard.UI.Graph/releases.

## 2.1.0

- `[GraphInput(ChoicesKey = "...")]` (`UINodePin.ChoicesKey`) and bindable `PinChoices` (`SetPinChoices` / `BindPinChoices`) on
  `NodesComponent` populate and live-update dropdown input pins at runtime.
- `UINode` unwraps `JsonElement` values on construction when deserializing a `UINodeDocument` from JSON. Built on the framework's
  2.1.0.
