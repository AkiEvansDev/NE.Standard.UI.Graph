// Drags nodes, groups and selections of them across the sheet, and resizes a node from its corner; grid-snapping on release lives
// here too, since it settles the same nodes and groups.

import type { Rect } from "./geometry.ts";
import { contains, snap } from "./geometry.ts";
import type { CanvasGroup, CanvasItem, Point } from "./canvas-model.ts";
import type { CanvasSelection } from "./canvas-selection.ts";
import { adds } from "./canvas-selection.ts";
import type { CanvasSettings } from "./canvas-settings.ts";
import type { Drag } from "./canvas.ts";
import { CollapsedAttribute, NodeAttribute } from "./canvas-dom.ts";
import type { CanvasKind } from "./canvas-kind.ts";

/** What the drag reaches on the coordinator: the items and groups it moves, the element registry, and the redraws that follow. */
export type DragHost = {
    readonly nodeElements: ReadonlyMap<string, HTMLElement>;
    kind(): CanvasKind;
    items(): readonly CanvasItem[];
    groups(): readonly CanvasGroup[];
    nodeRect(id: string): Rect | null;
    drawEdges(): void;
    drawMinimap(): void;
    drawGroups(): void;
};

export class CanvasDrag {
    private readonly selection: CanvasSelection;
    private readonly host: DragHost;
    private readonly settings: CanvasSettings;

    public constructor(selection: CanvasSelection, host: DragHost, settings: CanvasSettings) {
        this.selection = selection;
        this.host = host;
        this.settings = settings;
    }

    public beginNodeDrag(event: PointerEvent, nodeId: string, scene: Point): Drag | null {
        if (!this.selection.has(nodeId))
            this.selection.select(nodeId, adds(event));
        else if (adds(event))
            this.selection.select(nodeId, true);

        if (this.settings.readOnly)
            return null;

        const moving = new Map<string, Point>();
        const items = this.itemsById();

        for (const id of this.selection.nodeIds) {
            const node = items.get(id);

            if (node !== undefined && node.pinned !== true)
                moving.set(id, { x: node.x, y: node.y });
        }

        return { kind: "nodes", startX: scene.x, startY: scene.y, moving };
    }

    /** The items by id, read afresh: a document the server sends mid-drag replaces the objects, and the drag goes on over the new ones. */
    private itemsById(): Map<string, CanvasItem> {
        return new Map(this.host.items().map(item => [item.id, item]));
    }

    /** The corner: the node's own width and height, from what it stands at now rather than from what was last stored. */
    public beginResize(element: HTMLElement, scene: Point): Drag {
        return {
            kind: "resize",
            nodeId: element.getAttribute(NodeAttribute)!,
            startX: scene.x,
            startY: scene.y,
            width: element.offsetWidth,
            height: element.offsetHeight
        };
    }

    public beginGroupDrag(event: PointerEvent, groupId: string, scene: Point): Drag | null {
        const group = this.findGroup(groupId);

        if (group === undefined)
            return null;

        this.selection.select(groupId, adds(event));

        if (this.settings.readOnly || group.pinned === true)
            return null;

        const frame: Rect = { x: group.x, y: group.y, width: group.width, height: group.height };
        const moving = new Map<string, Point>();

        for (const node of this.host.items()) {
            const rect = this.host.nodeRect(node.id);

            if (node.pinned !== true && rect !== null && contains(frame, rect))
                moving.set(node.id, { x: node.x, y: node.y });
        }

        return { kind: "group", startX: scene.x, startY: scene.y, groupId, origin: { x: group.x, y: group.y }, moving };
    }

    // By its id at every step, as the nodes are: a document the server sends mid-drag replaces the objects, and the drag goes on
    // over the new ones.
    private findGroup(groupId: string): CanvasGroup | undefined {
        return this.host.groups().find(candidate => candidate.id === groupId);
    }

    public moveNodes(moving: ReadonlyMap<string, Point>, dx: number, dy: number): void {
        // Asked for once a move, not once a node: a layered kind builds its list afresh on every call.
        const items = this.itemsById();

        for (const [id, origin] of moving) {
            const node = items.get(id);

            if (node === undefined)
                continue;

            node.x = origin.x + dx;
            node.y = origin.y + dy;

            this.placeNode(id, node);
        }

        // The map follows a node as it goes, as it follows the view: a box left where the node was is a map of another sheet.
        this.host.drawEdges();
        this.host.drawMinimap();
    }

