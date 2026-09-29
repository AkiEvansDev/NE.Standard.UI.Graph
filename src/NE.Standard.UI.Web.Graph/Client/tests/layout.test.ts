import assert from "node:assert/strict";
import test from "node:test";
import { arrange } from "../src/nodes/layout.ts";
import type { DocumentEdge, DocumentNode, GraphDocument } from "../src/nodes/model.ts";

function chain(): GraphDocument {
    return {
        nodes: [
            { id: "a", type: "Number", x: 500, y: 500, values: {} },
            { id: "b", type: "Number", x: 500, y: 500, values: {} },
            { id: "c", type: "Add", x: 500, y: 500, values: {} }
        ],
        edges: [
            { id: "e1", fromNode: "a", fromPin: "Result", toNode: "c", toPin: "Left", points: [] },
            { id: "e2", fromNode: "b", fromPin: "Result", toNode: "c", toPin: "Right", points: [] }
        ],
        groups: [],
        key: null,
        parameters: []
    };
}

function sheet(nodes: DocumentNode[], edges: DocumentEdge[]): GraphDocument {
    return { nodes, edges, groups: [], key: null, parameters: [] };
}

function node(id: string, x = 0, y = 0): DocumentNode {
    return { id, type: "Pass", x, y, values: {} };
}

function wire(fromNode: string, fromPin: string, toNode: string, toPin: string): DocumentEdge {
    return { id: `${fromNode}.${fromPin}>${toNode}.${toPin}`, fromNode, fromPin, toNode, toPin, points: [] };
}

/** A pin reader over a table keyed "node:direction:pin", as the canvas reads pins off the page. */
function pins(table: Record<string, number>): (nodeId: string, pinName: string, direction: "in" | "out") => number | null {
    return (nodeId, pinName, direction) => table[`${nodeId}:${direction}:${pinName}`] ?? null;
}

const sizes = new Map([["a", { width: 200, height: 100 }], ["b", { width: 200, height: 100 }], ["c", { width: 200, height: 100 }]]);

test("a node stands one column right of everything feeding it", () => {
    const placed = arrange(chain(), { sizes, columnGap: 80, rowGap: 20 });

    assert.equal(placed.get("a")!.x, 0);
    assert.equal(placed.get("b")!.x, 0);
    assert.equal(placed.get("c")!.x, 280);
});

test("a consumer stands opposite what feeds it: its input level with the output wired into it", () => {
    const document = sheet([node("random"), node("display"), node("number"), node("log")], [wire("random", "Value", "display", "Input"), wire("number", "Result", "log", "Input")]);
    const offsets = pins({ "random:out:Value": 70, "display:in:Input": 30, "number:out:Result": 20, "log:in:Input": 44 });
    const placed = arrange(document, {
        sizes: new Map([["random", { width: 200, height: 100 }], ["display", { width: 240, height: 160 }], ["number", { width: 200, height: 40 }], ["log", { width: 200, height: 90 }]]),
        pinOffset: offsets
    });

    assert.equal(placed.get("display")!.y + 30, placed.get("random")!.y + 70);
    assert.equal(placed.get("log")!.y + 44, placed.get("number")!.y + 20);
});

test("on a grid, every left edge stands on a line and a run of level wires moves as one, so its wires stay straight", () => {
    const ids = ["a", "b", "c"];
    const document = sheet([...ids.map(id => node(id)), node("lone")], [wire("a", "Out", "b", "In"), wire("b", "Out", "c", "In")]);
    const offsets = pins({ "a:out:Out": 33, "b:in:In": 17, "b:out:Out": 61, "c:in:In": 29 });
    const placed = arrange(document, {
        sizes: new Map([["a", { width: 190, height: 70 }], ["b", { width: 210, height: 130 }], ["c", { width: 170, height: 50 }], ["lone", { width: 200, height: 90 }]]),
        pinOffset: offsets,
        gridSize: 20
    });

    for (const place of placed.values())
        assert.equal(place.x % 20, 0);

    assert.equal(placed.get("a")!.y % 20, 0);
    assert.equal(placed.get("lone")!.y % 20, 0);
    assert.equal(placed.get("b")!.y + 17, placed.get("a")!.y + 33);
    assert.equal(placed.get("c")!.y + 29, placed.get("b")!.y + 61);
});

