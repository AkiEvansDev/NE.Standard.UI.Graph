// Every canvas on the page: the viewport, items, groups and edges, and the gestures that edit them; nothing reaches the server
// until a save. `Canvas` coordinates the shared state and hands each concern (`CanvasView`, `CanvasDrag`, `CanvasSelection`,
// `CanvasMenus`, `CanvasRender`, `CanvasDocumentState`) what it needs; a `CanvasKind` owns what an item looks like and can do.

import type { EffectContext, PluginEngineContext } from "ne-standard-ui";
import type { CanvasDocument, CanvasGroup, CanvasItem, Point } from "./canvas-model.ts";
import type { CanvasKind, CanvasKindDefinition, KindDrag } from "./canvas-kind.ts";
import { EdgeAttribute, FoldAttribute, GroupAttribute, KindAttribute, NodeAttribute, PinToggleAttribute, ReroutAttribute, ResizeAttribute, RootSelector } from "./canvas-dom.ts";
import { CanvasDocumentState } from "./canvas-document.ts";
import { CanvasDrag } from "./canvas-drag.ts";
import { CanvasMenus, CommandPrefix, MenuAttribute, MenuPanelAttribute } from "./canvas-menus.ts";
import { CanvasRender } from "./canvas-render.ts";
import { CanvasSelection, adds } from "./canvas-selection.ts";
import { CanvasSettings, DirectionAttribute, EdgeShapeAttribute, EditStructureAttribute, ModeAttribute, NodeShapeAttribute, ReadOnlyAttribute, SnapAttribute } from "./canvas-settings.ts";
import { CanvasView } from "./canvas-view.ts";
import { distanceToSegment, snap } from "./geometry.ts";

const MinimapAttribute = "data-ui-graph-minimap";

/** The kind a document patched from the server arrives under, and the kind its value is read back by. */
export const DocumentValueKind = "graph-document";

/** The effect kind a command's request to commit the document travels under. */
export const SaveEffectKind = "graph.save-document";

/** Every canvas under the runtime's root: one `Canvas` per `.ui-graph`, drawn by the kind its root names and addressed by the effects. */
export class GraphEngine {
    private readonly context: PluginEngineContext;
    private readonly kinds = new Map<string, CanvasKindDefinition<CanvasDocument>>();
    private readonly canvases = new WeakMap<HTMLElement, Canvas>();
    // Every live canvas, so one whose root left the page can let its watches go; a WeakMap alone cannot be walked.
    private readonly live = new Set<Canvas>();

    public constructor(context: PluginEngineContext, kinds: readonly CanvasKindDefinition<CanvasDocument>[]) {
        this.context = context;

        for (const kind of kinds)
            this.kinds.set(kind.name, kind);

        this.attach(context.root.querySelectorAll<HTMLElement>(RootSelector));

        // Two observers, not one: a childList watch that also redrew would feed itself; this one only takes up a canvas that just arrived.
        context.observeComponents(context.root, RootSelector, { childList: true }, roots => this.attach(roots));

        // A root that left the page takes its canvas with it; a removal is a childList change above every selector.
        context.observeComponents(context.root, "*", { childList: true }, () => this.prune());

        // The settings, which only the server writes: none of them is an attribute the engine itself touches.
        context.observeComponents(context.root, RootSelector, { attributeFilter: [EdgeShapeAttribute, SnapAttribute, ReadOnlyAttribute, MinimapAttribute, DirectionAttribute, NodeShapeAttribute, EditStructureAttribute, ModeAttribute] }, roots => {
            for (const root of roots)
                this.canvases.get(root)?.draw();
        });

        // A document the server pushed replaces what is on the canvas; the viewer's own edit came through the engine already.
        context.propertyPatchEngine.addValueChangeHandler(change => {
            if (change.local || change.propertyName !== "Value")
                return;

            for (const component of change.components)
                this.canvases.get(component as HTMLElement)?.load(change.value);
        });
    }

    private attach(roots: Iterable<HTMLElement>): void {
        this.prune();

        for (const root of roots) {
            const kind = this.kinds.get(root.getAttribute(KindAttribute) ?? "");

            if (kind !== undefined && !this.canvases.has(root)) {
                const canvas = new Canvas(root, this.context, kind);

                this.canvases.set(root, canvas);
                this.live.add(canvas);
            }
        }
    }

