import assert from "node:assert/strict";
import test from "node:test";
import type { CanvasServices } from "../src/canvas/canvas-kind.ts";
import type { LayeredDocument } from "../src/graph/layered-sheet.ts";
import { edgeSides, LayeredSheet } from "../src/graph/layered-sheet.ts";
import { real } from "./fake-dom.ts";

const plant = { x: 200, y: 0, width: 60, height: 60 };
const seed = { x: 0, y: 0, width: 60, height: 60 };

test("a forward edge leaves the middle of the side facing the next layer and enters the middle of the side facing the last", () => {
    assert.deepEqual(edgeSides(seed, plant, "right", false, false), { start: { x: 60, y: 30 }, end: { x: 200, y: 30 } });
    assert.deepEqual(edgeSides(seed, plant, "left", false, false), { start: { x: 0, y: 30 }, end: { x: 260, y: 30 } });
});

test("a backward edge spans the gap between the two facing sides, high on each, clear of the tops a node's chip stands on", () => {
    // The plant feeds its seed back: from the plant's side facing the seed to the seed's side facing the plant, 35% down both.
    assert.deepEqual(edgeSides(plant, seed, "right", true, false), { start: { x: 200, y: 21 }, end: { x: 60, y: 21 } });

    const below = { x: 0, y: 200, width: 60, height: 60 };

    assert.deepEqual(edgeSides(below, seed, "down", true, false), { start: { x: 21, y: 200 }, end: { x: 21, y: 60 } });
    assert.deepEqual(edgeSides(seed, below, "up", true, false), { start: { x: 21, y: 60 }, end: { x: 21, y: 200 } });
});

test("a node's link to itself leaves by the side facing the next layer and comes back by the other, both high up", () => {
    assert.deepEqual(edgeSides(seed, seed, "right", true, true), { start: { x: 60, y: 21 }, end: { x: 0, y: 21 } });
    assert.deepEqual(edgeSides(seed, seed, "left", true, true), { start: { x: 0, y: 21 }, end: { x: 60, y: 21 } });
});

test("in a vertical layout an edge meeting a node's bottom ends under what the node wears there, a circle's name", () => {
    const below = { x: 0, y: 200, width: 60, height: 60 };
    const feet = { from: 38, to: 38 };

    assert.deepEqual(edgeSides(seed, below, "down", false, false, feet), { start: { x: 30, y: 98 }, end: { x: 30, y: 200 } });
    assert.deepEqual(edgeSides(below, seed, "up", false, false, feet), { start: { x: 30, y: 200 }, end: { x: 30, y: 98 } });
    assert.deepEqual(edgeSides(below, seed, "down", true, false, feet), { start: { x: 21, y: 200 }, end: { x: 21, y: 98 } });
    assert.deepEqual(edgeSides(seed, plant, "right", false, false, feet), { start: { x: 60, y: 30 }, end: { x: 200, y: 30 } }, "a side is met at the node's own middle");
});

test("a node added under the key of one removed after the viewer moved it takes that place over rather than standing in two", () => {
    const document: LayeredDocument = { nodes: [{ id: "node-1", x: 300, y: 300 }], edges: [], groups: [] };
    const services = real<CanvasServices<LayeredDocument>>({ root: { getAttribute: () => null }, documentState: { document } });
    const sheet = new LayeredSheet(services, { nodeIds: () => [], links: () => [], layoutKey: () => "" }, { nodeGap: 32 });

    sheet.placeAt("node-1", { x: 10, y: 20 });

    assert.deepEqual(document.nodes, [{ id: "node-1", x: 10, y: 20, pinned: false }]);
});

