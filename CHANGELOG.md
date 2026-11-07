# Changelog

This slice's changelog. It holds only what is not released yet, under `## X.Y.Z` (the tag is `graph/vX.Y.Z`): the release
workflow cuts that section out as the body of the GitHub release (a tag with no section fails the release), and the notes of every
released version live there — https://github.com/AkiEvansDev/NE.Standard.UI.Graph/releases.

## 2.5.0

- Removed duplicate `margin-right` on colour swatch items (`[data-ui-graph-swatch]::before`) inside node and group context menus so swatch rows use the menu's `8px` flex gap instead of `16px`, and collapsed empty `.ui-graph__editor--list[hidden]`, `.ui-graph__parameters-list:empty`, `.ui-graph__run-label:empty`, and `.ui-graph__run-share:empty` flex children in `NodesComponent` and `NodesParametersComponent`.