    /** A canvas whose root left the page is disposed: its size watches would otherwise keep the whole canvas alive. */
    private prune(): void {
        for (const canvas of this.live) {
            if (!canvas.connected) {
                this.live.delete(canvas);
                canvas.dispose();
            }
        }
    }

    /** The kind drawing the canvas an effect is addressed to, when it is the kind the effect is for. */
    public kindOf<TKind extends CanvasKind>(component: Element, type: abstract new (...args: never[]) => TKind): TKind | null {
        const kind = this.canvases.get(component as HTMLElement)?.kind;

        return kind instanceof type ? kind : null;
    }

    /** What became of the command a save raised: it is clean only once the server has taken it. */
    public saveCompleted(component: Element, success: boolean): void {
        this.canvases.get(component as HTMLElement)?.documentState.saveCompleted(success);
    }

    /** The save effect: a command asking the canvas to commit what the viewer is looking at, under a reason it names. */
    public requestSave(component: Element, reason: string): void {
        this.canvases.get(component as HTMLElement)?.documentState.requestSave(reason);
    }
}

/** The canvas an effect is addressed to: a component id travels as the number or as the record that holds it. */
export function findCanvas(context: EffectContext, effect: { target?: { id?: unknown; dynamicParameters?: readonly unknown[] } }): Element | null {
    const target = effect.target;

    if (target?.id === undefined)
        return null;

    const id = typeof target.id === "number" ? target.id : Number((target.id as { value?: unknown }).value);

    return Number.isNaN(id) ? null : context.dom.findComponent(id, target.dynamicParameters ?? []);
}

export type Drag =
    | { kind: "pan"; startX: number; startY: number; panX: number; panY: number }
    | { kind: "nodes"; startX: number; startY: number; moving: Map<string, Point> }
    | { kind: "group"; startX: number; startY: number; group: CanvasGroup; origin: Point; moving: Map<string, Point> }
    | { kind: "marquee"; startX: number; startY: number }
    | { kind: "reroute"; edge: string; index: number }
    | { kind: "resize"; nodeId: string; startX: number; startY: number; width: number; height: number }
    | { kind: "map" }
    | KindDrag;

class Canvas {
    private readonly root: HTMLElement;
    private readonly viewport: HTMLElement;
    private readonly groupLayer: HTMLElement;
    private readonly nodeElements = new Map<string, HTMLElement>();

    private readonly settings: CanvasSettings;
    public readonly documentState: CanvasDocumentState<CanvasDocument>;
    private readonly definition: CanvasKindDefinition<CanvasDocument>;
    private readonly selection: CanvasSelection;
    private readonly view: CanvasView;
    private readonly dragging: CanvasDrag;
    private readonly menus: CanvasMenus;
    private readonly render: CanvasRender;
    public readonly kind: CanvasKind;

    private drag: Drag | null = null;
    private pointerX = 0;
    private pointerY = 0;

