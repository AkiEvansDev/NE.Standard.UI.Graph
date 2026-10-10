# Changelog

This slice's changelog. It holds only what is not released yet, under `## X.Y.Z` (the tag is `graph/vX.Y.Z`): the release
workflow cuts that section out as the body of the GitHub release (a tag with no section fails the release), and the notes of every
released version live there — https://github.com/AkiEvansDev/NE.Standard.UI.Graph/releases.

## 1.7.2

- On the node canvas, a node dropped within half a grid step of where one of its wires runs level settles there rather than on the
  grid's line, so a place Arrange or the author set level can be reached again by hand.
- A node added on a layered graph, or a resource on a production graph, lands on the grid by its middle once drawn, as one added
  on the node canvas lands by its corner.
- The plugin stylesheet's `@ui-button-live` reads the client's `data-ui-popup-hover` mark rather than a `:has()`.
- The plugin stylesheet's `@ui-field-focus` and `.ui-entry-quiet()` read the client's `data-ui-focus-within` mark rather than a
  `:has()`; `.ui-entry-quiet()` goes on the list or an element below its component root.
- The plugin stylesheet's `@ui-row-live` and `.ui-row-bar()` read the rows' `data-ui-row-idle` and `data-ui-row-bar` marks rather
  than a `:has()`; `.ui-row-bar()` takes no `@bar`.
- A list row's pin beside its head and a display filled by one picture read classes the drawing writes (`ui-graph__row--headed`,
  `ui-graph__display--picture`), not a `:has()`.
- Needs the framework's plugin contract 4.
- The sheet owns its Escape while something stands chosen (`names.ownsKeys`): in a dialog or a drawer, Escape lets go of the choice
  and the next one closes what the canvas stands in.
- A key a field keeps (`shortcuts.isFieldKey`) is the field's on the sheet: Ctrl+C, Ctrl+V, Ctrl+A or Ctrl+Z in a node's field or
  a rename copies, pastes, selects or undoes its text, never the sheet's nodes.
- The picker's Tab goes round it by the framework's modal rule (`focus.trapTab`), its Escape leaves a claimed key alone, and its
  rail's arrows answer plain keys only.
- The component declares that a canvas's save submits its form (`IFormSubmittingComponent`), so a test page sends its held
  value before the command, as the page does (#146).
- A production graph lets go of its watch for a size when it leaves the page, sets a card's edges apart as a layered graph does,
  and a layered graph's node in a shape of its own is laid out with the room its shape takes (#154).
- A card's picture is fetched only by the framework's address rule, as the picker and the plan panel read it (#154).
- Delete, in a node's menu, its action bar and over a selection, is offered only where the graph lets a node go, and a refused
  delete leaves the selection and the document unedited (#154).
- **Breaking:** the sheet's keys match their chords exactly (`shortcuts.matches`): the Windows key no longer stands for Ctrl, and a
  page's Ctrl+Shift+A, or an AltGr letter, is no longer the sheet's; Safari's composing Enter is the input method's in the sheet and the picker (#153, #154).
- A picture pin's file chooser sends only a picture (#154).
- A node canvas opens whole on the first document with a node in it, one pushed after an empty first one too; the zoom buttons
  zoom about the middle of what an open plan panel leaves in view (#154).
- An emptied target amount in the plan panel takes the target off, as the chip over its node does (#154).
- Coloured words spend the inks, the picker's entries take the list's corners, the corner menu wears the framework's popup look,
  and every panel over the sheet hands its ground on to the fields inside (#154).
- A graph's `MinWidth` applies at every tier; its text selection is the framework's, prefixed for Safari (#153).
- On a phone (below 640 px) a node's, a group's and an edge's menu and a pin's choices open as the framework's sheet from the
  bottom, being its context menu and its select; the corner menu folds open as before.
- In a top-to-bottom or bottom-to-top layered or production graph, an edge meeting a circle's bottom ends under its name rather
  than running through it; a circle's name has room for its two lines.
- An edge's caption stands clear of the captions placed before it: two edges between one pair in a vertical layout no longer
  write "keeps" over "names".
- The node picker and the plan's Add target close only on a click pressed on the backdrop, not on one pressed inside and let go
  outside; with nothing matching, the line saying so stands in the list's column, beside the rail.
- The minimap keeps its padding: no box touches its edge or its rounded corners.
- An open side panel's switch (Plan, Parameters) answers the pointer, its chevron's ink coming up as an expander's does.
- The plan panel's target amount is Tonal, as the panel's other fields are.
- Demos: the toolbars' and a lone field's inputs are Tonal (Resources' search, the Graph page's settings and module row, the node
  sheet's Edges); the Resources page's "Made from" canvas keeps its whole height when the panes stack, its row holding its floor.
- On a phone the node picker and Add target fold their categories into one row over the list, naming the chosen one, which a tap
  unfolds; the entries take the whole width. The first entry no longer wears the keyboard's frame on opening, only once typing or
  an arrow puts it there.
- A folded side panel's tooltip (Parameters) speaks through its gear: open, the header shows no tooltip over the run panel, and the
  folded gear keeps it, a keyboard focus included.
- The open corner menu names the sheet beside its switch: `SetSheetName` or `BindSheetName` on every canvas (`SheetName`,
  `SheetTitle`), else the package's word "Sheet" (`UIGraphWords.Sheet`, in Russian and Chinese too). The demos name every canvas.
- The corner menu's switch keeps its square and its corner while the menu opens and folds, its glyph never moving; the sheet's name
  stands the framework's gap past the switch, as beside any folding menu's switch.
