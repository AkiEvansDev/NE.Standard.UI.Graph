// The sheet's Escape is its own while something stands chosen: the selection says after every change whether anything does, so the
// canvas claims the key (a dialog or a drawer around it stays) only while Escape has a choice to let go of.

import assert from "node:assert/strict";
import test from "node:test";
import { CanvasSelection } from "../src/canvas/canvas-selection.ts";
import { FakeElement, installFakeDom, real } from "./fake-dom.ts";

installFakeDom();

function selection(): { selection: CanvasSelection; heard: boolean[] } {
    const heard: boolean[] = [];
    const root = FakeElement.of("ui-graph").append(FakeElement.of("ui-graph__marquee"));
    const host = {
        items: () => [],
        nodeRect: () => null,
        drawEdges: () => undefined,
        chosenChanged: (any: boolean) => heard.push(any)
    };

    return { selection: new CanvasSelection(real(root), new Map(), real(FakeElement.of("ui-graph__groups")), host), heard };
}

test("a node or an edge chosen claims the sheet's Escape, and letting go of the last gives it back", () => {
    const at = selection();

    at.selection.select("a", false);
    at.selection.toggleEdge("e1", true);
    at.selection.clearSelection();

    assert.deepEqual(at.heard, [true, true, false]);

    at.selection.selectOnlyMany(["a", "b"]);
    at.selection.pruneNodes(new Set());
    at.selection.toggleEdge("e1", false);
    at.selection.toggleEdge("e1", true);
    at.selection.selectAll(["c"]);
    at.selection.clearSets();

    assert.deepEqual(at.heard.slice(3), [true, false, true, false, true, false]);
});