    public moveGroup(drag: Extract<Drag, { kind: "group" }>, scene: Point): void {
        const dx = scene.x - drag.startX;
        const dy = scene.y - drag.startY;
        const group = this.findGroup(drag.groupId);

        if (group !== undefined) {
            group.x = drag.origin.x + dx;
            group.y = drag.origin.y + dy;
        }

        this.moveNodes(drag.moving, dx, dy);
        this.host.drawGroups();
    }

    /** The size asked for, then the size it actually came to: the kind's least width and the contents' height have the last word. */
    public resizeNode(nodeId: string, width: number, height: number): void {
        const node = this.host.items().find(candidate => candidate.id === nodeId);
        const element = this.host.nodeElements.get(nodeId);

        if (node === undefined || element === undefined)
            return;

        element.style.setProperty("--ui-graph-node-w", String(Math.max(1, Math.round(width))));
        element.style.setProperty("--ui-graph-node-h", String(Math.max(1, Math.round(height))));

        node.width = element.offsetWidth;
        node.height = element.offsetHeight;

        this.host.drawEdges();
        this.host.drawMinimap();
    }

    public snapNodes(ids: Iterable<string>): void {
        // Read once: the grid size is a computed style, and a selection of many nodes would ask for it twice per node.
        const gridSize = this.settings.gridSize;
        const items = this.host.items();

        for (const id of ids) {
            const node = items.find(candidate => candidate.id === id);

            if (node === undefined)
                continue;

            const place = this.snapPlace(id, node, gridSize);

            node.x = place.x;
            node.y = place.y;

            this.placeNode(id, node);
        }
    }

    /** Where the grid puts an item standing at a point: by its corner, or — on a kind that says so — by its middle. */
    public snapPlace(id: string, point: Point, gridSize = this.settings.gridSize): Point {
        const element = this.host.kind().snapsByCenter === true ? this.host.nodeElements.get(id) : undefined;
        const halfWidth = (element?.offsetWidth ?? 0) / 2;
        const halfHeight = (element?.offsetHeight ?? 0) / 2;

        return { x: snap(point.x + halfWidth, gridSize, true) - halfWidth, y: snap(point.y + halfHeight, gridSize, true) - halfHeight };
    }

    /** Rounds a resized node's box to the grid step, growing to the next step where the kind's minimum width or content height won't fit. */
    public snapSize(nodeId: string): void {
        const node = this.host.items().find(candidate => candidate.id === nodeId);
        const element = this.host.nodeElements.get(nodeId);

        if (node === undefined || element === undefined)
            return;

        const gridSize = this.settings.gridSize;

        this.resizeNode(nodeId, snap(element.offsetWidth, gridSize, true), snap(element.offsetHeight, gridSize, true));
        snapBox(element, gridSize);

        node.width = element.offsetWidth;
        node.height = element.offsetHeight;
    }

    public settleGroup(drag: Extract<Drag, { kind: "group" }>): void {
        const group = this.findGroup(drag.groupId);

        if (group !== undefined) {
            group.x = snap(group.x, this.settings.gridSize, true);
            group.y = snap(group.y, this.settings.gridSize, true);
        }

        this.snapNodes(drag.moving.keys());
        this.host.drawGroups();
    }

    private placeNode(id: string, node: CanvasItem): void {
        const element = this.host.nodeElements.get(id);

        element?.style.setProperty("--ui-graph-node-x", String(node.x));
        element?.style.setProperty("--ui-graph-node-y", String(node.y));
    }
}

/** Rounds a node's box up to the grid so its far corner lands on the grid like its near one; the size is a floor the stylesheet can still grow. */
function snapBox(element: HTMLElement, gridSize: number): void {
    snapBoxes([element], gridSize);
}

/**
 * The same for many nodes at once: every box is read before any is written, so the page is laid out once for all of them. A folded
 * node keeps its head's own height, its place and width on the grid still: grown to the next step, the head's line stood off centre.
 */
export function snapBoxes(elements: Iterable<HTMLElement>, gridSize: number): void {
    if (gridSize <= 0)
        return;

    const sizes = [...elements].map(element => ({ element, width: element.offsetWidth, height: element.offsetHeight, folded: element.hasAttribute(CollapsedAttribute) }));

    for (const { element, width, height, folded } of sizes) {
        const wide = Math.ceil((width - 0.5) / gridSize) * gridSize;
        const tall = Math.ceil((height - 0.5) / gridSize) * gridSize;

        if (wide !== width)
            element.style.setProperty("--ui-graph-node-w", String(wide));

        if (tall !== height && !folded)
            element.style.setProperty("--ui-graph-node-h", String(tall));
    }
}