    public constructor(root: HTMLElement, context: PluginEngineContext, definition: CanvasKindDefinition<CanvasDocument>) {
        this.root = root;
        this.definition = definition;
        this.viewport = root.querySelector<HTMLElement>(".ui-graph__viewport")!;
        this.groupLayer = root.querySelector<HTMLElement>(".ui-graph__groups")!;

        const scene = root.querySelector<HTMLElement>(".ui-graph__scene")!;
        const nodeLayer = root.querySelector<HTMLElement>(".ui-graph__nodes")!;
        const edgeLayer = root.querySelector<SVGSVGElement>(".ui-graph__edges")!;
        const valueElement = root.querySelector<HTMLElement>(".ui-graph__value")!;

        // Every concern reaches the kind through here, lazily: the kind is made last, once everything it is lent stands.
        const host = {
            nodeElements: this.nodeElements,
            kind: () => this.kind,
            items: () => this.kind.items(),
            groups: () => this.documentState.document.groups,
            itemColor: (item: CanvasItem) => this.kind.itemColor(item),
            nodeRect: (id: string) => this.render.nodeRect(id),
            nodeExtent: (id: string) => this.render.nodeExtent(id),
            snapPlace: (id: string, point: Point) => this.dragging.snapPlace(id, point),
            drawEdges: () => this.render.drawEdges(),
            drawGroups: () => this.render.drawGroups(),
            drawMinimap: () => this.view.drawMinimap(),
            deleteSelection: () => this.deleteSelection()
        };

        this.settings = new CanvasSettings(root);
        this.documentState = new CanvasDocumentState(root, valueElement, this.settings, value => definition.readDocument(value), {
            clearSelectionSets: () => this.selection.clearSets(),
            redraw: () => this.render.draw(),
            redrawEdges: () => this.render.drawEdges()
        }, context.values);
        this.selection = new CanvasSelection(root, this.nodeElements, this.groupLayer, host);
        this.view = new CanvasView(root, this.settings, context.store, host);
        this.dragging = new CanvasDrag(this.selection, host, this.settings);
        this.menus = new CanvasMenus(root, context, this.documentState, this.selection, this.view, this.settings, host, this.groupLayer);
        this.render = new CanvasRender(context, scene, nodeLayer, this.groupLayer, edgeLayer, this.nodeElements, this.documentState, this.selection, this.settings, this.view, () => this.kind);
        this.kind = definition.create({
            root,
            context,
            scene,
            nodeLayer,
            settings: this.settings,
            documentState: this.documentState,
            selection: this.selection,
            view: this.view,
            nodeElements: this.nodeElements,
            draw: () => this.render.draw(),
            drawEdges: () => this.render.drawEdges(),
            drawPending: (from, to, color) => this.render.drawPending(from, to, color),
            clearPending: () => this.render.clearPending(),
            nodeRect: id => this.render.nodeRect(id),
            nodeExtent: id => this.render.nodeExtent(id),
            centerOf: element => this.render.centerOf(element),
            pointerScene: () => ({ x: this.pointerX, y: this.pointerY }),
            snapPlace: (id, point) => (this.settings.snapping ? this.dragging.snapPlace(id, point) : point),
            renameItem: id => this.menus.renameNode(id)
        });

        this.view.restoreView();
        this.listen();
        this.render.draw();
    }

    public draw(): void {
        this.render.draw();
    }

    public get connected(): boolean {
        return this.root.isConnected;
    }

    /** Lets go of what would outlive the root: the watch on every node's size. */
    public dispose(): void {
        this.render.dispose();
    }

    public load(value: unknown): void {
        this.documentState.load(this.definition.readDocument(value));
    }

    // --- editing, shared by the keys and the menus -----------------------------------------------------------------------------

    /** A pinned item stays where it is: a drag of the selection around it, an arrange and a group's move all go past it. */
    private togglePinned(nodeId: string | null | undefined): void {
        const node = this.kind.items().find(candidate => candidate.id === nodeId);

        if (node === undefined || this.settings.readOnly)
            return;

        node.pinned = node.pinned !== true;
        this.documentState.edited();
    }

    /** Folded, an item is its head: the body goes and its parts gather on the head's edges, where their edges converge. */
    private toggleCollapsed(nodeId: string | null | undefined): void {
        const node = this.kind.items().find(candidate => candidate.id === nodeId);

        if (node === undefined || this.settings.readOnly)
            return;

        node.collapsed = node.collapsed !== true;
        this.documentState.edited();
    }

    private copy(): void {
        if (this.selection.size > 0)
            this.kind.copy(this.selection.nodeIds);
    }

    private paste(): void {
        if (this.settings.readOnly)
            return;

        const pasted = this.kind.paste();

        if (pasted === null)
            return;

        this.selection.selectOnlyMany(pasted);
        this.documentState.edited();
    }

    private deleteSelection(): void {
        const itemIds = this.selection.nodeIds;
        const edgeIds = this.selection.edgeIds;

        if (this.settings.readOnly || (itemIds.size === 0 && edgeIds.size === 0))
            return;

        const document = this.documentState.document;

        document.groups = document.groups.filter(group => !itemIds.has(group.id));
        this.kind.remove(itemIds, edgeIds);
        this.selection.clearSets();
        this.documentState.edited();
    }

