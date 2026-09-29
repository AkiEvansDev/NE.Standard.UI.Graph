// Sugiyama-style layered layout: cycles broken by Eades-Lin-Smyth greedy ordering, layers by longest path, long edges get virtual
// nodes, order by barycentre sweeps, places across the layers by Brandes-Köpf. Pure and deterministic — ties always fall to input
// order, so the same graph lays out the same way.

import type { Point } from "../canvas/canvas-model.ts";

/** Which way the layers run: the axis, and which end the first layer stands at. */
export type LayeredDirection = "right" | "down" | "left" | "up";

export type LayeredNode = {
    readonly id: string;
    readonly width: number;
    readonly height: number;
    /** Where the node's edges meet it, from its box's top-left corner; unset, the box's middle. A circle with its name under it meets them at the circle's. */
    readonly anchor?: Point;
};

export type LayeredEdge = {
    readonly id: string;
    readonly from: string;
    readonly to: string;
    /** Where the edge leaves its first node and meets its last, along the order axis from each box's leading edge; unset, the node's anchor. */
    readonly fromOffset?: number | undefined;
    readonly toOffset?: number | undefined;
};

export type LayeredOptions = {
    readonly direction: LayeredDirection;
    /** The room between two layers, along the layer axis; unset, it follows how deep the nodes are. */
    readonly layerGap?: number;
    /** The room after some layers, by the layer, given every node's layer; a layer it leaves out takes `layerGap`. */
    readonly layerGaps?: (layers: ReadonlyMap<string, number>) => ReadonlyMap<number, number>;
    /** The room between two nodes of one layer, along the order axis. */
    readonly nodeGap?: number;
    readonly originX?: number;
    readonly originY?: number;
};

export type LayeredResult = {
    /** Every node's top-left corner. */
    readonly positions: Map<string, Point>;
    /** The edges that run against the layers: the ones a cycle was broken at, and an edge from a node to itself. */
    readonly backEdges: Set<string>;
    /** Every node's layer, counted from zero. */
    readonly layers: Map<string, number>;
    /** The points a long forward edge passes through — the middle of its room in each crossed layer — so it draws around those nodes rather than through them. */
    readonly routes: Map<string, Point[]>;
};

/** How thick a virtual node stands along the order axis: an edge passing through a layer still takes a little room in it. */
const VirtualThickness = 8;
const Sweeps = 4;
/** The room between layers when the caller names none: a part of how deep the nodes are, held between these two. */
const LeastLayerGap = 48;
const MostLayerGap = 96;

type Link = { readonly id: string; readonly from: string; readonly to: string; readonly fromOffset?: number | undefined; readonly toOffset?: number | undefined };

/** A one-layer link, with where it meets either end along the order axis from the end's leading edge. */
type Chain = { readonly from: string; readonly to: string; readonly fromOffset: number; readonly toOffset: number };

type Slot = {
    readonly id: string;
    readonly real: boolean;
    /** The node's extent along the layer axis and the order axis. */
    readonly depth: number;
    readonly breadth: number;
    /** How far along the order axis the node's line runs from its box's leading edge: where its edges meet it unless an edge names its own offset. */
    readonly lead: number;
    readonly input: number;
    layer: number;
    order: number;
    /** Where the node's edges run along the order axis, once placed. */
    line: number;
};

