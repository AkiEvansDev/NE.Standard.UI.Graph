// A draft laid over a bound collection by key: an entry is an item's state as the viewer left it, marked added or tied to the
// server's item as it stood when first changed. Shared by graph nodes and production resources/crafts.

/** What every draft entry carries beside the item's own state. */
export type DraftEntry = {
    readonly id: string;
    readonly created: boolean;
    /** The server's item, as JSON, when the viewer first changed it; unset for an item the viewer added. */
    readonly baseline: string | null;
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

/** Resolves a conflict: taking the server's drops the draft entry; keeping the viewer's re-bases it on the current server item (or marks it added if dropped). */
export function resolveConflict<TEntry extends DraftEntry>(entries: TEntry[], id: string, server: object | undefined, keepMine: boolean): boolean {
    const index = entries.findIndex(entry => entry.id === id);

    if (index < 0)
        return false;

    if (keepMine) {
        const entry = entries[index] as { created: boolean; baseline: string | null };

        entry.created = server === undefined;
        entry.baseline = server === undefined ? null : JSON.stringify(server);
    }
    else {
        entries.splice(index, 1);
    }

    return true;
}

/** A key nothing in `taken` carries: the prefix and the first free serial after it. */
export function freeKey(prefix: string, taken: ReadonlySet<string>): string {
    let serial = 1;

    while (taken.has(`${prefix}-${serial}`))
        serial++;

    return `${prefix}-${serial}`;
}