    // --- listening ---------------------------------------------------------------------------------------------------------

    private listen(): void {
        this.viewport.addEventListener("wheel", event => this.wheel(event), { passive: false });
        this.viewport.addEventListener("pointerdown", event => this.pointerDown(event));
        this.viewport.addEventListener("pointermove", event => this.pointerMove(event));
        this.viewport.addEventListener("pointerup", event => this.pointerUp(event));
        this.viewport.addEventListener("pointercancel", () => this.endDrag());
        // The item the pointer rests on: its edges stand out while it does, and nothing stands out while a drag is under way.
        this.viewport.addEventListener("pointerleave", () => this.render.setFocusItem(null));
        this.viewport.addEventListener("dblclick", event => this.doubleClick(event));
        this.viewport.addEventListener("keydown", event => this.key(event));
        this.viewport.addEventListener("click", event => this.click(event));

        this.root.addEventListener("click", event => this.chrome(event));
        // After the framework opens and places the menu — this only covers the keyboard's menu key, since a right press already marked entries.
        this.root.addEventListener("contextmenu", event => this.menus.prepareMenus(event.target));
    }

    private wheel(event: WheelEvent): void {
        // A panel over the sheet scrolls its own lines, and an editor its own list: a wheel over either is not a zoom of the sheet.
        if (event.target instanceof Element && (this.isPanel(event.target) || this.kind.isEditor(event.target)))
            return;

        event.preventDefault();

        const at = this.view.toViewport(event);

        this.view.zoomBy(event.deltaY < 0 ? 1.1 : 1 / 1.1, at.x, at.y);
    }

    private pointerDown(event: PointerEvent): void {
        if (event.button === 2) {
            this.menus.prepareMenus(event.target);
            return;
        }

        if (event.button !== 0 || !(event.target instanceof Element))
            return;

        // An editor's own pointer work is its: the canvas does not drag what the viewer is typing into, nor a select's open list.
        if (isControl(event.target) || this.kind.isEditor(event.target))
            return;

        // A panel stands over the canvas and is not the sheet: a press there selects a line's text, pans nothing.
        if (this.isPanel(event.target))
            return;

        // The map before anything else: it stands over the canvas, and a press on it is a press on the sheet somewhere else.
        if (event.target.closest("[data-ui-graph-map]") !== null) {
            this.drag = { kind: "map" };
            this.viewport.setPointerCapture(event.pointerId);
            this.view.minimapPan(event);

            return;
        }

        const at = this.view.toViewport(event);
        const scene = this.view.toScene(at.x, at.y);

        this.pointerX = scene.x;
        this.pointerY = scene.y;

        // Refusing the browser's own drag (a selection, a dragged-out picture) also refuses the focus it would bring, so the canvas
        // takes the keyboard itself — Delete and Ctrl+S are its own.
        event.preventDefault();
        this.viewport.focus({ preventScroll: true });

        // This runs on the press, not the click, because an item's press captures the pointer to the viewport — a click listener
        // here would never see the head's own controls.
        const toggle = event.target.closest(`[${PinToggleAttribute}]`);

        if (toggle !== null) {
            this.togglePinned(toggle.closest<HTMLElement>(`[${NodeAttribute}]`)?.getAttribute(NodeAttribute));
            return;
        }

        const fold = event.target.closest(`[${FoldAttribute}]`);

        if (fold !== null) {
            this.toggleCollapsed(fold.closest<HTMLElement>(`[${NodeAttribute}]`)?.getAttribute(NodeAttribute));
            return;
        }

        const own = this.kind.pointerDown(event, event.target);

        if (own !== false) {
            if (own !== true) {
                this.drag = own;
                this.viewport.setPointerCapture(event.pointerId);
            }

            return;
        }

        const reroute = event.target.closest<SVGElement>(`[${ReroutAttribute}]`);

        if (reroute !== null && !this.settings.readOnly) {
            this.drag = { kind: "reroute", edge: reroute.getAttribute(ReroutAttribute)!, index: Number(reroute.getAttribute("data-ui-graph-reroute-index")) };
            this.viewport.setPointerCapture(event.pointerId);
            return;
        }

        const nodeElement = event.target.closest<HTMLElement>(`[${NodeAttribute}]`);

        if (nodeElement !== null) {
            if (event.target.closest(`[${ResizeAttribute}]`) !== null && !this.settings.readOnly) {
                this.drag = this.dragging.beginResize(nodeElement, scene);
                this.viewport.setPointerCapture(event.pointerId);
            }
            else {
                this.drag = this.dragging.beginNodeDrag(event, nodeElement.getAttribute(NodeAttribute)!, scene);

                if (this.drag !== null)
                    this.viewport.setPointerCapture(event.pointerId);
            }

            return;
        }

        const groupElement = event.target.closest<HTMLElement>(`[${GroupAttribute}]`);

        if (groupElement !== null && event.target.closest(".ui-graph__group-band") !== null) {
            this.drag = this.dragging.beginGroupDrag(event, groupElement.getAttribute(GroupAttribute)!, scene);

            if (this.drag !== null)
                this.viewport.setPointerCapture(event.pointerId);

            return;
        }

        // A drag begins: nothing stands out while the sheet is being worked on.
        this.render.setFocusItem(null);

        // The background: a held Ctrl (Cmd) draws a band, everything else pans.
        if (adds(event)) {
            this.drag = { kind: "marquee", startX: scene.x, startY: scene.y };
            this.selection.beginMarquee();
        }
        else {
            this.selection.clearSelection();
            this.drag = { kind: "pan", startX: at.x, startY: at.y, panX: this.view.panX, panY: this.view.panY };
        }

        this.viewport.setPointerCapture(event.pointerId);
    }