test("cards in one layer share a snapped leading edge, and a long edge's route follows the snapped level of the end it runs level with", () => {
    const step = 32;
    const snap = (value: number): number => Math.round(value / step) * step;
    const sizes = new Map([
        ["primitives", { width: 148, height: 60 }],
        ["storage", { width: 136, height: 60 }],
        ["schema", { width: 164, height: 60 }],
        ["runtime", { width: 156, height: 60 }],
        ["components", { width: 184, height: 60 }],
        ["accounts", { width: 148, height: 60 }],
        ["sessions", { width: 148, height: 60 }],
        ["api", { width: 168, height: 60 }],
        ["web", { width: 148, height: 60 }],
        ["admin", { width: 160, height: 60 }],
        ["shop", { width: 160, height: 60 }],
        ["cloud", { width: 56, height: 56 }]
    ]);
    const document: LayeredDocument = { nodes: [], edges: [], groups: [] };
    const services = real<CanvasServices<LayeredDocument>>({
        root: { getAttribute: () => null },
        documentState: { document },
        settings: { edgeShape: "orthogonal" },
        snapPlace: (id: string, at: { x: number; y: number }) => {
            const size = sizes.get(id);

            if (size === undefined)
                return { x: snap(at.x), y: snap(at.y) };

            return { x: snap(at.x + size.width / 2) - size.width / 2, y: snap(at.y + size.height / 2) - size.height / 2 };
        },
        nodeRect: (id: string) => {
            const placed = document.nodes.find(node => node.id === id);
            const size = sizes.get(id);

            return placed === undefined || size === undefined ? null : { x: placed.x, y: placed.y, width: size.width, height: size.height };
        }
    });
    const links = [
        { id: "p>s", from: "primitives", to: "schema" },
        { id: "p>r", from: "primitives", to: "runtime" },
        { id: "p>c", from: "primitives", to: "components" },
        { id: "s>st", from: "schema", to: "storage" },
        { id: "st>r", from: "storage", to: "runtime" },
        { id: "st>a", from: "storage", to: "accounts" },
        { id: "r>api", from: "runtime", to: "api" },
        { id: "r>w", from: "runtime", to: "web" },
        { id: "r>se", from: "runtime", to: "sessions" },
        { id: "c>w", from: "components", to: "web" },
        { id: "a>se", from: "accounts", to: "sessions" },
        { id: "se>a", from: "sessions", to: "accounts" },
        { id: "api>sh", from: "api", to: "shop" },
        { id: "w>ad", from: "web", to: "admin" },
        { id: "w>sh", from: "web", to: "shop" },
        { id: "ad>cl", from: "admin", to: "cloud" },
        { id: "sh>cl", from: "shop", to: "cloud" }
    ];
    const sheet = new LayeredSheet(services, { nodeIds: () => [...sizes.keys()], links: () => links, layoutKey: () => "card" }, { nodeGap: 32, layerGap: 72 });
    sheet.structureChanged();
    const positions = sheet.arrange(sizes, undefined);

    for (const [id, point] of positions)
        document.nodes.push({ id, x: point.x, y: point.y, pinned: false });

    // Runtime (156 wide), Components (184 wide) and Accounts (148 wide) stand in the same layer and share a grid-snapped leading edge.
    assert.equal(positions.get("runtime")!.x, positions.get("components")!.x);
    assert.equal(positions.get("runtime")!.x, positions.get("accounts")!.x);
    assert.equal(positions.get("runtime")!.x % step, 0);

    const schemaEnds = sheet.ends(links[0])!;
    const runtimeEnds = sheet.ends(links[1])!;
    const compEnds = sheet.ends(links[2])!;

    // All three forward edges leaving Primitives leave from one centre point; the two that turn share the first corridor's trunk, and the middle one runs straight.
    assert.deepEqual(compEnds.from, schemaEnds.from);
    assert.deepEqual(runtimeEnds.from, schemaEnds.from);
    assert.equal(compEnds.turns?.[0], schemaEnds.turns?.[0]);
    assert.equal(runtimeEnds.from.y, runtimeEnds.to.y);
    // Every route point of Primitives -> Components stands on the exact horizontal line of Components' entry, with no second bend.
    assert.ok(compEnds.via!.every(point => point.y === compEnds.to.y));
    assert.equal(compEnds.via?.[0].x, positions.get("schema")!.x);
});
