// Draws the sheet: an element per item, a frame per group, the edges between them, and the temporary edge while one is being
// pulled; also the geometry the rest of the canvas reads a box or a part's middle off.

import type { PluginEngineContext } from "ne-standard-ui";
import type { EdgeDrawing, Rect } from "./geometry.ts";
import { drawEdge, intersects, pathMiddle } from "./geometry.ts";
import type { CanvasDocument, CanvasItem, Point } from "./canvas-model.ts";
import type { CanvasKind } from "./canvas-kind.ts";
import { EdgeMenuName, GroupMenuName, NodeMenuName } from "./canvas-menus.ts";
import type { CanvasDocumentState } from "./canvas-document.ts";
import type { CanvasSelection } from "./canvas-selection.ts";
import type { CanvasSettings } from "./canvas-settings.ts";
import type { CanvasView } from "./canvas-view.ts";
import { EdgeAttribute, GroupAttribute, ReroutAttribute, RootSelector, SelectedAttribute } from "./canvas-dom.ts";

/** A node's bar stands above it, centred on it. */
const NodeBarAlignment = "center";

const SvgNamespace = "http://www.w3.org/2000/svg";
/** On the root while the pointer rests on an item: every edge but that item's own steps back. */
const FocusClass = "ui-graph--edge-focus";
/** On the parts of an edge that hangs on the item the pointer rests on. */
const RelatedAttribute = "data-ui-graph-related";
// Where along its edge a label may stand, nearest the middle first: the first that covers no node is taken.
const LabelPlaces = [0.5, 0.38, 0.62, 0.26, 0.74];
// The air between two labels a crowded middle sets side by side.
const LabelGap = 4;

export class CanvasRender {
    private readonly context: PluginEngineContext;
    private readonly scene: HTMLElement;
    private readonly nodeLayer: HTMLElement;
    private readonly groupLayer: HTMLElement;
    private readonly edgeLayer: SVGSVGElement;
    private readonly labelLayer: HTMLElement;
    private readonly nodeElements: Map<string, HTMLElement>;
    private readonly documentState: CanvasDocumentState<CanvasDocument>;
    private readonly selection: CanvasSelection;
    private readonly settings: CanvasSettings;
    private readonly view: CanvasView;
    private readonly kind: () => CanvasKind;

    // An item's box can change on its own (an image arrives, text wraps); each drawn item is watched, and its last box kept, to
    // tell a real change from the watcher's first report.
    private readonly nodeWatchers: (() => void)[] = [];
    private readonly nodeBoxes = new Map<string, string>();
    private readonly drawnItems = new Map<string, CanvasItem>();
    // The nodes' boxes as one draw of the edges found them, for its labels to keep off.
    private labelObstacles: Rect[] | null = null;
    private edgesQueued = false;
    // Which item the pointer rests on, and the parts of every drawn edge by its key: what the focus marks, without drawing again.
    private focusItem: string | null = null;
    private readonly edgeParts = new Map<string, Element[]>();
    // The last draw's painted pieces by edge key and source, reused while shape, colour and dashes stand: a drag redraws every edge
    // each frame, and rebuilding an edge's lines is the cost.
    private paintedEdges = new Map<string, PaintedEdge>();

    public constructor(context: PluginEngineContext, scene: HTMLElement, nodeLayer: HTMLElement, groupLayer: HTMLElement, edgeLayer: SVGSVGElement, labelLayer: HTMLElement, nodeElements: Map<string, HTMLElement>, documentState: CanvasDocumentState<CanvasDocument>, selection: CanvasSelection, settings: CanvasSettings, view: CanvasView, kind: () => CanvasKind) {
        this.context = context;
        this.scene = scene;
        this.nodeLayer = nodeLayer;
        this.groupLayer = groupLayer;
        this.edgeLayer = edgeLayer;
        this.labelLayer = labelLayer;
        this.nodeElements = nodeElements;
        this.documentState = documentState;
        this.selection = selection;
        this.settings = settings;
        this.view = view;
        this.kind = kind;
    }

    public draw(): void {
        this.drawGroups();
        this.drawNodes();
        this.view.drawMinimap();
        // Edges are measured off the transformed scene and divided by zoom, so the view must be applied first, or edges draw scaled wrong.
        this.view.applyView();
        this.drawEdges();
    }

    /** Stops every node's size watch; the canvas is leaving the page. */
    public dispose(): void {
        for (const stop of this.nodeWatchers)
            stop();

        this.nodeWatchers.length = 0;
    }

