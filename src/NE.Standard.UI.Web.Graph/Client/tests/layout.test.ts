import assert from "node:assert/strict";
import test from "node:test";
import { arrange } from "../src/nodes/layout.ts";
import type { GraphDocument } from "../src/nodes/model.ts";

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
        groups: []
    };
}

const sizes = new Map([["a", { width: 200, height: 100 }], ["b", { width: 200, height: 100 }], ["c", { width: 200, height: 100 }]]);

test("a node stands one column right of everything feeding it", () => {
    const placed = arrange(chain(), { sizes, columnGap: 80, rowGap: 20 });

    assert.equal(placed.get("a")!.x, 0);
    assert.equal(placed.get("b")!.x, 0);
    assert.equal(placed.get("c")!.x, 280);
});

test("a column is stacked, and the node below starts under the one above", () => {
    const placed = arrange(chain(), { sizes, columnGap: 80, rowGap: 20 });

    assert.equal(placed.get("a")!.y, 0);
    assert.equal(placed.get("b")!.y, 120);
});

test("a pinned node is left where it is and takes no column", () => {
    const document = chain();

    document.nodes[0].pinned = true;

    const placed = arrange(document, { sizes });

    assert.equal(placed.has("a"), false);
    assert.equal(placed.get("b")!.x, 0);
});

test("only the named nodes move when a selection is arranged", () => {
    const placed = arrange(chain(), { sizes, only: new Set(["b", "c"]) });

    assert.equal(placed.has("a"), false);
    assert.equal(placed.has("b"), true);
    assert.equal(placed.has("c"), true);
});

test("a cycle is cut rather than followed for ever", () => {
    const document: GraphDocument = {
        nodes: [
            { id: "a", type: "Pass", x: 0, y: 0, values: {} },
            { id: "b", type: "Pass", x: 0, y: 0, values: {} }
        ],
        edges: [
            { id: "e1", fromNode: "a", fromPin: "Output", toNode: "b", toPin: "Input", points: [] },
            { id: "e2", fromNode: "b", fromPin: "Output", toNode: "a", toPin: "Input", points: [] }
        ],
        groups: []
    };

    const placed = arrange(document, { sizes: new Map([["a", { width: 100, height: 50 }], ["b", { width: 100, height: 50 }]]) });

    assert.equal(placed.size, 2);
});
