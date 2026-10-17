# Changelog

This slice's changelog. It holds only what is not released yet, under `## X.Y.Z` (the tag is `graph/vX.Y.Z`): the release
workflow cuts that section out as the body of the GitHub release (a tag with no section fails the release), and the notes of every
released version live there — https://github.com/AkiEvansDev/NE.Standard.UI.Graph/releases.

## 1.10.0

- **Breaking:** a node canvas's parameters stand beside it, not over it: `NodesParametersComponent` aimed at the canvas with
  `SetCanvas(id)` shows them where the page puts it — a column, a pane the viewer moves. `NodesComponent.ShowParameters` and the
  panel in the canvas are gone; a pin's *Add to parameters* is offered only where such a component is aimed at the canvas.
- A chosen node's edge is 2px thicker, drawn outward in its own colour and dashes, so the node's contents and pins stay put.
- A layered graph's wire pulled to link is clearly visible: 3px, lit, dashed, and lifted toward white on a dark sheet,
  and no longer dimmed by the chosen node's focus.
- A node's menu leads its "…" with *Duplicate* (Ctrl+D, and *Duplicate selection* on the sheet's menu): copies of the chosen
  nodes a step off, an edge between two copies copied and one to a node left behind not — on the production graph, resources only.
- A node's menu has *Disconnect all*, every edge of the chosen nodes taken out (on the production graph, a resource's).
- The node canvas's node menu has *Disabled*: a node turned off is dimmed, saved with the sheet (`UINode.Enabled`), and left out
  of a run by `UINodeCatalog.Materialize` with its edges, so what it fed takes its own value. **Breaking** (binary): `UINode`'s
  constructor takes `enabled` last.
- The node canvas's node menu has *Reset values*: every input of the chosen nodes back to its kind's default, its wires kept.
- `NodesComponent`'s own node entries stand ahead of the rule over Colour, after Duplicate and Disconnect all.
- `NE.Standard.UI.Graph.Image` is on SkiaSharp 4.153.1, and both packages on `Microsoft.Extensions.DependencyInjection.Abstractions`
  10.0.13.