    private drawNodes(): void {
        // A redrawn node is a new element; without hiding it first, a lingering tooltip would hang over where the old node no longer stands.
        this.context.tooltips.hide();

        // The marks go on again at the end: the elements they were on are about to be thrown away.
        const kind = this.kind();
        const drawn = new Set<string>();

        for (const stop of this.nodeWatchers)
            stop();

        this.nodeWatchers.length = 0;
        this.nodeBoxes.clear();
        this.nodeLayer.replaceChildren();
        this.nodeElements.clear();

        this.drawnItems.clear();

        for (const node of kind.items()) {
            const element = kind.renderItem(node);

            this.drawnItems.set(node.id, node);

            if (this.selection.has(node.id))
                element.setAttribute(SelectedAttribute, "");

            element.setAttribute(this.context.names.contextMenuUse, NodeMenuName);

            // The framework draws the bar from the node menu over the node the reader chose, above it; keyed by the node, the bar
            // stands over the node drawn in its place as the document changes.
            if (this.settings.nodeActionBar) {
                element.setAttribute(this.context.names.actionBar, NodeBarAlignment);
                element.setAttribute(this.context.names.actionBarKey, node.id);

                // The bar's "…" opens what the bar does not show, unless the canvas asked for the whole menu there.
                if (!this.settings.nodeActionBarRepeats)
                    element.setAttribute(this.context.names.actionBarRest, "");
            }

            this.nodeLayer.append(element);
            this.nodeElements.set(node.id, element);
            drawn.add(node.id);
        }

        // Groups are chosen by the same ids and drawn apart from the items; one still in the document stays chosen.
        const kept = new Set(drawn);

        for (const group of this.documentState.document.groups)
            kept.add(group.id);

        this.selection.pruneNodes(kept);
        kind.itemsDrawn(drawn);
        this.watchSizes();
        this.markFocus();
    }

    /** The items as they now stand, and a watch on each: an edge ends at a part of one, and the part moves with the item's own box. */
    private watchSizes(): void {
        // Every box first, then every watch: the first report a watch makes is of the box it was given, and that is not a change.
        for (const [id, element] of this.nodeElements)
            this.nodeBoxes.set(id, boxOf(element));

        for (const [id, element] of this.nodeElements)
            this.nodeWatchers.push(this.context.observeSize(element, () => this.nodeResized(id, element)));
    }

    private nodeResized(id: string, element: HTMLElement): void {
        const box = boxOf(element);

        if (this.nodeBoxes.get(id) === box)
            return;

        this.nodeBoxes.set(id, box);

        // Every item has a watch of its own, and one layout pass may grow several: the edges are drawn once after all of them.
        if (this.edgesQueued)
            return;

        this.edgesQueued = true;
        queueMicrotask(() => {
            this.edgesQueued = false;
            this.drawEdges();
            this.view.drawMinimap();
        });
    }

    public drawGroups(): void {
        this.groupLayer.replaceChildren();

        for (const group of this.documentState.document.groups) {
            const element = document.createElement("div");

            element.className = "ui-graph__group";
            element.setAttribute(GroupAttribute, group.id);
            element.style.setProperty("--ui-graph-group-x", String(group.x));
            element.style.setProperty("--ui-graph-group-y", String(group.y));
            element.style.setProperty("--ui-graph-group-width", String(group.width));
            element.style.setProperty("--ui-graph-group-height", String(group.height));

            if (group.color !== null && group.color !== undefined && group.color.length > 0)
                element.style.setProperty("--ui-graph-group-color", group.color);

            if (this.selection.has(group.id))
                element.setAttribute(SelectedAttribute, "");

            if (group.pinned === true)
                element.setAttribute("data-ui-graph-pinned", "");

            // The band is what the group's menu opens on: the frame's inside is the sheet, where a right press still adds a node.
            const band = document.createElement("div");
            const title = document.createElement("span");

            band.className = "ui-graph__group-band";
            band.setAttribute(this.context.names.contextMenuUse, GroupMenuName);
            title.className = "ui-graph__group-title";
            title.textContent = group.title ?? this.context.strings.text("ui.graph.group");
            band.append(title);

            if (group.pinned === true) {
                const mark = document.createElement("span");

                mark.className = "ui-graph__group-pinned";
                mark.setAttribute("aria-hidden", "true");
                this.context.icons.apply(mark, "ne-pin");
                band.append(mark);
            }

            element.append(band);

            this.groupLayer.append(element);
        }
    }

