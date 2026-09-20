// A node's box brought onto the grid: rounded up, so the kind's least width and the contents' own height are never cut, and left
// alone where it stands on the grid already.

import assert from "node:assert/strict";
import test from "node:test";

import { snapBoxes } from "../src/canvas/canvas-drag.ts";

function box(width: number, height: number): { element: HTMLElement; written: Map<string, string> } {
    const written = new Map<string, string>();
    const element = { offsetWidth: width, offsetHeight: height, style: { setProperty: (name: string, value: string) => written.set(name, value) } };

    return { element: element as unknown as HTMLElement, written };
}

test("a box is rounded up to the grid's step, each side by itself", () => {
    const node = box(216, 97);

    snapBoxes([node.element], 20);

    assert.deepEqual([...node.written], [["--ui-graph-node-w", "220"], ["--ui-graph-node-h", "100"]]);
});

test("a box that stands on the grid is left alone, and so is every box while the grid has no step", () => {
    const standing = box(220, 100);
    const loose = box(213, 97);

    snapBoxes([standing.element], 20);
    snapBoxes([loose.element], 0);

    assert.equal(standing.written.size, 0);
    assert.equal(loose.written.size, 0);
});
