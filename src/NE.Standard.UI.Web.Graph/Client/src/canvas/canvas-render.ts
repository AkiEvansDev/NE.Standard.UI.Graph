// Draws the sheet: an element per item, a frame per group, the edges between them, and the temporary edge while one is being
// pulled; also the geometry the rest of the canvas reads a box or a part's middle off.

import type { PluginEngineContext } from "ne-standard-ui";
import type { Rect } from "./geometry.ts";
import { drawEdge, edgePath } from "./geometry.ts";
import type { CanvasDocument, Point } from "./canvas-model.ts";
import type { CanvasKind } from "./canvas-kind.ts";
import { EdgeMenuName, GroupMenuName, MenuUseAttribute, NodeMenuName } from "./canvas-menus.ts";
import type { CanvasDocumentState } from "./canvas-document.ts";
import type { CanvasSelection } from "./canvas-selection.ts";
import type { CanvasSettings } from "./canvas-settings.ts";
import type { CanvasView } from "./canvas-view.ts";
import { EdgeAttribute, GroupAttribute, ReroutAttribute, RootSelector, SelectedAttribute } from "./canvas-dom.ts";

const SvgNamespace = "http://www.w3.org/2000/svg";
/** On the root while the pointer rests on an item: every edge but that item's own steps back. */
const FocusClass = "ui-graph--edge-focus";
/** On the parts of an edge that hangs on the item the pointer rests on. */
const RelatedAttribute = "data-ui-graph-related";
/** How far in from an edge's end a label of that end stands: clear of the node, and still plainly its. */
/** The air between an edge label's words and the chip they stand in. */
const LabelPadding = 4;

export class CanvasRender {
    private readonly context: PluginEngineContext;
    private readonly scene: HTMLElement;
    private readonly nodeLayer: HTMLElement;
    private readonly groupLayer: HTMLElement;
    private readonly edgeLayer: SVGSVGElement;
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
    private edgesQueued = false;
    // Which item the pointer rests on, and the parts of every drawn edge by its key: what the focus marks, without drawing again.
    private focusItem: string | null = null;
    private readonly edgeParts = new Map<string, SVGElement[]>();

    public constructor(
        context: PluginEngineContext,
        scene: HTMLElement,
        nodeLayer: HTMLElement,
        groupLayer: HTMLElement,
        edgeLayer: SVGSVGElement,
        nodeElements: Map<string, HTMLElement>,
        documentState: CanvasDocumentState<CanvasDocument>,
        selection: CanvasSelection,
        settings: CanvasSettings,
        view: CanvasView,
        kind: () => CanvasKind
    ) {
        this.context = context;
        this.scene = scene;
        this.nodeLayer = nodeLayer;
        this.groupLayer = groupLayer;
        this.edgeLayer = edgeLayer;
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

        for (const node of kind.items()) {
            const element = kind.renderItem(node);

            if (this.selection.has(node.id))
                element.setAttribute(SelectedAttribute, "");

            element.setAttribute(MenuUseAttribute, NodeMenuName);
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
            band.setAttribute(MenuUseAttribute, GroupMenuName);
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
        this.edgeParts.clear();

        // Marks a part as it's made, before it's appended to the sheet — marking after a layout-triggering measure (a label) makes the
        // focused line blink during a drag's redraws.
        const focused = this.focusItem === null ? null : new Set(kind.related(this.focusItem).edges);

        for (const edge of kind.edges()) {
            const ends = kind.edgeEnds(edge);

            if (ends === null)
                continue;

            const parts: SVGElement[] = [];
            const related = focused !== null && focused.has(edge.id);

            this.edgeParts.set(edge.id, parts);

            const color = kind.edgeColor(edge);
            const points = edge.points.length === 0 && ends.via !== undefined ? ends.via : edge.points;
            const drawing = drawEdge(this.settings.edgeShape, ends.from, ends.to, points, { axis: ends.axis, back: ends.back, arrow: ends.arrow, reversed: ends.reversed, turns: edge.points.length === 0 ? ends.turns : undefined });
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
                path.setAttribute(MenuUseAttribute, EdgeMenuName);

            path.toggleAttribute(RelatedAttribute, related);
            this.edgeLayer.append(path);
            parts.push(path);

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
                parts.push(...[this.drawLabel(path, ends.label, edge.id, edgeMenu, related)].flat());

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

        // The pointer may already rest on an item: what was marked before this draw is marked again on the parts it made.
        this.markFocus();
    }

    /** Draws an edge's label, at the path's midpoint, or near one end when the label belongs to that end rather than the edge. */
    private drawLabel(path: SVGPathElement, label: string, edgeId: string, edgeMenu: boolean, related: boolean): SVGElement | SVGElement[] {
        const point = path.getPointAtLength(path.getTotalLength() / 2);
        const text = document.createElementNS(SvgNamespace, "text");

        text.setAttribute("class", "ui-graph__edge-label");
        text.setAttribute("x", String(point.x));
        text.setAttribute("y", String(point.y));
        text.setAttribute(EdgeAttribute, edgeId);

        if (edgeMenu)
            text.setAttribute(MenuUseAttribute, EdgeMenuName);

        text.textContent = label;
        text.toggleAttribute(RelatedAttribute, related);
        this.edgeLayer.append(text);

        // The chip behind the words, measured off them once they stand on the sheet; a box of no size is one nothing laid out yet.
        const size = text.getBBox();
        const box = document.createElementNS(SvgNamespace, "rect");

        if (size.width === 0)
            return text;

        box.setAttribute("class", "ui-graph__edge-label-box");
        box.setAttribute("x", String(size.x - LabelPadding));
        box.setAttribute("y", String(size.y - LabelPadding / 2));
        box.setAttribute("width", String(size.width + LabelPadding * 2));
        box.setAttribute("height", String(size.height + LabelPadding));
        box.setAttribute("rx", "4");
        box.setAttribute(EdgeAttribute, edgeId);

        if (edgeMenu)
            box.setAttribute(MenuUseAttribute, EdgeMenuName);

        box.toggleAttribute(RelatedAttribute, related);
        this.edgeLayer.insertBefore(box, text);

        return [box, text];
    }

    /** A temporary edge while one is being pulled. */
    public drawPending(from: Point, to: Point, color: string): void {
        this.clearPending();

        const path = document.createElementNS(SvgNamespace, "path");

        path.setAttribute("d", edgePath(this.settings.edgeShape, from, to));
        path.setAttribute("class", "ui-graph__edge ui-graph__edge--pending");
        path.style.setProperty("--ui-graph-pin-color", color);

        this.edgeLayer.append(path);
    }

    public clearPending(): void {
        this.edgeLayer.querySelector(".ui-graph__edge--pending")?.remove();
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
        const node = this.kind().items().find(candidate => candidate.id === id);
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

function boxOf(element: HTMLElement): string {
    return `${element.offsetWidth}x${element.offsetHeight}`;
}