export function layered(nodes: readonly LayeredNode[], edges: readonly LayeredEdge[], options: LayeredOptions): LayeredResult {
    const down = options.direction === "down" || options.direction === "up";
    // The two backward directions are the same layout turned end for end along the layer axis: one set of steps, mirrored at the last.
    const mirrored = options.direction === "left" || options.direction === "up";
    const layerGap = options.layerGap ?? autoLayerGap(nodes, down);
    const nodeGap = options.nodeGap ?? 32;
    const slots = new Map<string, Slot>();

    nodes.forEach((node, input) => {
        const breadth = down ? node.width : node.height;
        const lead = node.anchor === undefined ? breadth / 2 : down ? node.anchor.x : node.anchor.y;

        if (!slots.has(node.id))
            slots.set(node.id, { id: node.id, real: true, depth: down ? node.height : node.width, breadth, lead, input, layer: 0, order: 0, line: 0 });
    });

    const { sequence, forward, backEdges } = orient([...slots.values()], edges);

    assignLayers(sequence, forward, slots);

    // Asked before the virtual nodes come in, so the caller sees only its own nodes.
    const gaps = options.layerGaps?.(new Map([...slots.values()].map(slot => [slot.id, slot.layer])));
    const through = new Map<string, string[]>();
    const chains = addVirtualNodes(forward, slots, through);
    const layers = orderLayers(slots, chains);

    placeAcross(layers, chains, nodeGap);

    const positions = new Map<string, Point>();
    const centers = new Map<string, Point>();
    const layerOf = new Map<string, number>();
    const originX = options.originX ?? 0;
    const originY = options.originY ?? 0;
    const placed: { id: string; real: boolean; along: number; depth: number; across: number }[] = [];
    let start = 0;
    let lastGap = layerGap;
    let least = Number.POSITIVE_INFINITY;

    for (const layer of layers) {
        for (const slot of layer)
            least = Math.min(least, slot.line - slot.lead);
    }

    for (const [index, layer] of layers.entries()) {
        const band = Math.max(0, ...layer.map(slot => slot.depth));

        for (const slot of layer) {
            const shift = Number.isFinite(least) ? least : 0;

            // A real node stands against the layer's leading edge so the layer reads as a column; a virtual node stays mid-band where its edge passes.
            placed.push({
                id: slot.id,
                real: slot.real,
                along: slot.real ? start : start + band / 2,
                depth: slot.real ? slot.depth : 0,
                across: slot.real ? slot.line - slot.lead - shift : slot.line - shift
            });

            if (slot.real)
                layerOf.set(slot.id, slot.layer);
        }

        lastGap = gaps?.get(index) ?? layerGap;
        start += band + lastGap;
    }

    const extent = Math.max(0, start - lastGap);

    for (const slot of placed) {
        const along = mirrored ? extent - slot.along - slot.depth : slot.along;
        const point = down ? { x: originX + slot.across, y: originY + along } : { x: originX + along, y: originY + slot.across };

        if (slot.real)
            positions.set(slot.id, point);
        else
            centers.set(slot.id, point);
    }

    const routes = new Map<string, Point[]>();

    for (const [id, virtuals] of through) {
        if (!backEdges.has(id))
            routes.set(id, virtuals.map(virtual => centers.get(virtual)!));
    }

    return { positions, backEdges, layers: layerOf, routes };
}

/**
 * The edges that run against the layers — where a cycle breaks, and a node's link to itself — as `layered` finds them, without laying
 * anything out: what a sheet asks for on every change of its nodes or links.
 */
export function backEdgesOf(nodeIds: readonly string[], edges: readonly LayeredEdge[]): Set<string> {
    const nodes = new Map<string, { readonly id: string }>();

    for (const id of nodeIds) {
        if (!nodes.has(id))
            nodes.set(id, { id });
    }

    return orient([...nodes.values()], edges).backEdges;
}

/** The nodes in an order every edge runs forward along but the back edges, which are turned round for the layering and remembered. */
function orient<TNode extends { readonly id: string }>(all: readonly TNode[], edges: readonly LayeredEdge[]): { sequence: TNode[]; forward: Link[]; backEdges: Set<string> } {
    const ids = new Set(all.map(node => node.id));
    const backEdges = new Set<string>();
    const known = edges.filter(edge => ids.has(edge.from) && ids.has(edge.to));

    for (const edge of known) {
        if (edge.from === edge.to)
            backEdges.add(edge.id);
    }

    const links = known.filter(edge => edge.from !== edge.to);
    const sequence = breakCycles(all, links);
    const rank = new Map(sequence.map((node, index) => [node.id, index]));
    const forward: Link[] = [];

    for (const edge of links) {
        if (rank.get(edge.from)! > rank.get(edge.to)!) {
            backEdges.add(edge.id);
            forward.push({ id: edge.id, from: edge.to, to: edge.from, fromOffset: edge.toOffset, toOffset: edge.fromOffset });
        }
        else {
            forward.push({ id: edge.id, from: edge.from, to: edge.to, fromOffset: edge.fromOffset, toOffset: edge.toOffset });
        }
    }

    return { sequence, forward, backEdges };
}