    /** Sets the item the pointer rests on; its own edges stay put while every other steps back, marked on the parts already drawn. */
    public setFocusItem(id: string | null): void {
        if (this.focusItem === id)
            return;

        this.focusItem = id;
        this.markFocus();
    }

    /** The canvas's root, which the layers stand in: the focus class goes there, so the stylesheet can reach every edge at once. */
    private get root(): HTMLElement {
        return this.scene.closest<HTMLElement>(RootSelector)!;
    }

    private markFocus(): void {
        const related = this.focusItem === null ? null : this.kind().related(this.focusItem);
        const edges = related === null ? null : new Set(related.edges);
        const items = related === null ? null : new Set(related.items);

        this.root.classList.toggle(FocusClass, edges !== null && edges.size > 0);

        for (const [id, parts] of this.edgeParts) {
            for (const part of parts)
                part.toggleAttribute(RelatedAttribute, edges !== null && edges.has(id));
        }

        for (const [id, element] of this.nodeElements)
            element.toggleAttribute(RelatedAttribute, items !== null && items.has(id));
    }

    public drawEdges(): void {
        const kind = this.kind();
        const edgeMenu = kind.hasEdgeMenu();

        this.edgeLayer.replaceChildren();
        this.labelLayer.replaceChildren();
        this.edgeParts.clear();
        this.labelObstacles = null;

        // Marks a part as it's made, before it's appended to the sheet — marking after a layout-triggering measure (a label) makes the
        // focused line blink during a drag's redraws.
        const focused = this.focusItem === null ? null : new Set(kind.related(this.focusItem).edges);
        const labels: DrawnLabel[] = [];
        const painted = new Map<string, PaintedEdge>();

        for (const edge of kind.edges()) {
            const ends = kind.edgeEnds(edge);

            if (ends === null)
                continue;

            const parts: Element[] = [];
            const related = focused !== null && focused.has(edge.id);

            this.edgeParts.set(edge.id, parts);

            const color = kind.edgeColor(edge);
            const points = edge.points.length === 0 && ends.via !== undefined ? ends.via : edge.points;
            const drawing = drawEdge(this.settings.edgeShape, ends.from, ends.to, points, { axis: ends.axis, back: ends.back, loop: ends.loop, arrow: ends.arrow, reversed: ends.reversed, turns: edge.points.length === 0 ? ends.turns : undefined });
            const path = document.createElementNS(SvgNamespace, "path");

            path.setAttribute("d", drawing.path);
            path.setAttribute("class", ends.back === true ? "ui-graph__edge ui-graph__edge--back" : "ui-graph__edge");
            path.setAttribute(EdgeAttribute, edge.id);
            path.style.setProperty("--ui-graph-pin-color", color);

            if (this.selection.hasEdge(edge.id))
                path.setAttribute(SelectedAttribute, "");

            if (ends.conflict === true)
                path.setAttribute("data-ui-graph-conflict", "changed");

            if (edgeMenu)
                path.setAttribute(this.context.names.contextMenuUse, EdgeMenuName);

            path.toggleAttribute(RelatedAttribute, related);
            this.edgeLayer.append(path);
            parts.push(path);

            const lineClass = ends.back === true ? "ui-graph__edge-line ui-graph__edge-line--back" : "ui-graph__edge-line";
            const paintedFrom = `${drawing.path}|${color}|${lineClass}`;
            const kept = this.paintedEdges.get(edge.id);
            const line = kept !== undefined && kept.from === paintedFrom ? kept.group : paintedEdge(drawing, color, lineClass);

            painted.set(edge.id, { from: paintedFrom, group: line });
            line.toggleAttribute(SelectedAttribute, this.selection.hasEdge(edge.id));
            line.toggleAttribute(RelatedAttribute, related);
            this.edgeLayer.append(line);
            parts.push(line);

            if (drawing.arrow !== null) {
                const arrow = document.createElementNS(SvgNamespace, "path");

                arrow.setAttribute("d", drawing.arrow);
                arrow.setAttribute("class", "ui-graph__edge-arrow");
                arrow.style.setProperty("--ui-graph-pin-color", color);
                arrow.toggleAttribute(RelatedAttribute, related);
                this.edgeLayer.append(arrow);
                parts.push(arrow);
            }

            if (ends.label !== null && ends.label !== undefined && ends.label.length > 0)
                parts.push(this.drawLabel(path, ends.label, edge.id, edgeMenu, related, labels));

            edge.points.forEach((point, index) => {
                const mark = document.createElementNS(SvgNamespace, "circle");

                mark.setAttribute("class", "ui-graph__reroute");
                mark.setAttribute(ReroutAttribute, edge.id);
                mark.setAttribute("data-ui-graph-reroute-index", String(index));
                mark.setAttribute("cx", String(point.x));
                mark.setAttribute("cy", String(point.y));
                mark.setAttribute("r", "4");
                mark.style.setProperty("--ui-graph-pin-color", color);
                mark.toggleAttribute(RelatedAttribute, related);

                this.edgeLayer.append(mark);
                parts.push(mark);
            });
        }

        this.paintedEdges = painted;
        this.placeLabels(labels);

        // The pointer may already rest on an item: what was marked before this draw is marked again on the parts it made.
        this.markFocus();
    }

