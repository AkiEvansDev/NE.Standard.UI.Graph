// Sugiyama-style layered layout: cycles broken by Eades-Lin-Smyth greedy ordering, layers by longest path, long edges get virtual
// nodes, order by barycentre sweeps. Pure and deterministic — ties always fall to input order, so the same graph lays out the same way.

import type { Point } from "../canvas/canvas-model.ts";

/** Which way the layers run: the axis, and which end the first layer stands at. */
export type LayeredDirection = "right" | "down" | "left" | "up";

export type LayeredNode = { readonly id: string; readonly width: number; readonly height: number };

export type LayeredEdge = { readonly id: string; readonly from: string; readonly to: string };

export type LayeredOptions = {
    readonly direction: LayeredDirection;
    /** The room between two layers, along the layer axis; unset, it follows how deep the nodes are. */
    readonly layerGap?: number;
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
/** How many passes straighten the placed layers; each one is a sweep of the sheet, the first downwards. */
const StraightenSweeps = 6;
/** The room between layers when the caller names none: a part of how deep the nodes are, held between these two. */
const LeastLayerGap = 48;
const MostLayerGap = 96;

type Link = { readonly id: string; readonly from: string; readonly to: string };

type Slot = {
    readonly id: string;
    readonly real: boolean;
    /** The node's extent along the layer axis and the order axis. */
    readonly depth: number;
    readonly breadth: number;
    readonly input: number;
    layer: number;
    order: number;
    /** The centre along the order axis, once placed. */
    center: number;
};

export function layered(nodes: readonly LayeredNode[], edges: readonly LayeredEdge[], options: LayeredOptions): LayeredResult {
    const down = options.direction === "down" || options.direction === "up";
    // The two backward directions are the same layout turned end for end along the layer axis: one set of steps, mirrored at the last.
    const mirrored = options.direction === "left" || options.direction === "up";
    const layerGap = options.layerGap ?? autoLayerGap(nodes, down);
    const nodeGap = options.nodeGap ?? 32;
    const slots = new Map<string, Slot>();

    nodes.forEach((node, input) => {
        if (!slots.has(node.id))
            slots.set(node.id, { id: node.id, real: true, depth: down ? node.height : node.width, breadth: down ? node.width : node.height, input, layer: 0, order: 0, center: 0 });
    });

    const backEdges = new Set<string>();
    const known = edges.filter(edge => slots.has(edge.from) && slots.has(edge.to));

    for (const edge of known) {
        if (edge.from === edge.to)
            backEdges.add(edge.id);
    }

    const links = known.filter(edge => edge.from !== edge.to);
    const sequence = breakCycles([...slots.values()], links);
    const rank = new Map(sequence.map((slot, index) => [slot.id, index]));

    // Every edge now runs forward along the sequence: a backward one is turned round for the layering and remembered.
    const forward: Link[] = [];

    for (const edge of links) {
        if (rank.get(edge.from)! > rank.get(edge.to)!) {
            backEdges.add(edge.id);
            forward.push({ id: edge.id, from: edge.to, to: edge.from });
        }
        else {
            forward.push({ id: edge.id, from: edge.from, to: edge.to });
        }
    }

    assignLayers(sequence, forward, slots);

    const through = new Map<string, string[]>();
    const chains = addVirtualNodes(forward, slots, through);
    const layers = orderLayers(slots, chains);

    place(layers, chains, nodeGap);
    straighten(layers, chains, nodeGap);
    level(layers, chains, nodeGap);

    const positions = new Map<string, Point>();
    const centers = new Map<string, Point>();
    const layerOf = new Map<string, number>();
    const originX = options.originX ?? 0;
    const originY = options.originY ?? 0;
    const placed: { id: string; real: boolean; along: number; depth: number; across: number }[] = [];
    let start = 0;
    let least = Number.POSITIVE_INFINITY;

    for (const layer of layers) {
        for (const slot of layer)
            least = Math.min(least, slot.center - slot.breadth / 2);
    }

    for (const layer of layers) {
        const band = Math.max(0, ...layer.map(slot => slot.depth));

        for (const slot of layer) {
            const shift = Number.isFinite(least) ? least : 0;

            // A real node stands against the layer's leading edge so the layer reads as a column; a virtual node stays mid-band where its edge passes.
            placed.push({
                id: slot.id,
                real: slot.real,
                along: slot.real ? start : start + band / 2,
                depth: slot.real ? slot.depth : 0,
                across: slot.real ? slot.center - slot.breadth / 2 - shift : slot.center - shift
            });

            if (slot.real)
                layerOf.set(slot.id, slot.layer);
        }

        start += band + layerGap;
    }

    const extent = Math.max(0, start - layerGap);

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

/** Eades-Lin-Smyth cycle breaking: sinks to the end, sources to the front, else the node with the highest out-minus-in degree to the front; a resulting backward edge is where a cycle breaks. */
function breakCycles(all: readonly Slot[], links: readonly LayeredEdge[]): Slot[] {
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
    const front: Slot[] = [];
    const back: Slot[] = [];

    const take = (id: string): void => {
        left.delete(id);

        for (const to of outgoing.get(id)!)
            incoming.get(to)!.delete(id);

        for (const from of incoming.get(id)!)
            outgoing.get(from)!.delete(id);
    };

    // The nodes still left, in the order they came in: every choice below takes the earliest of its equals.
    const remaining = (): Slot[] => all.filter(slot => left.has(slot.id));

    while (left.size > 0) {
        let changed = true;

        while (changed) {
            changed = false;

            for (const slot of remaining()) {
                if (outgoing.get(slot.id)!.size === 0) {
                    back.unshift(slot);
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

        let best: Slot | null = null;
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

    return [...front, ...back];
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

/** An edge longer than one layer, broken into one-layer links through a virtual node per layer it crosses, which `through` lists by edge. */
function addVirtualNodes(forward: readonly Link[], slots: Map<string, Slot>, through: Map<string, string[]>): { from: string; to: string }[] {
    const links: { from: string; to: string }[] = [];
    let serial = 0;

    for (const edge of forward) {
        const from = slots.get(edge.from)!;
        const to = slots.get(edge.to)!;
        const virtuals: string[] = [];
        let previous = from.id;

        for (let layer = from.layer + 1; layer < to.layer; layer++) {
            let id = `virtual:${serial++}`;

            // A real node could carry the same name; the next free one is taken.
            while (slots.has(id))
                id = `virtual:${serial++}`;

            slots.set(id, { id, real: false, depth: 0, breadth: VirtualThickness, input: from.input, layer, order: 0, center: 0 });
            links.push({ from: previous, to: id });
            virtuals.push(id);
            previous = id;
        }

        if (virtuals.length > 0)
            through.set(edge.id, virtuals);

        links.push({ from: previous, to: to.id });
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
 * Sugiyama's priority method: each sweep pulls a node toward its neighbours' median, pushing lower-priority ones aside (virtual
 * nodes outrank real). Must stay within the sheet's originally placed extent, or a stop and its neighbour's chain can push each
 * other outward every sweep, doubling the sheet's height in six passes.
 */
function straighten(layers: readonly Slot[][], links: readonly { from: string; to: string }[], nodeGap: number): void {
    const above = neighbours(links, true);
    const below = neighbours(links, false);
    const centers = new Map<string, Slot>();

    let least = Number.POSITIVE_INFINITY;
    let most = Number.NEGATIVE_INFINITY;

    for (const layer of layers) {
        for (const slot of layer) {
            centers.set(slot.id, slot);
            least = Math.min(least, slot.center - slot.breadth / 2);
            most = Math.max(most, slot.center + slot.breadth / 2);
        }
    }

    for (let sweep = 0; sweep < StraightenSweeps; sweep++) {
        const downward = sweep % 2 === 0;

        for (let step = 1; step < layers.length; step++) {
            const index = downward ? step : layers.length - 1 - step;
            const layer = layers[index];
            const adjacent = downward ? above : below;
            const wanted = layer.map(slot => median((adjacent.get(slot.id) ?? []).map(id => centers.get(id)?.center)));
            // What a node has to say about where it stands: a virtual one holds a long edge straight, a real one speaks for its edges.
            const priority = layer.map(slot => (slot.real ? (adjacent.get(slot.id) ?? []).length : Number.POSITIVE_INFINITY));
            const order = layer.map((_, at) => at).sort((left, right) => priority[right] - priority[left] || left - right);

            for (const at of order) {
                if (wanted[at] !== null)
                    draw(layer, at, wanted[at]! - layer[at].center, priority, nodeGap, least, most);
            }
        }
    }
}

/** Draws one node of a layer towards where it wants to stand, pushing what it outranks and stopping where it does not — or at the sheet's own edge. */
function draw(layer: readonly Slot[], at: number, delta: number, priority: readonly number[], nodeGap: number, least: number, most: number): void {
    const step = Math.sign(delta);

    if (step === 0)
        return;

    const pushed: number[] = [];
    let room = Number.NaN;
    let slack = 0;

    for (let index = at + step; index >= 0 && index < layer.length; index += step) {
        const ahead = layer[index];
        const behind = layer[index - step];

        slack += Math.max(0, step > 0
            ? (ahead.center - ahead.breadth / 2) - (behind.center + behind.breadth / 2) - nodeGap
            : (behind.center - behind.breadth / 2) - (ahead.center + ahead.breadth / 2) - nodeGap);

        // A node with as much to say as this one is not pushed: this is as far as the move goes.
        if (priority[index] >= priority[at]) {
            room = slack;
            break;
        }

        pushed.push(index);
    }

    // Nothing in the way as far as the layer goes: what is left is the room between its last node and the edge of the sheet.
    if (Number.isNaN(room)) {
        const last = layer[step > 0 ? layer.length - 1 : 0];

        room = slack + Math.max(0, step > 0 ? most - (last.center + last.breadth / 2) : (last.center - last.breadth / 2) - least);
    }

    const amount = Math.min(Math.abs(delta), room);

    if (amount <= 0)
        return;

    layer[at].center += step * amount;

    let previous = at;

    for (const index of pushed) {
        const overlap = step > 0
            ? (layer[previous].center + layer[previous].breadth / 2 + nodeGap) - (layer[index].center - layer[index].breadth / 2)
            : (layer[index].center + layer[index].breadth / 2 + nodeGap) - (layer[previous].center - layer[previous].breadth / 2);

        if (overlap <= 0)
            break;

        layer[index].center += step * overlap;
        previous = index;
    }
}

/** Levels a long edge's via-stops with its source, as room allows, so it runs flat through crossed layers and bends only once, on arrival. */
function level(layers: readonly Slot[][], links: readonly { from: string; to: string }[], nodeGap: number): void {
    const above = neighbours(links, true);
    const centers = new Map<string, Slot>();

    for (const layer of layers) {
        for (const slot of layer)
            centers.set(slot.id, slot);
    }

    for (const layer of layers) {
        for (let at = 0; at < layer.length; at++) {
            const slot = layer[at];
            const wanted = slot.real ? undefined : centers.get((above.get(slot.id) ?? [])[0])?.center;

            if (wanted === undefined)
                continue;

            const before = layer[at - 1];
            const after = layer[at + 1];
            const least = before === undefined ? Number.NEGATIVE_INFINITY : before.center + before.breadth / 2 + nodeGap + slot.breadth / 2;
            const most = after === undefined ? Number.POSITIVE_INFINITY : after.center - after.breadth / 2 - nodeGap - slot.breadth / 2;

            if (least <= most)
                slot.center = Math.min(most, Math.max(least, wanted));
        }
    }
}

/** The middle of what a node is joined to, or nothing when it is joined to nothing placed. */
function median(values: readonly (number | undefined)[]): number | null {
    const known = values.filter((value): value is number => value !== undefined).sort((left, right) => left - right);

    if (known.length === 0)
        return null;

    const middle = Math.floor(known.length / 2);

    return known.length % 2 === 1 ? known[middle] : (known[middle - 1] + known[middle]) / 2;
}

/** Places the order axis: each node wants its feeders' median, overlapping nodes are pushed apart, then the layer shifts to average out at where its nodes wanted to sit. */
function place(layers: readonly Slot[][], links: readonly { from: string; to: string }[], nodeGap: number): void {
    const feeders = neighbours(links, true);

    for (const [index, layer] of layers.entries()) {
        const wanted = layer.map(slot => {
            const from = index === 0 ? [] : feeders.get(slot.id) ?? [];
            const centers = from.map(id => layers[index - 1].find(candidate => candidate.id === id)?.center).filter((center): center is number => center !== undefined);

            return centers.length === 0 ? null : centers.reduce((sum, center) => sum + center, 0) / centers.length;
        });

        let edge = Number.NEGATIVE_INFINITY;

        layer.forEach((slot, order) => {
            const start = Math.max(wanted[order] === null ? edge : wanted[order]! - slot.breadth / 2, edge);

            slot.center = (Number.isFinite(start) ? start : 0) + slot.breadth / 2;
            edge = slot.center + slot.breadth / 2 + nodeGap;
        });

        const placed = layer.map((slot, order) => (wanted[order] === null ? null : wanted[order]! - slot.center)).filter((shift): shift is number => shift !== null);

        if (placed.length > 0) {
            const shift = placed.reduce((sum, value) => sum + value, 0) / placed.length;

            for (const slot of layer)
                slot.center += shift;
        }
    }
}
