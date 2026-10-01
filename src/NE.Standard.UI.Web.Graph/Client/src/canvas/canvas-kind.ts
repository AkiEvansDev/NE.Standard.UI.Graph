// What a kind of canvas brings to the core: its document, item and edge appearance, and its own part presses. The core keeps
// the view, selection, drags, groups, history, save and menus, and lends them to a kind through `CanvasServices`.

import type { PluginEngineContext } from "ne-standard-ui";
import type { CanvasDocumentState } from "./canvas-document.ts";
import type { CanvasItem, CanvasEdge, CanvasDocument, Point } from "./canvas-model.ts";
import type { CanvasSelection } from "./canvas-selection.ts";
import type { CanvasSettings } from "./canvas-settings.ts";
import type { CanvasView } from "./canvas-view.ts";
import type { EdgeAxis, Rect } from "./geometry.ts";

/** A gesture a kind runs itself, begun on a press on one of its own parts and handed every move until the pointer lets go. */
export type KindDrag = {
    readonly kind: "kind";
    move(scene: Point, event: PointerEvent): void;
    /** The pointer let go: the drag's own edit, if it makes one. */
    finish(event: PointerEvent): void;
    /** The browser took the pointer away: whatever the drag took out of the document goes back, as though it never began. */
    cancel?(): void;
    /** The drag is over, finished or cancelled: whatever it marked on the canvas while it lasted goes. */
    end(): void;
};

/** Where an edge runs and how it is drawn there. */
export type EdgeEnds = {
    readonly from: Point;
    readonly to: Point;
    /** Which way the edge leaves and enters; sideways unless the kind says otherwise. */
    readonly axis?: EdgeAxis;
    /** An edge running against the layers: dashed, and arced beside its ends. */
    readonly back?: boolean;
    /** A backward edge from a node to itself: its arc rises over the node, from the side it leaves by to the side it enters by. */
    readonly loop?: boolean;
    /** Whether the edge wears an arrow's head at its end. */
    readonly arrow?: boolean;
    /** The thing the edge draws was moved under the viewer's own change to it: the edge is marked as an item would be. */
    readonly conflict?: boolean;
    /** What the edge says, half way along it. */
    readonly label?: string | null;
    /** Points the kind routes the edge through while the viewer has bent it through none of their own. */
    readonly via?: readonly Point[];
    /** The edge runs towards its axis's start: the layers of its sheet run right to left, or bottom to top. */
    readonly reversed?: boolean;
    /** Where each leg of the edge turns when it is drawn stepped, along its axis — through `via`, so not for an edge the viewer bent. */
    readonly turns?: readonly (number | undefined)[];
};

/** What a menu was opened on: a node, a group's band, or an edge. */
export type MenuTarget = { readonly kind: "node" | "group" | "edge"; readonly id: string };

/** What the core lends a kind: the canvas's parts, its state, and the redraws a kind's own edit asks for. */
export type CanvasServices<TDocument extends CanvasDocument> = {
    readonly root: HTMLElement;
    readonly context: PluginEngineContext;
    readonly scene: HTMLElement;
    readonly nodeLayer: HTMLElement;
    readonly settings: CanvasSettings;
    readonly documentState: CanvasDocumentState<TDocument>;
    readonly selection: CanvasSelection;
    readonly view: CanvasView;
    readonly nodeElements: ReadonlyMap<string, HTMLElement>;
    draw(): void;
    drawEdges(): void;
    drawPending(from: Point, to: Point, color: string): void;
    clearPending(): void;
    nodeRect(id: string): Rect | null;
    /** A node's box plus whatever it wears outside it (a name, a chip), read off the page — not on a drag's hot path. */
    nodeExtent(id: string): Rect | null;
    /** The middle of an element, in canvas units: where an edge that reaches it ends. */
    centerOf(element: Element): Point;
    /** The canvas point the pointer last stood at — where an added item lands. */
    pointerScene(): Point;
    /** Where the grid puts an item at a point — by corner or middle, per the kind — or the point itself when the grid is off. */
    snapPlace(id: string, point: Point): Point;
    /** The framework's rename field over an item's title, as its menu's Rename opens it. */
    renameItem(id: string): void;
};