    /** Draws an edge's label, words in a chip of their own; it is placed with the rest once every edge is drawn. */
    private drawLabel(path: SVGPathElement, label: string, edgeId: string, edgeMenu: boolean, related: boolean, labels: DrawnLabel[]): HTMLElement {
        const chip = document.createElement("span");

        chip.className = "ui-graph__edge-label";
        chip.setAttribute(EdgeAttribute, edgeId);

        if (edgeMenu)
            chip.setAttribute(this.context.names.contextMenuUse, EdgeMenuName);

        chip.textContent = label;
        chip.toggleAttribute(RelatedAttribute, related);
        this.labelLayer.append(chip);
        labels.push({ chip, path });

        return chip;
    }

    /**
     * Places every label half way along its edge, or near there where the middle would put it on a node or on a label placed before
     * it (two edges between one pair run side by side). Every chip is measured and every place found before any chip moves: a move
     * between two measures would lay the page out once a label.
     */
    private placeLabels(labels: readonly DrawnLabel[]): void {
        // Measured once it stands on the sheet: the scene's zoom is a transform, which leaves a box's own size as it was laid out.
        const sizes = labels.map(({ chip }) => ({ width: chip.offsetWidth, height: chip.offsetHeight }));
        const placed: Rect[] = [];
        const places = labels.map(({ path }, index) => {
            const { width, height } = sizes[index];
            const corner = this.labelPlace(path, width, height, placed);

            if (width > 0)
                placed.push({ ...corner, width, height });

            return corner;
        });

        labels.forEach(({ chip }, index) => {
            chip.style.left = `${places[index].x}px`;
            chip.style.top = `${places[index].y}px`;
        });
    }

    /** A label's corner at the first of its places along its edge where it covers no node and no label placed; nowhere clear, it stands in the middle. */
    private labelPlace(path: SVGPathElement, width: number, height: number, placed: readonly Rect[]): Point {
        const length = path.getTotalLength();

        for (const place of LabelPlaces) {
            const point = place === 0.5 ? pathMiddle(path) : path.getPointAtLength(length * place);
            const corner = { x: point.x - width / 2, y: point.y - height / 2 };
            const box = { ...corner, width, height };

            if (width === 0 || (!this.coversNode(box) && !placed.some(other => intersects(box, other))))
                return corner;
        }

        return this.stepAcross(path, width, height, placed);
    }

    /** Whether a label's box would stand on a node; the nodes' boxes are read once a draw of the edges, not once a label. */
    private coversNode(box: Rect): boolean {
        this.labelObstacles ??= [...this.nodeElements.keys()].map(id => this.nodeRect(id)).filter((rect): rect is Rect => rect !== null);

        return this.labelObstacles.some(rect => intersects(box, rect));
    }

    /**
     * A label nowhere clear along its edge — two short edges between one pair, side by side — stands at the middle, stepped across
     * its edge until it covers no label placed before it: sideways off an edge running up or down, up or down off one running along.
     */
    private stepAcross(path: SVGPathElement, width: number, height: number, placed: readonly Rect[]): Point {
        const length = path.getTotalLength();
        const middle = pathMiddle(path);
        const before = path.getPointAtLength(Math.max(0, length / 2 - 1));
        const after = path.getPointAtLength(Math.min(length, length / 2 + 1));
        const sideways = Math.abs(after.y - before.y) >= Math.abs(after.x - before.x);
        const box = { x: middle.x - width / 2, y: middle.y - height / 2, width, height };

        for (let step = 0; step < placed.length; step++) {
            const other = placed.find(candidate => intersects(box, candidate));

            if (other === undefined)
                break;

            if (sideways)
                box.x = box.x + width / 2 < other.x + other.width / 2 ? other.x - width - LabelGap : other.x + other.width + LabelGap;
            else
                box.y = box.y + height / 2 < other.y + other.height / 2 ? other.y - height - LabelGap : other.y + other.height + LabelGap;
        }

        return { x: box.x, y: box.y };
    }

