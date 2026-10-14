// The bound collection a layered canvas draws, with the viewer's draft laid over it by key: the server's list and its version, the
// items drawn and the conflicts, and every edit the draft takes whatever the kind — composed by the layered and production kinds.

import type { CollectionChange } from "ne-standard-ui";
import type { CanvasServices } from "../canvas/canvas-kind.ts";
import { showMenuEntries } from "../canvas/canvas-menus.ts";
import type { CanvasDocument, CanvasEdge, CanvasItem, Point } from "../canvas/canvas-model.ts";
import { readJson } from "../canvas/canvas-model.ts";
import type { DraftConflict, DraftEntry, DraftModel } from "./draft.ts";
import { conflicts, freeKey, takenKeys } from "./draft.ts";
import { applyCollectionChange } from "./keyed-list.ts";

/** On the root: the items the renderer wrote, which a bound collection's own changes then replace. */
export const NodesAttribute = "data-ui-graph-nodes";

const TakeServerCommand = "graph:take-server";
const KeepMineCommand = "graph:keep-mine";

/** A draft entry whose name and colour its item's menu changes. */
type NamedEntry = DraftEntry & { title: string | null; color: string | null };

/** What of a document the collection reaches: the places, the edges' bends, and the keys the draft removes. */
type DraftedDocument = CanvasDocument & { nodes: CanvasItem[]; edges: CanvasEdge[]; draft: { removed: string[] } };

export class DraftedCollection<TDocument extends DraftedDocument, TItem extends { readonly id: string }, TEntry extends NamedEntry> {
    private readonly services: CanvasServices<TDocument>;
    private readonly model: DraftModel<TDocument, TItem, TEntry>;
    private readonly placeAt: (id: string, at: Point) => void;

    // The collection as the server has it; what is drawn is it with the draft laid over, worked out again whenever either changes.
    private readonly server: TItem[];
    private serverById = new Map<string, TItem>();
    private serverVersion = 0;
    private drawnKey = "";
    private drawn: TItem[] = [];
    private drawnById = new Map<string, TItem>();
    private conflicts = new Map<string, DraftConflict>();

    /** `placeAt` puts an added item where the viewer asked for it; the sheet settles it on the grid once drawn. */
    public constructor(services: CanvasServices<TDocument>, model: DraftModel<TDocument, TItem, TEntry>, placeAt: (id: string, at: Point) => void) {
        const read = readJson(services.root.getAttribute(NodesAttribute));

        this.services = services;
        this.model = model;
        this.placeAt = placeAt;
        this.server = Array.isArray(read) ? read.map(model.read).filter((item): item is TItem => item !== null) : [];
    }

    private get document(): TDocument {
        return this.services.documentState.document;
    }

    /** A change to the bound collection, the initial reset and insert among them: the sheet is drawn again, and a new item placed. */
    public applyChange(change: CollectionChange): void {
        applyCollectionChange(this.server, change, this.model.read);
        this.serverVersion++;
        this.services.draw();
    }

    /** Lays the draft over the server's items again, only when either changed since or `also` — what else the kind's drawing hangs on — did; whether it did. */
    public refresh(also = ""): boolean {
        // The document's own edit count, not the draft stringified: this runs on every pointer move of a drag.
        const key = `${this.serverVersion}|${this.services.documentState.version}|${also}`;

        if (key === this.drawnKey)
            return false;

        this.drawnKey = key;
        this.serverById = new Map(this.server.map(item => [item.id, item]));
        this.drawn = this.model.overlay(this.server, this.document);
        this.drawnById = new Map(this.drawn.map(item => [item.id, item]));
        this.conflicts = conflicts(this.server, this.model.lists(this.document).flat());

        return true;
    }

    /** What the last refresh was worked out for — the server's version, the document's, and `also` — for a panel drawn off the same. */
    public get key(): string {
        return this.drawnKey;
    }

    /** The items drawn, as of the last refresh. */
    public get items(): readonly TItem[] {
        return this.drawn;
    }

    public item(id: string): TItem | undefined {
        return this.drawnById.get(id);
    }

    public serverItem(id: string): TItem | undefined {
        return this.serverById.get(id);
    }

    public conflict(id: string): DraftConflict | null {
        return this.conflicts.get(id) ?? null;
    }

