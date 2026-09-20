// The line an item stands on: everything it's made from and everything made from it, plus the links walked, excluding any
// sideways branch off an item on the line — which is what lets a hover read one chain out of a sheet of them.

export type ChainLink = {
    readonly id: string;
    readonly from: string;
    readonly to: string;
};

export type Chain = {
    readonly items: readonly string[];
    readonly edges: readonly string[];
};

export function chainOf(links: readonly ChainLink[], itemId: string): Chain {
    const items = new Set<string>([itemId]);
    const edges = new Set<string>();

    walk(links, itemId, true, items, edges);
    walk(links, itemId, false, items, edges);

    return { items: [...items], edges: [...edges] };
}

/** One direction from the item, breadth first; a loop — a seed from its plant, a plant from its seed — is walked once. */
function walk(links: readonly ChainLink[], start: string, upstream: boolean, items: Set<string>, edges: Set<string>): void {
    const byEnd = new Map<string, ChainLink[]>();

    for (const link of links) {
        const end = upstream ? link.to : link.from;
        const list = byEnd.get(end);

        if (list === undefined)
            byEnd.set(end, [link]);
        else
            list.push(link);
    }

    const seen = new Set<string>([start]);
    const queue = [start];

    for (let index = 0; index < queue.length; index++) {
        for (const link of byEnd.get(queue[index]) ?? []) {
            const next = upstream ? link.from : link.to;

            edges.add(link.id);
            items.add(next);

            if (!seen.has(next)) {
                seen.add(next);
                queue.push(next);
            }
        }
    }
}