/** One kind of canvas, created once the core stands; every member is asked for by the core, never cached by it. */
export type CanvasKind = {
    /** Every item on the sheet, in drawing order; the objects are the document's own, so moving one moves it in the document. */
    items(): readonly CanvasItem[];
    edges(): readonly CanvasEdge[];
    renderItem(item: CanvasItem): HTMLElement;
    /** Every item has just been drawn afresh: what the kind paints over a drawn item — a state, a display — goes on again. */
    itemsDrawn(drawn: ReadonlySet<string>): void;
    /** The page's words changed, just before the sheet is drawn again: a panel the kind draws itself forgets what it last drew. */
    wordsChanged?(): void;
    /** The colour an item wears on the map. */
    itemColor(item: CanvasItem): string;
    /** Where an edge starts and ends and how it is drawn, or nothing while either end is not drawn. */
    edgeEnds(edge: CanvasEdge): EdgeEnds | null;
    /** What stands with one item, which alone keeps its colour while the pointer rests on it: its neighbours, or the whole line it stands on, as the kind decides. */
    related(itemId: string): { readonly edges: readonly string[]; readonly items: readonly string[] };
    edgeColor(edge: CanvasEdge): string;
    /** An editor inside an item, whose presses, wheel and keys are its own. */
    isEditor(target: Element): boolean;
    /** A panel of the kind's standing over the sheet — a log, a progress line — which is not the sheet. */
    isPanel(target: Element): boolean;
    /** A press on the sheet, before the core's own: a drag of the kind's, `true` for a press it answered, `false` to let it through. */
    pointerDown(event: PointerEvent, target: Element): KindDrag | boolean;
    /** A click on the canvas's chrome the core does not answer — a panel's own buttons. */
    chrome(target: Element): boolean;
    /** Two presses on the empty sheet. */
    backgroundDoubleClick(): void;
    escape(): void;
    copy(ids: ReadonlySet<string>): void;
    /** What the last copy became once pasted, by the new items' ids; nothing when there was nothing to paste. */
    paste(): readonly string[] | null;
    /** The chosen items and edges taken out of the document, and whatever of the kind's own hangs on them. */
    remove(itemIds: ReadonlySet<string>, edgeIds: ReadonlySet<string>): void;
    /** Where Arrange puts each moving item, by id. */
    arrange(sizes: ReadonlyMap<string, { width: number; height: number }>, only: ReadonlySet<string> | undefined): Map<string, Point>;
    /** A menu entry of the kind's own, with what the menu was opened on; `false` for a key it does not know. */
    runCommand(key: string, target: MenuTarget | null): boolean;
    /** Whether an item's own name and colour may be changed from its menu, beside its pin, which is the layout's. */
    canEditItems(): boolean;
    /** An item renamed from its menu: `true` when the kind keeps the name itself, `false` for the core to write it on the item. */
    renameItem(id: string, title: string | null): boolean;
    /** An item given a colour from its menu: `true` when the kind keeps it itself, `false` for the core to write it on the item. */
    paintItem(id: string, color: string | null): boolean;
    /** Whether the grid snaps an item by its middle rather than its corner; a line of differently-sized nodes needs middles snapped to keep the line. */
    readonly snapsByCenter?: boolean;
    /** Whether a right press on an edge opens the canvas's edge menu. */
    hasEdgeMenu(): boolean;
    /** The kind's own menu entries as the canvas stands now, with what the menu about to show was opened on. */
    syncMenus(editable: boolean, target: MenuTarget | null): void;
    /** The command a save raised has answered, with what the save was for; a kind that waits on a save — a run panel — hears it here. */
    saveCompleted?(success: boolean, reason: string): void;
};

/** A kind as the engine registers it: its name on the root, how its document is read, and how it is made once the core stands. */
export type CanvasKindDefinition<TDocument extends CanvasDocument> = {
    readonly name: string;
    readDocument(value: unknown): TDocument;
    create(services: CanvasServices<TDocument>): CanvasKind;
};
