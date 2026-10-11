# Changelog

This slice's changelog. It holds only what is not released yet, under `## X.Y.Z` (the tag is `graph/vX.Y.Z`): the release
workflow cuts that section out as the body of the GitHub release (a tag with no section fails the release), and the notes of every
released version live there — https://github.com/AkiEvansDev/NE.Standard.UI.Graph/releases.

## 1.8.0

- **Built on the framework's 1.8.0.** The packages' own content is unchanged.
- The README installs the component into the application's library and its rendering into the web project that hosts it (#164).
- The node canvas demo's controller releases what it owns in `Dispose(bool)`, as the framework now asks.
