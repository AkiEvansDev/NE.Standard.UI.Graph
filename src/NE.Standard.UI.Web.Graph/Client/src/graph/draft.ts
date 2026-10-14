// A draft laid over a bound collection by key: an entry is an item's state as the viewer left it, marked added or tied to the
// server's item as it stood when first changed. Shared by graph nodes and production resources/crafts.

/** What every draft entry carries beside the item's own state. */
export type DraftEntry = {
    id: string;
    created: boolean;
    /** The server's item, as JSON, when the viewer first changed it; unset for an item the viewer added. */
    baseline: string | null;
};

/** How a kind keeps its draft, as `DraftedCollection` reaches it: the wire, the overlay, the entry lists, and a key moved. */
export type DraftModel<TDocument, TItem extends { readonly id: string }, TEntry extends DraftEntry> = {
    /** One item of the bound collection off the wire, or nothing for a value with no key. */
    read(value: unknown): TItem | null;
    /** The items to draw: the server's with the document's draft laid over them by key. */
    overlay(server: readonly TItem[], document: TDocument): TItem[];
    /** Every list of entries the draft keeps; a production draft keeps resources and crafts apart. */
    lists(document: TDocument): readonly TEntry[][];
    /** The list an entry goes in. */
    listOf(document: TDocument, entry: TEntry): TEntry[];
    /** An item's state as an entry, not yet marked added or tied to the server's item. */
    toEntry(item: TItem): TEntry;
    /** What the key of an entry of the viewer's own starts with. */
    prefix(entry: TEntry): string;
    /** Every reference the draft and the document hold to the viewer's item moved to the key it was given; `items` are the ones drawn. */
    rekey(document: TDocument, from: string, to: string, items: readonly TItem[]): void;
};

/** How a drafted item stands against the server: changed there since, or gone from there. */
export type DraftConflict = "changed" | "removed";

/** The items to draw: the server's, minus removed, each replaced by its draft entry, then items the viewer added; a server-dropped drafted item is still drawn until save. */
export function overlay<TItem extends { readonly id: string }, TEntry extends DraftEntry>(server: readonly TItem[], entries: readonly TEntry[], removedIds: readonly string[], fromEntry: (entry: TEntry) => TItem): TItem[] {
    const removed = new Set(removedIds);
    const drafted = new Map(entries.map(entry => [entry.id, entry]));
    const seen = new Set<string>();
    const items: TItem[] = [];

    for (const item of server) {
        if (removed.has(item.id))
            continue;

        const entry = drafted.get(item.id);

        items.push(entry === undefined ? item : fromEntry(entry));
        seen.add(item.id);
    }

    for (const entry of entries) {
        if (!seen.has(entry.id) && !removed.has(entry.id))
            items.push(fromEntry(entry));
    }

    return items;
}

/** Every drafted item the server moved under the viewer, by key: changed since the draft began, dropped, or added under a key the server has since taken. */
export function conflicts(server: readonly { readonly id: string }[], entries: readonly DraftEntry[]): Map<string, DraftConflict> {
    const byId = new Map(server.map(item => [item.id, item]));
    const found = new Map<string, DraftConflict>();

    for (const entry of entries) {
        const now = byId.get(entry.id);

        if (entry.created) {
            if (now !== undefined)
                found.set(entry.id, "changed");
        }
        else if (now === undefined) {
            found.set(entry.id, "removed");
        }
        else if (entry.baseline !== null && entry.baseline !== JSON.stringify(now)) {
            found.set(entry.id, "changed");
        }
    }

    return found;
}

/** Every key a new entry must not take: the server's items, drawn or removed, and every entry of the draft. */
export function takenKeys(server: readonly { readonly id: string }[], entries: readonly DraftEntry[], removedIds: readonly string[]): Set<string> {
    return new Set([...server.map(item => item.id), ...entries.map(entry => entry.id), ...removedIds]);
}

/** A key nothing in `taken` carries: the prefix and the first free serial after it. */
export function freeKey(prefix: string, taken: ReadonlySet<string>): string {
    let serial = 1;

    while (taken.has(`${prefix}-${serial}`))
        serial++;

    return `${prefix}-${serial}`;
}