/** Eades-Lin-Smyth cycle breaking: sinks to the end, sources to the front, else the node with the highest out-minus-in degree to the front; a resulting backward edge is where a cycle breaks. */
function breakCycles<TNode extends { readonly id: string }>(all: readonly TNode[], links: readonly LayeredEdge[]): TNode[] {
    const outgoing = new Map<string, Set<string>>();
    const incoming = new Map<string, Set<string>>();

    for (const slot of all) {
        outgoing.set(slot.id, new Set());
        incoming.set(slot.id, new Set());
    }

    for (const edge of links) {
        outgoing.get(edge.from)!.add(edge.to);
        incoming.get(edge.to)!.add(edge.from);
    }

    const left = new Set(all.map(slot => slot.id));
    const front: TNode[] = [];
    // The sinks in the order they were taken; the last taken stands first, so the list is read backwards at the end.
    const taken: TNode[] = [];

    const take = (id: string): void => {
        left.delete(id);

        for (const to of outgoing.get(id)!)
            incoming.get(to)!.delete(id);

        for (const from of incoming.get(id)!)
            outgoing.get(from)!.delete(id);
    };

    // The nodes still left, in the order they came in: every choice below takes the earliest of its equals.
    const remaining = (): TNode[] => all.filter(slot => left.has(slot.id));

    while (left.size > 0) {
        let changed = true;

        while (changed) {
            changed = false;

            for (const slot of remaining()) {
                if (outgoing.get(slot.id)!.size === 0) {
                    taken.push(slot);
                    take(slot.id);
                    changed = true;
                }
            }

            for (const slot of remaining()) {
                if (incoming.get(slot.id)!.size === 0) {
                    front.push(slot);
                    take(slot.id);
                    changed = true;
                }
            }
        }

        if (left.size === 0)
            break;

        let best: TNode | null = null;
        let bestScore = Number.NEGATIVE_INFINITY;

        for (const slot of remaining()) {
            const score = outgoing.get(slot.id)!.size - incoming.get(slot.id)!.size;

            if (score > bestScore) {
                best = slot;
                bestScore = score;
            }
        }

        front.push(best!);
        take(best!.id);
    }

    return [...front, ...taken.reverse()];
}

/** The longest path: a node stands one layer past the furthest of what feeds it. The sequence is already a topological order. */
function assignLayers(sequence: readonly Slot[], forward: readonly Link[], slots: Map<string, Slot>): void {
    const feeds = new Map<string, string[]>();

    for (const edge of forward) {
        const list = feeds.get(edge.to);

        if (list === undefined)
            feeds.set(edge.to, [edge.from]);
        else
            list.push(edge.from);
    }

    for (const slot of sequence) {
        let layer = 0;

        for (const from of feeds.get(slot.id) ?? [])
            layer = Math.max(layer, slots.get(from)!.layer + 1);

        slot.layer = layer;
    }

    pullForward(sequence, forward, slots);
}

/** Pulls each node to just before the nearest thing it feeds (walked from the end), but only when it feeds at least as many as feed it, so span is never added, only removed. */
function pullForward(sequence: readonly Slot[], forward: readonly Link[], slots: Map<string, Slot>): void {
    const feeds = new Map<string, number>();
    const fed = new Map<string, string[]>();

    for (const edge of forward) {
        feeds.set(edge.to, (feeds.get(edge.to) ?? 0) + 1);
        fed.set(edge.from, [...fed.get(edge.from) ?? [], edge.to]);
    }

    for (let index = sequence.length - 1; index >= 0; index--) {
        const slot = sequence[index];
        const targets = fed.get(slot.id) ?? [];

        if (targets.length > 0 && targets.length >= (feeds.get(slot.id) ?? 0))
            slot.layer = Math.max(slot.layer, Math.min(...targets.map(id => slots.get(id)!.layer)) - 1);
    }
}

/**
 * An edge longer than one layer, broken into one-layer links through a virtual node per layer it crosses, which `through` lists by
 * edge. The edge meets its ends where it says, and each virtual node at its middle, where the edge's line passes.
 */