    /** The draft entry for an item, created from what's drawn on first change, with the server's item kept beside it to tell a later server change apart. */
    public draftOf(id: string): TEntry | null {
        const document = this.document;

        for (const list of this.model.lists(document)) {
            const existing = list.find(entry => entry.id === id);

            if (existing !== undefined)
                return existing;
        }

        const item = this.drawnById.get(id);

        if (item === undefined)
            return null;

        const server = this.serverById.get(id);
        const entry = this.model.toEntry(item);

        entry.baseline = server === undefined ? null : JSON.stringify(server);
        this.model.listOf(document, entry).push(entry);

        return entry;
    }

    public rename(id: string, title: string | null): void {
        const entry = this.draftOf(id);

        if (entry !== null)
            entry.title = title;
    }

    public paint(id: string, color: string | null): void {
        const entry = this.draftOf(id);

        if (entry !== null)
            entry.color = color;
    }

    /** A key no item takes: not the server's, drawn or removed — a removed one is still the server's until the save — and no entry's. */
    public freeKey(prefix: string): string {
        const document = this.document;

        return freeKey(prefix, takenKeys(this.server, this.model.lists(document).flat(), document.draft.removed));
    }

    /** An item of the viewer's own under a free key, where the pointer last stood: chosen, and named at once. */
    public add(prefix: string, create: (id: string) => TEntry): void {
        const entry = create(this.freeKey(prefix));
        const at = this.services.pointerScene();

        this.model.listOf(this.document, entry).push(entry);
        this.placeAt(entry.id, at);
        this.services.selection.selectOnly(entry.id);
        this.services.documentState.edited();
        this.services.renameItem(entry.id);
    }

    /** Items taken out: one the viewer added simply goes from the draft, and the server's own is marked removed for the save. */
    public remove(ids: Iterable<string>): void {
        const document = this.document;
        const removed = document.draft.removed;

        for (const id of ids) {
            let created = false;

            for (const list of this.model.lists(document)) {
                const at = list.findIndex(entry => entry.id === id);

                if (at >= 0) {
                    created = list[at].created;
                    list.splice(at, 1);
                }
            }

            if (!created && this.serverById.has(id) && !removed.includes(id))
                removed.push(id);
        }
    }

    /** Whether an item is still there to change: drafted, or the server's and not removed; the drawing is not redone within one press. */
    public stands(id: string): boolean {
        const document = this.document;

        return this.model.lists(document).some(list => list.some(entry => entry.id === id)) || (this.serverById.has(id) && !document.draft.removed.includes(id));
    }

    /** Take the server's or Keep mine, for the item in conflict a menu was opened on; whether the command was either. */
    public answerConflict(key: string, id: string | null): boolean {
        if (key !== TakeServerCommand && key !== KeepMineCommand)
            return false;

        if (id !== null && this.conflicts.has(id) && !this.services.settings.readOnly && this.resolve(id, key === KeepMineCommand))
            this.services.documentState.edited();

        return true;
    }

    /**
     * Taking the server's drops the entry. Keeping the viewer's ties it to the server's item as it now stands, or marks it added where
     * the server dropped it; an item the viewer added under a key the server has since taken stays theirs, under another key.
     */
    public resolve(id: string, keepMine: boolean): boolean {
        for (const list of this.model.lists(this.document)) {
            const index = list.findIndex(entry => entry.id === id);

            if (index < 0)
                continue;

            const entry = list[index];
            const server = this.serverById.get(id);

            if (!keepMine)
                list.splice(index, 1);
            else if (entry.created && server !== undefined)
                this.rekey(entry);
            else {
                entry.created = server === undefined;
                entry.baseline = server === undefined ? null : JSON.stringify(server);
            }

            return true;
        }

        return false;
    }

    /** The viewer's item moved off a key the server took: its place, and every reference the kind's draft holds to it, go along. */
    private rekey(entry: TEntry): void {
        const document = this.document;
        const from = entry.id;
        const to = this.freeKey(this.model.prefix(entry));

        entry.id = to;

        for (const place of document.nodes) {
            if (place.id === from)
                place.id = to;
        }

        this.model.rekey(document, from, to, this.drawn);
    }

    /** A conflict's two answers stand in the menu only of an item that has one. */
    public showConflictAnswers(shown: boolean): void {
        showMenuEntries(this.services, TakeServerCommand, shown);
        showMenuEntries(this.services, KeepMineCommand, shown);
    }
}
