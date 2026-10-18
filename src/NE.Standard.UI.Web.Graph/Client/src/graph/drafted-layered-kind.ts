// What the two layered kinds share — the graph's nodes and the production graph's catalogue: a bound collection with the viewer's
// draft laid over it (`DraftedCollection`), drawn on one layered sheet (`LayeredSheet`), linked by edges a node's handle pulls out.
// Each kind draws its items, says what its edges carry and answers its own menu; the sheet's plumbing is here.

import type { CollectionChange } from "ne-standard-ui";
import type { CanvasServices, KindDrag } from "../canvas/canvas-kind.ts";
import type { CanvasEdge, CanvasItem, Point } from "../canvas/canvas-model.ts";
import { chainOf } from "./chain.ts";
import type { DraftedCollection, DraftedDocument, NamedEntry } from "./drafted-collection.ts";
import type { LayeredEdge } from "./layered.ts";
import type { LayeredSheet } from "./layered-sheet.ts";
import { HandleAttribute } from "./link-drag.ts";

/** What a kind's editing does with a press on a node's handle: a link pulled out of the node, or null where none may be. */
type LinkPuller = {
    beginLink(handle: HTMLElement): KindDrag | null;
};

export abstract class DraftedLayeredKind<TDocument extends DraftedDocument, TItem extends { readonly id: string; readonly color: string | null }, TEntry extends NamedEntry, TLink extends LayeredEdge> {
    /** Items of different heights on one line — a circle and a card, a resource and a craft's pill: the grid takes their middles. */
    public readonly snapsByCenter = true;

    protected readonly services: CanvasServices<TDocument>;
    protected links: TLink[] = [];
    protected linkById = new Map<string, TLink>();

    /** The bound collection with the draft laid over it, the sheet it is drawn on, and what pulls a link out of a handle. */
    protected abstract readonly collection: DraftedCollection<TDocument, TItem, TEntry>;
    protected abstract readonly sheet: LayeredSheet;
    protected abstract readonly editing: LinkPuller;

    protected constructor(services: CanvasServices<TDocument>) {
        this.services = services;
    }

    /** Whether the kind lets its items and links be changed, beside their places. */
    protected abstract get editable(): boolean;

    /** Works out the drawn items and links again, only when the collection or the draft changed. */
    protected abstract refresh(): void;

    /** A change to the bound collection, the initial reset and insert among them: the sheet is drawn again, and a new item placed. */
    public applyChange(change: CollectionChange): void {
        this.collection.applyChange(change);
    }

    // --- the sheet -------------------------------------------------------------------------------------------------------------

    public items(): readonly CanvasItem[] {
        this.refresh();
        return this.sheet.items();
    }

    public edges(): readonly CanvasEdge[] {
        this.refresh();
        return this.sheet.edges();
    }

    public itemsDrawn(): void {
        this.sheet.itemsDrawn();
    }

    /** Lets go of the sheet's watch for a size; the canvas's root has left the page. */
    public dispose(): void {
        this.sheet.dispose();
    }

    public itemColor(item: CanvasItem): string {
        return this.collection.item(item.id)?.color ?? "";
    }

    /** The whole line the item stands on, up and down, without the branches beside it. */
    public related(itemId: string): { edges: readonly string[]; items: readonly string[] } {
        return chainOf(this.links, itemId);
    }

    public edgeColor(): string {
        return "var(--ui-text-muted)";
    }

    public arrange(sizes: ReadonlyMap<string, { width: number; height: number }>, only: ReadonlySet<string> | undefined): Map<string, Point> {
        return this.sheet.arrange(sizes, only);
    }

    // --- presses ---------------------------------------------------------------------------------------------------------------

    public isEditor(): boolean {
        return false;
    }

    /** A press on a node's handle pulls a link out of it; every other press is the canvas's. */
    public pointerDown(_event: PointerEvent, target: Element): KindDrag | boolean {
        const handle = target.closest<HTMLElement>(`[${HandleAttribute}]`);

        if (handle === null || !this.editable)
            return false;

        return this.editing.beginLink(handle) ?? true;
    }

    public backgroundDoubleClick(): void {
    }

    // --- editing: names and colours into the draft, when the kind allows it --------------------------------------------------------

    // No clipboard: a copy carried off the sheet is not the draft's; Duplicate copies in place, under a key made as Add makes one.
    public copy(): void {
    }

    public paste(): readonly string[] | null {
        return null;
    }

    public canEditItems(): boolean {
        return this.editable;
    }

    /** An item's name is the item's, in the draft; on a kind that does not allow it, nothing is written anywhere. */
    public renameItem(id: string, title: string | null): boolean {
        if (this.editable)
            this.collection.rename(id, title);

        return true;
    }

    public paintItem(id: string, color: string | null): boolean {
        if (this.editable)
            this.collection.paint(id, color);

        return true;
    }

    public hasEdgeMenu(): boolean {
        return true;
    }
}
