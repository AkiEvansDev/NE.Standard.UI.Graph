# Changelog

This slice's changelog. It holds only what is not released yet, under `## X.Y.Z` (the tag is `graph/vX.Y.Z`): the release
workflow cuts that section out as the body of the GitHub release (a tag with no section fails the release), and the notes of every
released version live there — https://github.com/AkiEvansDev/NE.Standard.UI.Graph/releases.

## 1.5.0

- **A node's fields are Tonal**, the fill alone, as are the node and resource pickers' search and the plan panel's selects: the
  node or the panel frames them.
- **The node sheet's save allows four runs at once** (`[UICommand(MaxConcurrent = 4)]`): the framework now holds a background
  command to one run per runtime by default, and an edit saved while a Run all goes on is a second run of the same command.
- **A double click on a node's name, or on a circle, renames it**, as does F2 on the one chosen node, where renaming is allowed; a
  double click elsewhere on a node no longer opens the node canvas's picker.
- **A name being renamed is selected in a step of its ground's colour** (the node's head, the group's band), not the page's
  brand-coloured selection, and stays where it stood at any zoom; a circle's name stays centred, a long name opens at its start.
- **A chosen node glows**: its own edge in the brand's colour, head and body alike, with a soft glow round it in place of the ring;
  a failed, conflicting or target node keeps its own edge under it. A conflict (dashed, in the warning colour) and a plan's target
  (the accent's purple) are marked on the node's own edge, a target's count badge on the circle's rim; in forced colours each is
  an outline on the edge.
- **`OnNodeClick` reaches the server for a mouse click on a node that can be dragged**: a press let go within 4 px of its place is
  a click, one dragged further is not.
- **A short backward arc is round again**, its top a little lower, rather than peaked.
- **The node picker shows where the keyboard is** with the framework's keyboard frame, on the current entry and on the category;
  the entry the pointer lit keeps its ground alone.