    private pointerMove(event: PointerEvent): void {
        const drag = this.drag;

        if (drag === null) {
            this.hover(event);
            return;
        }

        const at = this.view.toViewport(event);
        const scene = this.view.toScene(at.x, at.y);

        this.pointerX = scene.x;
        this.pointerY = scene.y;

        switch (drag.kind) {
            case "map":
                this.view.minimapPan(event);
                break;

            case "pan":
                this.view.dragPan({ x: drag.panX, y: drag.panY }, at.x - drag.startX, at.y - drag.startY);
                break;

            // Nothing snaps to the grid while the pointer is down (it would read as a stutter); `settleDrag` grids it once the drag ends.
            case "nodes":
                this.dragging.moveNodes(drag.moving, scene.x - drag.startX, scene.y - drag.startY);
                break;

            case "group":
                this.dragging.moveGroup(drag, scene);
                break;

            case "marquee":
                this.selection.drawMarquee(drag.startX, drag.startY, scene.x, scene.y);
                break;

            case "resize":
                this.dragging.resizeNode(drag.nodeId, drag.width + (scene.x - drag.startX), drag.height + (scene.y - drag.startY));
                break;

            case "reroute":
                this.updateReroute(drag, scene);
                break;

            case "kind":
                drag.move(scene, event);
                break;
        }
    }

    /** What the pointer rests on, told to the render where the canvas asks for it: the item's line stands out, every other steps back. */
    private hover(event: PointerEvent): void {
        const node = this.settings.highlightOnHover && event.target instanceof Element ? event.target.closest<HTMLElement>(`[${NodeAttribute}]`) : null;

        this.render.setFocusItem(node?.getAttribute(NodeAttribute) ?? null);
    }

    private pointerUp(event: PointerEvent): void {
        const drag = this.drag;

        if (drag === null)
            return;

        if (drag.kind === "kind")
            drag.finish(event);

        this.endDrag();

        if (drag.kind === "nodes" || drag.kind === "group" || drag.kind === "reroute" || drag.kind === "resize") {
            this.settleDrag(drag);
            this.documentState.edited(false);
        }
    }

    /** Where a drag leaves what it moved: the grid takes hold as the pointer lets go, never while the hand is still moving. */
    private settleDrag(drag: Drag): void {
        if (!this.settings.snapping)
            return;

        switch (drag.kind) {
            case "nodes":
                this.dragging.snapNodes(drag.moving.keys());
                break;

            case "group":
                this.dragging.settleGroup(drag);
                break;

            case "reroute":
                this.settleReroute(drag);
                break;

            case "resize":
                this.dragging.snapSize(drag.nodeId);
                this.view.drawMinimap();
                break;

            default:
                return;
        }

        this.render.drawEdges();
    }

