// What is chosen: nodes and groups in the selection, edges picked out on their own, and the marquee band that grows the first.
// Everything else asks this rather than keeping its own copy.

import type { CanvasItem } from "./canvas-model.ts";
import type { Rect } from "./geometry.ts";
import { intersects } from "./geometry.ts";
import { GroupAttribute, SelectedAttribute } from "./canvas-dom.ts";

/** What the selection reaches on the coordinator: the items a band chooses among, and the redraw its own change asks for. */
export type SelectionHost = {
    items(): readonly CanvasItem[];
    nodeRect(id: string): Rect | null;
    drawEdges(): void;
};

export class CanvasSelection {
    private readonly nodeElements: ReadonlyMap<string, HTMLElement>;
    private readonly groupLayer: HTMLElement;
    private readonly marquee: HTMLElement;
    private readonly host: SelectionHost;

    private readonly selection = new Set<string>();
    private readonly selectedEdges = new Set<string>();

    public constructor(root: HTMLElement, nodeElements: ReadonlyMap<string, HTMLElement>, groupLayer: HTMLElement, host: SelectionHost) {
        this.nodeElements = nodeElements;
        this.groupLayer = groupLayer;
        this.marquee = root.querySelector<HTMLElement>(".ui-graph__marquee")!;
        this.host = host;
    }

    public get nodeIds(): ReadonlySet<string> {
        return this.selection;
    }

    public get size(): number {
        return this.selection.size;
    }

    public get edgeIds(): ReadonlySet<string> {
        return this.selectedEdges;
    }

    public get edgeSize(): number {
        return this.selectedEdges.size;
    }

    public has(id: string): boolean {
        return this.selection.has(id);
    }

    public hasEdge(id: string): boolean {
        return this.selectedEdges.has(id);
    }

    /** Drops any chosen id that was not among the ones just redrawn — a node or a group the document no longer carries. */
    public pruneNodes(drawn: ReadonlySet<string>): void {
        for (const id of [...this.selection]) {
            if (!drawn.has(id))
                this.selection.delete(id);
        }
    }

    public select(id: string, add: boolean): void {
        if (!add)
            this.selection.clear();

        if (add && this.selection.has(id))
            this.selection.delete(id);
        else
            this.selection.add(id);

        this.selectedEdges.clear();
        this.markSelection();
    }

    public clearSelection(): void {
        this.selection.clear();
        this.selectedEdges.clear();
        this.markSelection();
        this.host.drawEdges();
    }

    /** Both sets emptied with nothing redrawn — for a caller about to redraw everything itself, a load or a replace among them. */
    public clearSets(): void {
        this.selection.clear();
        this.selectedEdges.clear();
    }

    /** Chooses one item alone, as a left press does — a menu or a log line's node jumped to, on an item not already chosen. */
    public chooseForMenu(id: string): void {
        this.select(id, false);
    }

    /** The node selection replaced with one id, with nothing else touched — a node just added under the pointer. */
    public selectOnly(id: string): void {
        this.selectOnlyMany([id]);
    }

    /** The node selection replaced with several ids, with nothing else touched — a pasted copy. */
    public selectOnlyMany(ids: readonly string[]): void {
        this.selection.clear();

        for (const id of ids)
            this.selection.add(id);
    }

    public selectAll(ids: Iterable<string>): void {
        for (const id of ids)
            this.selection.add(id);

        this.markSelection();
    }

    public markSelection(): void {
        for (const [id, element] of this.nodeElements)
            element.toggleAttribute(SelectedAttribute, this.selection.has(id));

        for (const element of this.groupLayer.querySelectorAll<HTMLElement>(`[${GroupAttribute}]`))
            element.toggleAttribute(SelectedAttribute, this.selection.has(element.getAttribute(GroupAttribute)!));
    }

    public toggleEdge(id: string, add: boolean): void {
        if (!add)
            this.selectedEdges.clear();

        if (this.selectedEdges.has(id))
            this.selectedEdges.delete(id);
        else
            this.selectedEdges.add(id);
    }

    public beginMarquee(): void {
        this.marquee.hidden = false;
    }

    public hideMarquee(): void {
        this.marquee.hidden = true;
    }

    public drawMarquee(startX: number, startY: number, endX: number, endY: number): void {
        const rect = { x: Math.min(startX, endX), y: Math.min(startY, endY), width: Math.abs(endX - startX), height: Math.abs(endY - startY) };

        this.marquee.hidden = false;
        this.marquee.style.setProperty("--ui-graph-marquee-x", String(rect.x));
        this.marquee.style.setProperty("--ui-graph-marquee-y", String(rect.y));
        this.marquee.style.setProperty("--ui-graph-marquee-width", String(rect.width));
        this.marquee.style.setProperty("--ui-graph-marquee-height", String(rect.height));

        for (const node of this.host.items()) {
            const nodeRect = this.host.nodeRect(node.id);

            if (nodeRect === null)
                continue;

            if (intersects(rect, nodeRect))
                this.selection.add(node.id);
            else
                this.selection.delete(node.id);
        }

        this.markSelection();
    }
}

/** Whether a press adds to the choice rather than replacing it: Ctrl, or Cmd on a Mac, as a file list takes it. */
export function adds(event: MouseEvent): boolean {
    return event.ctrlKey || event.metaKey;
}
