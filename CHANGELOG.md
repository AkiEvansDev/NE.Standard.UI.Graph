# Changelog

This slice's changelog. It holds only what is not released yet, under `## X.Y.Z` (the tag is `graph/vX.Y.Z`): the release
workflow cuts that section out as the body of the GitHub release (a tag with no section fails the release), and the notes of every
released version live there — https://github.com/AkiEvansDev/NE.Standard.UI.Graph/releases.

## 1.14.0

- A graph canvas (nodes, layered, production) can stand in a row template: it implements the framework's `IShortcutOwnerComponent`,
  so its Save and Duplicate chords no longer fail the compile there. Built on the framework's 1.14.0.