function addVirtualNodes(forward: readonly Link[], slots: Map<string, Slot>, through: Map<string, string[]>): Chain[] {
    const links: Chain[] = [];
    let serial = 0;

    for (const edge of forward) {
        const from = slots.get(edge.from)!;
        const to = slots.get(edge.to)!;
        const virtuals: string[] = [];
        let previous = from.id;
        let leaving = edge.fromOffset ?? from.lead;

        for (let layer = from.layer + 1; layer < to.layer; layer++) {
            let id = `virtual:${serial++}`;

            // A real node could carry the same name; the next free one is taken.
            while (slots.has(id))
                id = `virtual:${serial++}`;

            slots.set(id, { id, real: false, depth: 0, breadth: VirtualThickness, lead: VirtualThickness / 2, input: from.input, layer, order: 0, line: 0 });
            links.push({ from: previous, to: id, fromOffset: leaving, toOffset: VirtualThickness / 2 });
            virtuals.push(id);
            previous = id;
            leaving = VirtualThickness / 2;
        }

        if (virtuals.length > 0)
            through.set(edge.id, virtuals);

        links.push({ from: previous, to: to.id, fromOffset: leaving, toOffset: edge.toOffset ?? to.lead });
    }

    return links;
}

/** The layers, each ordered by sweeps of barycentres: down against the layer before, up against the layer after. */
function orderLayers(slots: Map<string, Slot>, links: readonly { from: string; to: string }[]): Slot[][] {
    const layers: Slot[][] = [];

    for (const slot of slots.values()) {
        while (layers.length <= slot.layer)
            layers.push([]);

        layers[slot.layer].push(slot);
    }

    for (const layer of layers) {
        layer.sort((left, right) => left.input - right.input);
        layer.forEach((slot, index) => (slot.order = index));
    }

    const above = neighbours(links, true);
    const below = neighbours(links, false);

    for (let sweep = 0; sweep < Sweeps; sweep++) {
        const downward = sweep % 2 === 0;

        for (let step = 1; step < layers.length; step++) {
            const layer = layers[downward ? step : layers.length - 1 - step];

            reorder(layer, downward ? above : below, slots);
        }
    }

    return layers;
}

function neighbours(links: readonly { from: string; to: string }[], towardsFrom: boolean): Map<string, string[]> {
    const map = new Map<string, string[]>();

    for (const link of links) {
        const key = towardsFrom ? link.to : link.from;
        const value = towardsFrom ? link.from : link.to;
        const list = map.get(key);

        if (list === undefined)
            map.set(key, [value]);
        else
            list.push(value);
    }

    return map;
}

/** A layer sorted by where its neighbours stand; a node with none keeps its own place, and ties keep the order they had. */
function reorder(layer: Slot[], adjacent: Map<string, string[]>, slots: Map<string, Slot>): void {
    const weight = new Map<string, number>();

    for (const slot of layer) {
        const others = adjacent.get(slot.id) ?? [];

        weight.set(slot.id, others.length === 0 ? slot.order : others.reduce((sum, id) => sum + slots.get(id)!.order, 0) / others.length);
    }

    layer.sort((left, right) => weight.get(left.id)! - weight.get(right.id)! || left.order - right.order);
    layer.forEach((slot, index) => (slot.order = index));
}

/** The room between layers when the caller names none: enough to read an edge in, and never wider than the nodes are deep. */
function autoLayerGap(nodes: readonly LayeredNode[], down: boolean): number {
    if (nodes.length === 0)
        return LeastLayerGap;

    const depths = nodes.map(node => (down ? node.height : node.width)).sort((left, right) => left - right);
    const middle = depths[Math.floor(depths.length / 2)];

    return Math.max(LeastLayerGap, Math.min(MostLayerGap, Math.round(middle * 0.75)));
}

/**
 * Brandes and Köpf's placement along the order axis: each node lines up with a median neighbour where the order allows — in line
 * with one of what it joins rather than half way between two — and a long edge's stops form one straight block. Alignment is by
 * where the edge meets each node, so an edge leaving off a node's middle still runs straight. Four alignments (to the layer before
 * or after, from either end) are packed tight, and the narrowest is kept.
 */
