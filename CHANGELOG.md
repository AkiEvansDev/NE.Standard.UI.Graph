# Changelog

This slice's changelog. It holds only what is not released yet, under `## X.Y.Z` (the tag is `graph/vX.Y.Z`): the release
workflow cuts that section out as the body of the GitHub release (a tag with no section fails the release), and the notes of every
released version live there — https://github.com/AkiEvansDev/NE.Standard.UI.Graph/releases.

## 1.13.1

- An image upload's node, pin, selection and file name (`OnImageUpload`) are offered (#254): a command that takes only what it
  needs is no longer warned of the rest. The entry or node `OnMenuEntry`/`OnNodeClick` pass under the name you give them stay the
  command's own and still warn where no parameter takes them.