test("a chain of nodes of different heights, a pin apiece, comes out as straight wires", () => {
    const ids = ["a", "b", "c", "d"];
    const heights = [60, 140, 40, 100];
    const document = sheet(ids.map(id => node(id)), ids.slice(1).map((id, index) => wire(ids[index], "Out", id, "In")));
    const table: Record<string, number> = {};

    ids.forEach((id, index) => {
        table[`${id}:in:In`] = 20 + index * 7;
        table[`${id}:out:Out`] = heights[index] - 18;
    });

    const placed = arrange(document, { sizes: new Map(ids.map((id, index) => [id, { width: 180, height: heights[index] }])), pinOffset: pins(table) });

    for (let index = 1; index < ids.length; index++) {
        const from = placed.get(ids[index - 1])!.y + table[`${ids[index - 1]}:out:Out`];
        const to = placed.get(ids[index])!.y + table[`${ids[index]}:in:In`];

        assert.equal(to, from, `${ids[index - 1]} > ${ids[index]}`);
    }
});

test("a node fed by two stands with one of its inputs level with what feeds it", () => {
    const placed = arrange(chain(), { sizes, pinOffset: pins({ "a:out:Result": 60, "b:out:Result": 60, "c:in:Left": 40, "c:in:Right": 70 }) });
    const c = placed.get("c")!.y;

    assert.ok(c + 40 === placed.get("a")!.y + 60 || c + 70 === placed.get("b")!.y + 60, `neither input of c at ${c} is level with its feeder`);
});

test("a pin the page does not show falls back to the node's middle", () => {
    const document = sheet([node("a"), node("b")], [wire("a", "Out", "b", "In")]);
    const placed = arrange(document, { sizes: new Map([["a", { width: 100, height: 40 }], ["b", { width: 100, height: 80 }]]), pinOffset: pins({}) });

    assert.equal(placed.get("a")!.y + 20, placed.get("b")!.y + 40);
});

test("a pinned node is left where it is and takes no column", () => {
    const document = chain();

    document.nodes[0].pinned = true;

    const placed = arrange(document, { sizes });

    assert.equal(placed.has("a"), false);
    assert.equal(placed.get("b")!.x, 0);
    assert.equal(document.nodes[0].x, 500);
});

test("only the named nodes move when a selection is arranged", () => {
    const placed = arrange(chain(), { sizes, only: new Set(["b", "c"]) });

    assert.equal(placed.has("a"), false);
    assert.equal(placed.has("b"), true);
    assert.equal(placed.has("c"), true);
});

test("an arranged selection keeps the top-left corner of the box it stood in", () => {
    const document = sheet([node("a", 0, 0), node("b", 640, 420), node("c", 900, 380), node("d", 700, 900)], [wire("a", "Out", "b", "In"), wire("b", "Out", "c", "In"), wire("b", "Out", "d", "In")]);
    const placed = arrange(document, { sizes: new Map(), fallback: { width: 160, height: 60 }, only: new Set(["b", "c", "d"]) });
    const points = [...placed.values()];

    assert.equal(placed.has("a"), false);
    assert.equal(Math.min(...points.map(point => point.x)), 640);
    assert.equal(Math.min(...points.map(point => point.y)), 380);
});

test("the whole sheet is arranged from the origin", () => {
    const placed = arrange(chain(), { sizes });
    const points = [...placed.values()];

    assert.equal(Math.min(...points.map(point => point.x)), 0);
    assert.equal(Math.min(...points.map(point => point.y)), 0);
});

test("a cycle is cut rather than followed for ever", () => {
    const document = sheet([node("a"), node("b")], [wire("a", "Output", "b", "Input"), wire("b", "Output", "a", "Input")]);
    const placed = arrange(document, { sizes: new Map([["a", { width: 100, height: 50 }], ["b", { width: 100, height: 50 }]]) });

    assert.equal(placed.size, 2);
    assert.notEqual(placed.get("a")!.x, placed.get("b")!.x);
});

test("the gap after a column widens for the wires that leave it, a lane apiece", () => {
    const outputs = ["a", "b", "c", "d", "e", "f"];
    // Six inputs, not one that takes six: wires merging into one input would share a lane.
    const document = sheet([...outputs.map(id => node(id)), node("sum")], outputs.map(id => wire(id, "Result", "sum", `In${id}`)));
    const placed = arrange(document, { sizes: new Map(), fallback: { width: 200, height: 40 }, columnGap: 80, rowGap: 20 });

    // Six lanes fourteen apart, fourteen clear of either side: 98, not the 80 asked for.
    assert.equal(placed.get("sum")!.x, 298);
});

test("wires that fork from one output share its lane, and the gap stays the least asked for", () => {
    const targets = ["a", "b", "c", "d", "e", "f"];
    const document = sheet([node("source"), ...targets.map(id => node(id))], targets.map(id => wire("source", "Result", id, "In")));
    const placed = arrange(document, { sizes: new Map(), fallback: { width: 200, height: 40 }, columnGap: 80 });

    assert.equal(placed.get("a")!.x, 280);
});
