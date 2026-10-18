# Changelog

This slice's changelog. It holds only what is not released yet, under `## X.Y.Z` (the tag is `graph/vX.Y.Z`): the release
workflow cuts that section out as the body of the GitHub release (a tag with no section fails the release), and the notes of every
released version live there — https://github.com/AkiEvansDev/NE.Standard.UI.Graph/releases.

## 1.11.0

- **Breaking:** the canvas's corner menu stands in a folding panel over the leading corner, as the plan's panel does over the
  trailing one, instead of the core's folding menu sliding open over the sheet: its switch is the menu's glyph, the sheet's name
  (else the word for the menu) and a chevron, the menu under it; open until the viewer folds it, the fold kept in the browser,
  folded at first on a phone. `Menu` and `AddMenuEntries` are as before; `SheetTitle` is gone, and `SheetName` is a translatable
  `UIPhrase?` component property, set or bound (`SetSheetName`/`BindSheetName`), rather than a string; `ShowMenuButton` is
  `ShowMenuPanel`. Fit keeps the sheet clear of the open panel.
- A chosen node is a 1 px ring in the selection's mark (the primary unless the theme's `SelectionMark` is neutral) 2 px off its
  edge, with a soft glow: its edge, thickened 2 px outward, read too heavy. The edge keeps its own colour now — the plain border, or a failure's, a conflict's or a plan target's — under the ring.
- A node's value compared as text (a switch, *Equals*, a truthy check) is the page's text: a NaN is false and a number keeps
  the page's digits. *Load image* reads a picture's type through the core's `UIPictureTypes`.
- `NodesComponent.NodeCornerRadius` (`SetNodeCornerRadius`/`BindNodeCornerRadius`) sets the corners of the canvas's nodes, as a
  bordered component's `BorderRadius` does: unset the theme's card radius as before, `UICornerRadius.Uniform(0)` square. A node's
  head and its chosen ring follow each corner; a chosen reroute's ring now follows the reroute's smaller corner.
- A chosen node, and so a dragged one, stands over the nodes around it: dropped onto a node drawn after it, it sank under that
  node, its pins and fields covered.
- The node picker opens larger, 50 × 36 rem, still within the window.
- A layered graph's wire being pulled is the node canvas's: a dashed 2 px line in its pin's colour, no longer lit and lifted
  toward white.
- A parameter's name answers the pointer with a Ghost button's wash rather than a link's underline, and has no tooltip.
  **Breaking:** `GraphStrings.ShowNode` is gone.
- Folding the node canvas's log no longer jerks its strip up and down: the strip stays at the foot and the lines slide under it.
- One value per meaning, as the core's: a skipped node, and a pin or a row a pulled link cannot take, step back as far as a node
  off for a run (0.45; 0.55 and the theme's disabled opacity); the map, the run bar and an upload's veil are one glass (85 %); a
  node a pulled link would land on wears a chosen frame's 2 px halo (3 px); a colour swatch's ring
  the border colour; a pin a pulled link can take a slider handle's 22 % halo (25 %); a node's pin firms to 0.7 under the pointer
  (0.8); a node's run line runs on a progress track's 18 % (12 %); the selected words of a name being renamed take the page's 48 % (50 %); a caption
  being edited wears a focused field's edge rather than a halo of its own.
- The sheet's menu has *Add group* on every canvas, after Add node: an empty, unnamed frame with its corner where the menu was
  opened, on the grid, chosen, one step of the undo. `UIGraphCommands.AddGroup`, `UIGraphWords.AddGroup`.
- A group's frame is dragged wider and taller by its bottom-right corner, as a node is, with the node's corner mark: one step of
  the undo, its far corner on the grid while the grid holds; never shorter than its band and a grid step, nor narrower than a
  folded node (120). Sizing a frame moves no node. An empty frame from *Add group* had a fixed size.
- A group's frame, its chosen halo among it, follows the node canvas's `NodeCornerRadius` a corner each, as its nodes do: a square
  sheet's frames were still rounded.
- A node's and a frame's resize corner is six small squares in a stair, as a resizable text area's: the border's colour at rest, lighter
  under the pointer and while it is dragged, rather than two diagonal rules that turned the primary under the pointer and went
  back to the border mid-drag.
- A group's menu on the node canvas has *Disabled*: every node standing inside its frame turned off, or on again when all of
  them are off, as one step of the undo; checked while every one is off, unavailable on a frame with no node in it. Nothing of
  the group is saved: a node moved in later stays as it is.
