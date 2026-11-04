# Changelog

This slice's changelog. It holds only what is not released yet, under `## X.Y.Z` (the tag is `graph/vX.Y.Z`): the release
workflow cuts that section out as the body of the GitHub release (a tag with no section fails the release), and the notes of every
released version live there — https://github.com/AkiEvansDev/NE.Standard.UI.Graph/releases.

## 2.2.1

- Guard `UINodeCommand.SetParameter` against unknown or read-only parameter keys in `NodesParametersComponent`, and harden graph
  document and production-plan validation. Built on the framework's 2.2.1.