function placeAcross(layers: readonly Slot[][], links: readonly Chain[], nodeGap: number): void {
    const slots = new Map(layers.flat().map(slot => [slot.id, slot]));
    const above = neighbours(links, true);
    const below = neighbours(links, false);
    const conflicts = markConflicts(layers, above, slots);
    const drift = driftOf(links, slots);
    const variants: Map<string, number>[] = [];

    for (const downward of [false, true]) {
        for (const reversed of [false, true]) {
            const rows = (downward ? [...layers].reverse() : [...layers]).map(layer => (reversed ? [...layer].reverse() : [...layer]));

            variants.push(compact(rows, align(rows, downward ? below : above, conflicts, drift, slots), nodeGap, reversed));
        }
    }

    const chosen = narrowest(layers, variants);

    for (const layer of layers) {
        for (const slot of layer)
            slot.line = chosen.get(slot.id)!;
    }
}

/**
 * The edges between two layers that cross an edge running from one virtual node to the next: a long edge's own segments win, so
 * it stays one straight block and whatever crosses it gives way. Keyed by the ends, the earlier layer's first.
 */
function markConflicts(layers: readonly Slot[][], above: Map<string, string[]>, slots: Map<string, Slot>): Set<string> {
    const marked = new Set<string>();

    for (let index = 1; index < layers.length; index++) {
        const layer = layers[index];
        let from = 0;
        let scanned = 0;

        for (let at = 0; at < layer.length; at++) {
            const inner = innerSegment(layer[at], above, slots);

            if (at !== layer.length - 1 && inner === undefined)
                continue;

            const to = inner ?? layers[index - 1].length - 1;

            for (; scanned <= at; scanned++) {
                const slot = layer[scanned];
                const own = innerSegment(slot, above, slots);

                for (const id of above.get(slot.id) ?? []) {
                    const order = slots.get(id)!.order;

                    if ((order < from || order > to) && order !== own)
                        marked.add(segment(id, slot.id));
                }
            }

            from = to;
        }
    }

    return marked;
}

/** Where a virtual node's own virtual predecessor stands in the layer before, when it has one: the segment between them is inner. */
function innerSegment(slot: Slot, above: Map<string, string[]>, slots: Map<string, Slot>): number | undefined {
    if (slot.real)
        return undefined;

    const from = slots.get((above.get(slot.id) ?? [])[0]);

    return from === undefined || from.real ? undefined : from.order;
}

function segment(earlier: string, later: string): string {
    return `${earlier}\u0000${later}`;
}

/**
 * How far the later end's line stands from the earlier end's, along the order axis, when the two meet the link at one level — zero
 * when both meet it on their lines. Keyed as `segment` keys a link; of two links between one pair, the first speaks for both.
 */
function driftOf(links: readonly Chain[], slots: Map<string, Slot>): Map<string, number> {
    const drift = new Map<string, number>();

    for (const link of links) {
        const key = segment(link.from, link.to);

        if (!drift.has(key))
            drift.set(key, link.fromOffset - slots.get(link.from)!.lead - (link.toOffset - slots.get(link.to)!.lead));
    }

    return drift;
}

/** Each node's block, by the block's first node, and how far the node's line stands from that first node's. */
type Blocks = { readonly root: Map<string, string>; readonly shift: Map<string, number> };

/**
 * Lines each node up with the median of its neighbours in the row before (the first of two, then the second) while it stands past
 * its row's last alignment, so no two cross; it stands off that neighbour by the link's drift, so the link runs straight.
 */
function align(rows: readonly Slot[][], adjacent: Map<string, string[]>, conflicts: Set<string>, drift: Map<string, number>, slots: Map<string, Slot>): Blocks {
    const root = new Map<string, string>();
    const shift = new Map<string, number>();
    const position = new Map<string, number>();

    for (const row of rows) {
        row.forEach((slot, at) => {
            root.set(slot.id, slot.id);
            shift.set(slot.id, 0);
            position.set(slot.id, at);
        });
    }

    for (const row of rows.slice(1)) {
        let last = -1;

        for (const slot of row) {
            const others = [...new Set(adjacent.get(slot.id) ?? [])].sort((left, right) => position.get(left)! - position.get(right)!);

            for (const at of new Set([Math.floor((others.length - 1) / 2), Math.ceil((others.length - 1) / 2)])) {
                const other = others[at];

                if (other === undefined)
                    continue;

                const earlier = slots.get(other)!.layer < slot.layer;
                const key = earlier ? segment(other, slot.id) : segment(slot.id, other);

                if (!conflicts.has(key) && last < position.get(other)!) {
                    root.set(slot.id, root.get(other)!);
                    shift.set(slot.id, shift.get(other)! + (earlier ? drift.get(key)! : -drift.get(key)!));
                    last = position.get(other)!;
                    break;
                }
            }
        }
    }

    return { root, shift };
}