    private endDrag(): void {
        const drag = this.drag;

        this.drag = null;

        if (drag?.kind === "kind")
            drag.end();

        this.selection.hideMarquee();
        this.render.clearPending();
    }

    // --- reroute points --------------------------------------------------------------------------------------------------------

    private updateReroute(drag: Extract<Drag, { kind: "reroute" }>, scene: Point): void {
        const edge = this.kind.edges().find(candidate => candidate.id === drag.edge);

        if (edge !== undefined && edge.points[drag.index] !== undefined) {
            edge.points[drag.index] = { x: scene.x, y: scene.y };
            this.render.drawEdges();
        }
    }

    private settleReroute(drag: Extract<Drag, { kind: "reroute" }>): void {
        const point = this.kind.edges().find(candidate => candidate.id === drag.edge)?.points[drag.index];

        if (point !== undefined) {
            point.x = snap(point.x, this.settings.gridSize, true);
            point.y = snap(point.y, this.settings.gridSize, true);
        }
    }

    /** A reroute point goes in where it was dropped, between the two it lies nearest. */
    private addReroute(edgeId: string, at: Point): void {
        const edge = this.kind.edges().find(candidate => candidate.id === edgeId);
        const ends = edge === undefined ? null : this.kind.edgeEnds(edge);

        if (edge === undefined || ends === null)
            return;

        const stops = [ends.from, ...edge.points, ends.to];
        let best = 0;
        let closest = Number.POSITIVE_INFINITY;

        for (let index = 1; index < stops.length; index++) {
            const distance = distanceToSegment(at, stops[index - 1], stops[index]);

            if (distance < closest) {
                closest = distance;
                best = index - 1;
            }
        }

        edge.points.splice(best, 0, { x: snap(at.x, this.settings.gridSize, this.settings.snapping), y: snap(at.y, this.settings.gridSize, this.settings.snapping) });
        this.documentState.edited(false);
    }

    // --- clicks ------------------------------------------------------------------------------------------------------------

    private click(event: MouseEvent): void {
        if (!(event.target instanceof Element))
            return;

        const edge = event.target.closest<SVGElement>(`[${EdgeAttribute}]`);

        if (edge !== null) {
            this.selection.toggleEdge(edge.getAttribute(EdgeAttribute)!, adds(event));
            this.render.drawEdges();
            return;
        }

        // A click in an editor is the editor's; an item's own click is its head, its body and its labels.
        const node = event.target.closest<HTMLElement>(`[${NodeAttribute}]`);

        if (node !== null && !isControl(event.target) && !this.kind.isEditor(event.target))
            this.raiseNodeClick(node.getAttribute(NodeAttribute)!);
    }

    /** An item's click reaches the server with the item's id as the command's key. */
    private raiseNodeClick(nodeId: string): void {
        this.root.dispatchEvent(new CustomEvent("node-click", { bubbles: true, detail: { nodeId } }));
    }

    private doubleClick(event: MouseEvent): void {
        if (this.settings.readOnly || !(event.target instanceof Element))
            return;

        const edge = event.target.closest<SVGElement>(`[${EdgeAttribute}]`);

        if (edge !== null) {
            const at = this.view.toViewport(event);

            this.addReroute(edge.getAttribute(EdgeAttribute)!, this.view.toScene(at.x, at.y));
            return;
        }

        // The canvas's chrome stands over the sheet: two quick presses on a zoom button are two zooms, not a request for an item.
        if (this.isPanel(event.target) || event.target.closest(`[${NodeAttribute}], [${GroupAttribute}], .ui-graph__corner`) !== null)
            return;

        this.kind.backgroundDoubleClick();
    }

    // --- the keyboard ------------------------------------------------------------------------------------------------------