    /** A temporary edge while one is being pulled: painted only, since nothing answers the pointer on it. */
    public drawPending(from: Point, to: Point, color: string): void {
        this.clearPending();
        this.edgeLayer.append(paintedEdge(drawEdge(this.settings.edgeShape, from, to), color, "ui-graph__edge-line ui-graph__edge-line--pending"));
    }

    public clearPending(): void {
        this.edgeLayer.querySelector(".ui-graph__edge-line--pending")?.remove();
    }

    /** Where the middle of a drawn part sits in canvas coordinates: measured off the page, since an item's height is what its contents make it. */
    public centerOf(element: Element): Point {
        const sceneRect = this.scene.getBoundingClientRect();
        const rect = element.getBoundingClientRect();

        return {
            x: (rect.left + rect.width / 2 - sceneRect.left) / this.view.zoom,
            y: (rect.top + rect.height / 2 - sceneRect.top) / this.view.zoom
        };
    }

    public nodeRect(id: string): Rect | null {
        // The items as the last draw laid them, by id: a drag frame asks for a node's box many times over, and a layered kind's
        // items() builds its list afresh. The objects are the document's own, which a drag moves, so the map stays true.
        const node = this.drawnItems.get(id) ?? this.kind().items().find(candidate => candidate.id === id);
        const element = this.nodeElements.get(id);

        if (node === undefined || element === undefined)
            return null;

        return { x: node.x, y: node.y, width: element.offsetWidth, height: element.offsetHeight };
    }

    /** A node's box plus what it wears outside it, in canvas units — read off the page, so call only where a layout is worth paying for, not every drag frame. */
    public nodeExtent(id: string): Rect | null {
        const rect = this.nodeRect(id);
        const element = this.nodeElements.get(id);

        if (rect === null || element === undefined)
            return rect;

        const own = element.getBoundingClientRect();
        const scale = own.width > 0 && rect.width > 0 ? own.width / rect.width : 1;
        let left = own.left;
        let top = own.top;
        let right = own.right;
        let bottom = own.bottom;

        for (const part of element.querySelectorAll<HTMLElement>("*")) {
            const box = part.getBoundingClientRect();

            if (box.width === 0 || box.height === 0)
                continue;

            left = Math.min(left, box.left);
            top = Math.min(top, box.top);
            right = Math.max(right, box.right);
            bottom = Math.max(bottom, box.bottom);
        }

        return { x: rect.x - (own.left - left) / scale, y: rect.y - (own.top - top) / scale, width: (right - left) / scale, height: (bottom - top) / scale };
    }
}

/** A label drawn and waiting to be placed, with the edge it stands on. */
type DrawnLabel = { readonly chip: HTMLElement; readonly path: SVGPathElement };

/** An edge's painted pieces, and what they were painted from: its path, its colour and its class. */
type PaintedEdge = { readonly from: string; readonly group: SVGGElement };

/**
 * An edge as painted, under one group carrying its class and colour: a `<line>` per straight piece, or the path itself where every
 * step runs along an axis. Each piece's dash offset continues the one before, or every piece would start on a dash.
 */
function paintedEdge(drawing: EdgeDrawing, color: string, className: string): SVGGElement {
    const group = document.createElementNS(SvgNamespace, "g");

    group.setAttribute("class", className);
    group.style.setProperty("--ui-graph-pin-color", color);

    if (drawing.pieces === null) {
        const path = document.createElementNS(SvgNamespace, "path");

        path.setAttribute("d", drawing.path);
        group.append(path);

        return group;
    }

    for (const piece of drawing.pieces) {
        const line = document.createElementNS(SvgNamespace, "line");

        line.setAttribute("x1", coordinate(piece.x1));
        line.setAttribute("y1", coordinate(piece.y1));
        line.setAttribute("x2", coordinate(piece.x2));
        line.setAttribute("y2", coordinate(piece.y2));

        if (piece.along > 0)
            line.setAttribute("stroke-dashoffset", coordinate(piece.along));

        group.append(line);
    }

    return group;
}

/** A coordinate as the markup carries it: two decimals at most, as the edge's path writes its own. */
function coordinate(value: number): string {
    return String(Math.round(value * 100) / 100);
}

function boxOf(element: HTMLElement): string {
    return `${element.offsetWidth}x${element.offsetHeight}`;
}
