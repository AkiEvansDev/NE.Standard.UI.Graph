# Changelog

This slice's changelog. It holds only what is not released yet, under `## X.Y.Z` (the tag is `graph/vX.Y.Z`): the release
workflow cuts that section out as the body of the GitHub release (a tag with no section fails the release), and the notes of every
released version live there — https://github.com/AkiEvansDev/NE.Standard.UI.Graph/releases.

## 1.13.0

- The canvas's events take literal arguments as their other forms take bound ones: `OnSaveLiteral`, `OnMenuEntryLiteral` (in
  place of the entry's key, for menus carrying one entry of the application's), `OnNodeClickLiteral` (for a command that needs no
  item); the run panel's Stop takes arguments too (`OnStop(command, arguments)`, `OnStopLiteral`). A picture pin's upload has no
  literal-only form: its command needs the node, the pin and the upload's selection to answer.
- A canvas's parameters column is a control a link (a card or a surface with `SetUrl`) may not hold — its fields and the names
  that bring a node into view are presses — and the view refuses one when it compiles, as it does a canvas.
