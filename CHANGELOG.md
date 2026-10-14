# Changelog

This slice's changelog. It holds only what is not released yet, under `## X.Y.Z` (the tag is `graph/vX.Y.Z`): the release
workflow cuts that section out as the body of the GitHub release (a tag with no section fails the release), and the notes of every
released version live there — https://github.com/AkiEvansDev/NE.Standard.UI.Graph/releases.

## 1.8.5

- Removing a node or a resource leaves no link or plan target naming its key.
- *Keep mine* on an item the viewer added under a key the server has since taken keeps it as the viewer's own under a fresh key,
  its links, bends, place and plan references moved with it, rather than writing it over the server's item.
- A canvas whose root is put back on the page after it left works again: the same canvas is revived rather than a second one
  answering every gesture twice.
