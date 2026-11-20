// Arrange: the node canvas laid out by the layered layout (`graph/layered.ts`) from left to right, each wire's two pins lined up
// where the layout lines its ends up, and the gap after a column as wide as the lanes of the wires leaving it need.

import type { Point } from "../canvas/canvas-model.ts";
import { snap } from "../canvas/geometry.ts";
import { LaneMargin, LaneSpacing } from "../canvas/lanes.ts";
import type { LayeredEdge, LayeredNode } from "../graph/layered.ts";
import { layered } from "../graph/layered.ts";
import type { DocumentEdge, GraphDocument } from "./model.ts";

type NodeSize = { readonly width: number; readonly height: number };

export type ArrangeOptions = {
    /** The size of every node, by id; a node the caller did not measure takes the fallback. */
    readonly sizes: ReadonlyMap<string, NodeSize>;
    readonly fallback?: NodeSize;
    /** How far below its node's top a pin's middle stands; unset or null, the wire is taken at the node's middle. */
    readonly pinOffset?: (nodeId: string, pinName: string, direction: "in" | "out") => number | null;
    /** The least room between two columns; a column whose wires leave it in many lanes takes more. */
    readonly columnGap?: number;
    readonly rowGap?: number;
    /** Only these nodes move; the rest stay where they are. Unset, the whole document is arranged. */
    readonly only?: ReadonlySet<string>;
    /** The grid the answer stands on; unset or zero, it is left where the layout put it. */
    readonly gridSize?: number;
};

/**
 * Where every arranged node lands, by id: the whole document from the origin, a selection from its old box's top-left so it stays
 * put. A pinned node stays, and neither it nor its wires take part.
 */
export function arrange(document: GraphDocument, options: ArrangeOptions): Map<string, Point> {
    const fallback = options.fallback ?? { width: 220, height: 120 };
    const columnGap = options.columnGap ?? 80;
    const moving = document.nodes.filter(node => node.pinned !== true && (options.only === undefined || options.only.has(node.id)));

    if (moving.length === 0)
        return new Map();

    const movingIds = new Set(moving.map(node => node.id));
    const wires = document.edges.filter(edge => movingIds.has(edge.fromNode) && movingIds.has(edge.toNode));
    const nodes = moving.map(node => {
        const size = options.sizes.get(node.id) ?? fallback;

        return { id: node.id, width: size.width, height: size.height };
    });
    const edges = wires.map(wire => ({
        id: wire.id,
        from: wire.fromNode,
        to: wire.toNode,
        fromOffset: options.pinOffset?.(wire.fromNode, wire.fromPin, "out") ?? undefined,
        toOffset: options.pinOffset?.(wire.toNode, wire.toPin, "in") ?? undefined
    }));
    const selection = options.only !== undefined;
    let originX = Number.POSITIVE_INFINITY;
    let originY = Number.POSITIVE_INFINITY;

    // A loop rather than a spread: thousands of nodes pass more arguments than a call may take.
    for (const node of moving) {
        originX = Math.min(originX, node.x);
        originY = Math.min(originY, node.y);
    }

    const rowGap = options.rowGap ?? 32;
    const positions = layered(nodes, edges, {
        direction: "right",
        layerGap: columnGap,
        layerGaps: layers => gapsAfter(wires, layers, columnGap),
        nodeGap: rowGap,
        originX: selection ? originX : 0,
        originY: selection ? originY : 0
    }).positions;

    if ((options.gridSize ?? 0) > 0)
        placeOnGrid(positions, nodes, edges, options.gridSize!, rowGap);

    return positions;
}

/**
 * Puts the answer on the grid without bending what the layout made straight: every left edge on a line, and each run of nodes joined
 * by level wires moved as one so its first node's top is on a line — every top on a line would step a wire between pins at different
 * depths by a few pixels. Where two runs in overlapping columns snap toward each other, the lower run steps down by whole grid cells
 * so their vertical clearance never drops below what the layered layout gave them.
 */