    private key(event: KeyboardEvent): void {
        if (event.defaultPrevented || event.isComposing)
            return;

        // A key typed into an editor is the editor's, except the save, which is the canvas's wherever the focus is.
        const typing = event.target instanceof Element && (event.target.closest("input, textarea, select") !== null || this.kind.isEditor(event.target));
        const command = event.ctrlKey || event.metaKey;

        if (command && !event.altKey && !event.shiftKey && event.code === "KeyS") {
            event.preventDefault();
            this.documentState.save();
            return;
        }

        if (typing)
            return;

        if (event.key === "Delete" || event.key === "Backspace") {
            event.preventDefault();
            this.deleteSelection();
        }
        else if (command && event.code === "KeyC") {
            event.preventDefault();
            this.copy();
        }
        else if (command && event.code === "KeyV") {
            event.preventDefault();
            this.paste();
        }
        else if (command && event.code === "KeyZ" && !event.shiftKey) {
            event.preventDefault();
            this.replay(this.documentState.undo());
        }
        else if (command && (event.code === "KeyY" || (event.code === "KeyZ" && event.shiftKey))) {
            event.preventDefault();
            this.replay(this.documentState.redo());
        }
        else if (command && event.code === "KeyA") {
            event.preventDefault();
            this.selection.selectAll(this.kind.items().map(node => node.id));
        }
        else if (event.key === "Escape") {
            this.kind.escape();
            this.selection.clearSelection();
        }
    }

    /** Something standing over the sheet rather than on it: the corner menu, or one of the kind's own panels. */
    private isPanel(target: Element): boolean {
        return standsOver(target) || this.kind.isPanel(target);
    }

    private replay(document: CanvasDocument | null): void {
        if (document !== null)
            this.documentState.replay(document);
    }

    // --- the commands ------------------------------------------------------------------------------------------------------

    /** A click anywhere in the canvas's chrome: the menu button, the zoom bar's buttons, the kind's own panels, and the menu entries. */
    private chrome(event: MouseEvent): void {
        if (!(event.target instanceof Element))
            return;

        // The framework's engine slides the corner menu; what its entries say is brought up to date as it goes.
        if (this.menus.panelToggleOf(event.target) !== null) {
            this.menus.syncMenus();
            return;
        }

        if (this.kind.chrome(event.target))
            return;

        if (event.target.closest("[data-ui-graph-zoom-in]") !== null) {
            this.view.zoomBy(1.2, this.viewport.clientWidth / 2, this.viewport.clientHeight / 2);
            return;
        }

        if (event.target.closest("[data-ui-graph-zoom-out]") !== null) {
            this.view.zoomBy(1 / 1.2, this.viewport.clientWidth / 2, this.viewport.clientHeight / 2);
            return;
        }

        if (event.target.closest("[data-ui-graph-fit]") !== null) {
            this.view.fit();
            return;
        }

        const entry = event.target.closest<HTMLElement>("[data-ui-key]");
        const key = entry?.getAttribute("data-ui-key") ?? "";

        const panel = event.target.closest<HTMLElement>(`[${MenuPanelAttribute}]`);

        // An entry of the corner menu, the application's own among them, folds the menu back once it is pressed.
        if (panel !== null && entry !== null)
            this.menus.foldPanel();

        if (key.length === 0 || (panel === null && event.target.closest(`[${MenuAttribute}]`) === null))
            return;

        const menuName = panel?.getAttribute(MenuPanelAttribute) ?? entry!.closest<HTMLElement>(`[${MenuAttribute}]`)?.getAttribute(MenuAttribute) ?? "";

        // The canvas's own entries are done here; one of the application's is told to it, with what the menu was opened on.
        if (key.startsWith(CommandPrefix))
            this.menus.run(key, menuName);
        else
            this.menus.raiseEntry(key, menuName);
    }
}

/** The corner menu, or a panel of the kind's, standing over the sheet. */
function standsOver(target: Element): boolean {
    return target.closest(`[${MenuPanelAttribute}]`) !== null;
}

/** A control of its own under the press — a field, a button — other than an item's own pin and fold marks, which the canvas answers. */
function isControl(target: Element): boolean {
    const control = target.closest("input, textarea, select, button");

    return control !== null && !control.matches(`[${PinToggleAttribute}], [${FoldAttribute}]`);
}
