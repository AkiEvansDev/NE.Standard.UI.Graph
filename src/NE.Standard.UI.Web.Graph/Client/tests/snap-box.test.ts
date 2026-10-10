// A node's box brought onto the grid: rounded up, so the kind's least width and the contents' own height are never cut, and left
// alone where it stands on the grid already. A dropped node settles on the grid's line, or on a level wire's top near the drop.

import assert from "node:assert/strict";
import test from "node:test";

import type { CanvasSelection } from "../src/canvas/canvas-selection.ts";
import type { CanvasSettings } from "../src/canvas/canvas-settings.ts";
import type { DragHost } from "../src/canvas/canvas-drag.ts";
import { CanvasDrag, snapBoxes } from "../src/canvas/canvas-drag.ts";

function box(width: number, height: number, folded = false): { element: HTMLElement; written: Map<string, string> } {
    const written = new Map<string, string>();
    const element = {
        offsetWidth: width,
        offsetHeight: height,
        hasAttribute: (name: string) => folded && name === "data-ui-graph-collapsed",
        style: { setProperty: (name: string, value: string) => written.set(name, value) }
    };

    return { element: element as unknown as HTMLElement, written };
}

test("a box is rounded up to the grid's step, each side by itself", () => {
    const node = box(216, 97);

    snapBoxes([node.element], 20);

    assert.deepEqual([...node.written], [["--ui-graph-node-w", "220"], ["--ui-graph-node-h", "100"]]);
});

test("a folded box is rounded in width only, keeping its head's own height", () => {
    const folded = box(133, 35, true);

    snapBoxes([folded.element], 20);

    assert.deepEqual([...folded.written], [["--ui-graph-node-w", "140"]]);
});

test("a box that stands on the grid is left alone, and so is every box while the grid has no step", () => {
    const standing = box(220, 100);
    const loose = box(213, 97);

    snapBoxes([standing.element], 20);
    snapBoxes([loose.element], 0);

    assert.equal(standing.written.size, 0);
    assert.equal(loose.written.size, 0);
});

/** A node dropped at `y` on a grid of 20, whose kind says its wires run level at `levels`; answers where it settles. */
function drop(y: number, levels: readonly number[]): { x: number; y: number; asked: ReadonlySet<string>[] } {
    const node = { id: "n", x: 47, y };
    const asked: ReadonlySet<string>[] = [];
    const host = {
        nodeElements: new Map(),
        items: () => [node],
        kind: () => ({
            levelTops: (_id: string, moving: ReadonlySet<string>) => {
                asked.push(moving);

                return levels;
            }
        })
    };

    new CanvasDrag({} as CanvasSelection, host as unknown as DragHost, { gridSize: 20 } as CanvasSettings).snapNodes(["n"]);

    return { x: node.x, y: node.y, asked };
}

test("a dropped node settles on a level wire's top within half a step of the drop, else on the grid's line", () => {
    assert.deepEqual([drop(190, [193]).x, drop(190, [193]).y], [40, 193]);
    // Nearer than the grid's own line does not matter: within half a step, the level wins, and the nearest level of several.
    assert.equal(drop(200, [209, 193]).y, 193);
    assert.equal(drop(200, [211]).y, 200);
    assert.equal(drop(188, []).y, 180);
    assert.deepEqual([...drop(190, []).asked[0]], ["n"]);
});
