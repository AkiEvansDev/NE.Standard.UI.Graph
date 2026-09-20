// Arrange: flows nodes from what feeds nothing to what reads nothing, each node one column right of its feeders, stacked to
// minimize edge crossings.

import type { GraphDocument } from "./model.ts";

export type NodeSize = { readonly width: number; readonly height: number };

export type ArrangeOptions = {
    /** The size of every node, by id; a node the caller did not measure takes the fallback. */
    readonly sizes: ReadonlyMap<string, NodeSize>;
    readonly fallback?: NodeSize;
    readonly columnGap?: number;
    readonly rowGap?: number;
    readonly originX?: number;
    readonly originY?: number;
    /** Only these nodes move; the rest stay where they are. Unset, the whole document is arranged. */
    readonly only?: ReadonlySet<string>;
};

/** Where every arranged node lands, by id. A pinned node is left where it is and does not take a column. */
export function arrange(document: GraphDocument, options: ArrangeOptions): Map<string, { x: number; y: number }> {
    const fallback = options.fallback ?? { width: 220, height: 120 };
    const columnGap = options.columnGap ?? 80;
    const rowGap = options.rowGap ?? 32;

    const moving = document.nodes.filter(node => node.pinned !== true && (options.only === undefined || options.only.has(node.id)));
    const movingIds = new Set(moving.map(node => node.id));

    if (moving.length === 0)
        return new Map();

    const column = depths(document, movingIds);
    const columns = new Map<number, string[]>();

    for (const node of moving) {
        const depth = column.get(node.id) ?? 0;
        const stack = columns.get(depth);

        if (stack === undefined)
            columns.set(depth, [node.id]);
        else
            stack.push(node.id);
    }

    const placed = new Map<string, { x: number; y: number }>();
    const middles = new Map<string, number>();

    let x = options.originX ?? 0;

    for (const depth of [...columns.keys()].sort((left, right) => left - right)) {
        const stack = columns.get(depth)!;

        // Each node sits where what feeds it sits, on average; ties keep the order they were read in.
        stack.sort((left, right) => (pull(document, left, middles) ?? Number.MAX_SAFE_INTEGER) - (pull(document, right, middles) ?? Number.MAX_SAFE_INTEGER));

        let y = options.originY ?? 0;
        let widest = 0;

        for (const id of stack) {
            const size = options.sizes.get(id) ?? fallback;

            placed.set(id, { x, y });
            middles.set(id, y + size.height / 2);

            y += size.height + rowGap;
            widest = Math.max(widest, size.width);
        }

        x += widest + columnGap;
    }

    return placed;
}

/** How far along the flow each node stands: one more than the deepest node feeding it, cycles broken where they close. */
function depths(document: GraphDocument, moving: ReadonlySet<string>): Map<string, number> {
    const feeders = new Map<string, string[]>();

    for (const edge of document.edges) {
        if (!moving.has(edge.toNode) || !moving.has(edge.fromNode))
            continue;

        const above = feeders.get(edge.toNode);

        if (above === undefined)
            feeders.set(edge.toNode, [edge.fromNode]);
        else if (!above.includes(edge.fromNode))
            above.push(edge.fromNode);
    }

    const depth = new Map<string, number>();
    const walking = new Set<string>();

    const measure = (id: string): number => {
        const known = depth.get(id);

        if (known !== undefined)
            return known;

        // A node already on the walk closes a cycle: it is measured as a source, which is where the cycle is cut.
        if (walking.has(id))
            return 0;

        walking.add(id);

        let deepest = 0;

        for (const feeder of feeders.get(id) ?? [])
            deepest = Math.max(deepest, measure(feeder) + 1);

        walking.delete(id);
        depth.set(id, deepest);

        return deepest;
    };

    for (const id of moving)
        measure(id);

    return depth;
}

/** The average middle of everything feeding a node, or nothing when it is fed by nodes not yet placed. */
function pull(document: GraphDocument, id: string, middles: ReadonlyMap<string, number>): number | undefined {
    let total = 0;
    let count = 0;

    for (const edge of document.edges) {
        if (edge.toNode !== id)
            continue;

        const middle = middles.get(edge.fromNode);

        if (middle !== undefined) {
            total += middle;
            count++;
        }
    }

    return count === 0 ? undefined : total / count;
}
