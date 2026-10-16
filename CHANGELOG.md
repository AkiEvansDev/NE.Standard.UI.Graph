# Changelog

This slice's changelog. It holds only what is not released yet, under `## X.Y.Z` (the tag is `graph/vX.Y.Z`): the release
workflow cuts that section out as the body of the GitHub release (a tag with no section fails the release), and the notes of every
released version live there — https://github.com/AkiEvansDev/NE.Standard.UI.Graph/releases.

## 1.9.0

- A name the viewer gave a node, a resource, a recipe or a plan, a pin's title and a type's name from the catalogue show in their
  tooltips exactly as written: they were read as inline markup, so brackets or marks in a name changed it. The application's own
  `tooltip` is still markup.