/**
 * Packs the blocks toward the rows' start as the order allows (the longest path over "stands after"): each node sits at its block's
 * coordinate plus its own shift, apart from the node before by what of each stands between them plus the gap. Reversed counts from
 * the far end.
 */
function compact(rows: readonly Slot[][], blocks: Blocks, nodeGap: number, reversed: boolean): Map<string, number> {
    const { root } = blocks;
    // A node's shift counted the way the pass runs: a reversed pass turns every coordinate round at the end.
    const shift = (slot: Slot): number => (reversed ? -blocks.shift.get(slot.id)! : blocks.shift.get(slot.id)!);
    const after = new Map<string, { block: string; room: number }[]>();
    const waiting = new Map<string, number>();
    // The least shift in each block: a block nothing stands before starts where its furthest-back node reaches the start.
    const lowest = new Map<string, number>();

    for (const row of rows) {
        for (const slot of row) {
            waiting.set(root.get(slot.id)!, waiting.get(root.get(slot.id)!) ?? 0);
            lowest.set(root.get(slot.id)!, Math.min(lowest.get(root.get(slot.id)!) ?? 0, shift(slot)));
        }

        for (let at = 1; at < row.length; at++) {
            const block = root.get(row[at - 1].id)!;
            const next = root.get(row[at].id)!;
            // Measured in the layer's own order whichever end the row is walked from: a node's line need not be its middle.
            const [first, second] = reversed ? [row[at], row[at - 1]] : [row[at - 1], row[at]];
            const room = first.breadth - first.lead + nodeGap + second.lead + shift(row[at - 1]) - shift(row[at]);
            const list = after.get(block);

            if (list === undefined)
                after.set(block, [{ block: next, room }]);
            else
                list.push({ block: next, room });

            waiting.set(next, waiting.get(next)! + 1);
        }
    }

    const coordinate = new Map<string, number>();
    const ready = [...waiting].filter(([, count]) => count === 0).map(([block]) => block);

    for (const block of waiting.keys()) {
        const least = lowest.get(block)!;

        // Plain zero, never minus zero, when nothing stands off the root: a zero's sign reaches the answer through a reversed pass.
        coordinate.set(block, least < 0 ? -least : 0);
    }

    // Read by a cursor rather than shifted off the front, which would move every block still waiting.
    for (let next = 0; next < ready.length; next++) {
        const block = ready[next];

        for (const { block: next, room } of after.get(block) ?? []) {
            coordinate.set(next, Math.max(coordinate.get(next)!, coordinate.get(block)! + room));
            waiting.set(next, waiting.get(next)! - 1);

            if (waiting.get(next) === 0)
                ready.push(next);
        }
    }

    const centers = new Map<string, number>();

    for (const row of rows) {
        for (const slot of row)
            centers.set(slot.id, (reversed ? -1 : 1) * (coordinate.get(root.get(slot.id)!)! + shift(slot)));
    }

    return centers;
}

/**
 * The narrowest of the four alignments, the first of equals — not their balance (each node's two middle places averaged), which
 * stands a node lined up with different neighbours half way between them: what this placement exists to undo.
 */
function narrowest(layers: readonly Slot[][], variants: readonly Map<string, number>[]): Map<string, number> {
    const all = layers.flat();
    const widths = variants.map(centers => {
        const least = Math.min(...all.map(slot => centers.get(slot.id)! - slot.lead));
        const most = Math.max(...all.map(slot => centers.get(slot.id)! + slot.breadth - slot.lead));

        return most - least;
    });

    return variants[widths.indexOf(Math.min(...widths))];
}