function placeOnGrid(positions: Map<string, Point>, nodes: readonly LayeredNode[], edges: readonly LayeredEdge[], gridSize: number, rowGap: number): void {
    const beforeY = new Map<string, number>();

    for (const node of nodes) {
        const place = positions.get(node.id);

        if (place !== undefined)
            beforeY.set(node.id, place.y);
    }

    const heights = new Map(nodes.map(node => [node.id, node.height]));
    const order = new Map(nodes.map((node, index) => [node.id, index]));
    const runs = new Map<string, string>(nodes.map(node => [node.id, node.id]));
    const runOf = (id: string): string => {
        const parent = runs.get(id)!;

        return parent === id ? id : runOf(parent);
    };

    for (const edge of edges) {
        const from = positions.get(edge.from);
        const to = positions.get(edge.to);

        if (from === undefined || to === undefined)
            continue;

        const out = from.y + (edge.fromOffset ?? heights.get(edge.from)! / 2);
        const into = to.y + (edge.toOffset ?? heights.get(edge.to)! / 2);

        const left = runOf(edge.from);
        const right = runOf(edge.to);

        if (Math.abs(out - into) >= 0.5 || left === right)
            continue;

        // Joined under whichever node the document names first, so the same sheet always puts the same node on the line.
        const [first, second] = order.get(left)! < order.get(right)! ? [left, right] : [right, left];

        runs.set(second, first);
    }

    const shifts = new Map<string, number>();
    const runMembers = new Map<string, string[]>();

    for (const node of nodes) {
        const place = positions.get(node.id);

        if (place === undefined)
            continue;

        const run = runOf(node.id);

        if (!shifts.has(run))
            shifts.set(run, snap(positions.get(run)!.y, gridSize, true) - positions.get(run)!.y);

        positions.set(node.id, { x: snap(place.x, gridSize, true), y: place.y + shifts.get(run)! });

        let members = runMembers.get(run);

        if (members === undefined) {
            members = [];
            runMembers.set(run, members);
        }

        members.push(node.id);
    }

    separateRunsOnGrid(positions, nodes, beforeY, runOf, runMembers, gridSize, rowGap);
}

function separateRunsOnGrid(positions: Map<string, Point>, nodes: readonly LayeredNode[], beforeY: ReadonlyMap<string, number>, runOf: (id: string) => string, runMembers: ReadonlyMap<string, readonly string[]>, gridSize: number, rowGap: number): void {
    if (rowGap <= 0)
        return;

    for (let pass = 0; pass < runMembers.size; pass++) {
        let moved = false;

        for (let i = 0; i < nodes.length; i++) {
            const upper = nodes[i];
            const upperPlace = positions.get(upper.id);
            const upperBeforeY = beforeY.get(upper.id);

            if (upperPlace === undefined || upperBeforeY === undefined)
                continue;

            const upperRun = runOf(upper.id);

            for (let j = 0; j < nodes.length; j++) {
                if (i === j)
                    continue;

                const lower = nodes[j];
                const lowerRun = runOf(lower.id);

                if (lowerRun === upperRun)
                    continue;

                const lowerPlace = positions.get(lower.id);
                const lowerBeforeY = beforeY.get(lower.id);

                if (lowerPlace === undefined || lowerBeforeY === undefined)
                    continue;

                if (upperPlace.x >= lowerPlace.x + lower.width || lowerPlace.x >= upperPlace.x + upper.width)
                    continue;

                const beforeGap = lowerBeforeY - (upperBeforeY + upper.height);

                if (beforeGap < -0.5)
                    continue;

                const wantedGap = Math.min(rowGap, Math.max(0, beforeGap));
                const shortfall = upperPlace.y + upper.height + wantedGap - lowerPlace.y;

                if (shortfall <= 0.5)
                    continue;

                const step = Math.ceil((shortfall - 0.5) / gridSize) * gridSize;

                for (const memberId of runMembers.get(lowerRun)!) {
                    const memberPlace = positions.get(memberId)!;

                    positions.set(memberId, { x: memberPlace.x, y: memberPlace.y + step });
                }

                moved = true;
            }
        }

        if (!moved)
            break;
    }
}

/**
 * The room after each column whose wires need more than the least: a lane apiece plus a margin either side, bundled as
 * `canvas/lanes.ts` bundles them (an output's forked wires share its lane, the rest the lane of the input they merge into). A wire
 * running back against the columns turns in no gap of its own.
 */
function gapsAfter(wires: readonly DocumentEdge[], layers: ReadonlyMap<string, number>, columnGap: number): Map<number, number> {
    const leaving = wires.filter(wire => layers.get(wire.toNode)! > layers.get(wire.fromNode)!);
    const forks = new Map<string, number>();

    for (const wire of leaving)
        forks.set(`${wire.fromNode}:${wire.fromPin}`, (forks.get(`${wire.fromNode}:${wire.fromPin}`) ?? 0) + 1);

    const bundles = new Map<number, Set<string>>();

    for (const wire of leaving) {
        const source = `${wire.fromNode}:${wire.fromPin}`;
        const layer = layers.get(wire.fromNode)!;
        const lanes = bundles.get(layer) ?? new Set<string>();

        lanes.add((forks.get(source) ?? 0) > 1 ? `from:${source}` : `to:${wire.toNode}:${wire.toPin}`);
        bundles.set(layer, lanes);
    }

    return new Map([...bundles].map(([layer, lanes]) => [layer, Math.max(columnGap, LaneMargin * 2 + (lanes.size - 1) * LaneSpacing)]));
}
