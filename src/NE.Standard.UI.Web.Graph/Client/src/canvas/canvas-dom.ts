// The attribute and selector names the renderer and canvas meet on, so a press can tell what it landed on. Concerns import these
// rather than repeating the literal strings.

export const RootSelector = ".ui-graph";
/** On the root: which kind of canvas the renderer wrote, and so which kind the engine draws it with. */
export const KindAttribute = "data-ui-graph-kind";
export const DocumentAttribute = "data-ui-graph-document";
export const GroupAttribute = "data-ui-graph-group";
export const SelectedAttribute = "data-ui-graph-selected";
export const EdgeAttribute = "data-ui-graph-edge";
export const ReroutAttribute = "data-ui-graph-reroute";
/** On an item's root element: the item's id. */
export const NodeAttribute = "data-ui-graph-node";
/** On the corner an item is dragged larger by. */
export const ResizeAttribute = "data-ui-graph-resize";
/** On an item's own pin mark, which pins it or lets it go on the press. */
export const PinToggleAttribute = "data-ui-graph-pin-toggle";
/** On an item's own fold mark. */
export const FoldAttribute = "data-ui-graph-fold";
/** On a folded item's root element. */
export const CollapsedAttribute = "data-ui-graph-collapsed";
/** On a folding control of the framework's — the corner menu, a side panel — while it stands folded; not an item's own fold. */
export const FoldedControlAttribute = "data-ui-collapsed";
/** On the root: whether the corner map is drawn. */
export const MinimapAttribute = "data-ui-graph-minimap";
/** What a rename field is laid over: an item's title, which a kind draws under this class. */
export const ItemTitleSelector = ".ui-graph__node-title";
