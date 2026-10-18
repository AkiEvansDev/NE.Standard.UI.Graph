// A group's frame sized from its corner, by the node's own drag: it follows the pointer, never closes over its band and a step
// under it nor narrower than a folded node, settles on the grid's step when the grid holds, and moves no node; the corner is drawn
// on every frame of an editable sheet, a pinned one too, and on none of a read-only one; the corner held wears its held look.

import assert from "node:assert/strict";
import test from "node:test";
import type { PluginEngineContext } from "ne-standard-ui";
import type { CanvasGroup, CanvasItem } from "../src/canvas/canvas-model.ts";
import type { DragHost } from "../src/canvas/canvas-drag.ts";
import type { CanvasSelection } from "../src/canvas/canvas-selection.ts";
import type { CanvasSettings } from "../src/canvas/canvas-settings.ts";
import { FakeElement, installFakeDom, real } from "./fake-dom.ts";

installFakeDom({ CSS: { escape: (value: string) => value } });

const { CanvasDrag } = await import("../src/canvas/canvas-drag.ts");
const { CanvasRender } = await import("../src/canvas/canvas-render.ts");

/** A frame `g` 300×200 at (40, 60) on a grid of 20, its band 28 high, around a node; answers the drag and what it drew. */
function frame() {
    const group: CanvasGroup = { id: "g", x: 40, y: 60, width: 300, height: 200 };
    const node: CanvasItem = { id: "n", x: 80, y: 120 };
    const band = FakeElement.of("ui-graph__group-band");
    const grip = FakeElement.of("ui-graph__resize");
    const element = FakeElement.of("ui-graph__group", { "data-ui-graph-group": "g" }).append(band, grip);
    let drawn = 0;

    band.rect = { left: 0, top: 0, width: 300, height: 28 };
    element.rect = { left: 0, top: 0, width: 300, height: 200 };

    const host = {
        nodeElements: new Map(),
        items: () => [node],
        groups: () => [group],
        drawGroups: () => drawn++,
        drawEdges: () => undefined,
        drawMinimap: () => undefined
    };
    const dragging = new CanvasDrag(real<CanvasSelection>({}), real<DragHost>(host), real<CanvasSettings>({ readOnly: false, gridSize: 20 }));
    const drag = dragging.beginResize(real(element), real(grip), { x: 340, y: 260 });

    if (drag.kind !== "resize")
        assert.fail("the frame's corner began no resize");

    return { group, node, grip, dragging, drag, drawn: () => drawn };
}

test("the corner held wears its held look, which the viewport's capture would take off its hover", () => {
    const at = frame();

    assert.equal(at.grip.hasAttribute("data-ui-graph-resizing"), true);
    assert.equal(at.drag.grip, real(at.grip));
});

test("the frame's corner follows the pointer, as a node's does, and redraws the frame", () => {
    const at = frame();

    assert.deepEqual([at.drag.of, at.drag.id, at.drag.width, at.drag.height], ["group", "g", 300, 200]);

    at.dragging.resize(at.drag, { x: 413.4, y: 297.6 });

    assert.deepEqual([at.group.width, at.group.height], [373, 238]);
    assert.ok(at.drawn() > 0);
});

test("a frame never closes over its band and a step under it, nor narrower than a folded node", () => {
    const at = frame();

    assert.deepEqual(at.drag.least, { width: 120, height: 48 });

    at.dragging.resize(at.drag, { x: -500, y: -500 });

    assert.deepEqual([at.group.width, at.group.height], [120, 48]);
});

test("let go with the grid holding, the size lands on the nearest step, and never under the least taken up to the next one", () => {
    const at = frame();

    at.dragging.resize(at.drag, { x: 413, y: 291 });
    at.dragging.snapSize(at.drag);

    assert.deepEqual([at.group.width, at.group.height], [380, 240]);

    // 48 high at the least, between two steps: the floor takes the larger, so the frame's foot stands on the grid.
    at.dragging.resize(at.drag, { x: -500, y: -500 });
    at.dragging.snapSize(at.drag);

    assert.deepEqual([at.group.width, at.group.height], [120, 60]);
});

test("a frame resized moves nothing, and keeps its place", () => {
    const at = frame();

    at.dragging.resize(at.drag, { x: 100, y: 100 });
    at.dragging.snapSize(at.drag);

    assert.deepEqual([at.node.x, at.node.y, at.group.x, at.group.y], [80, 120, 40, 60]);
});

test("a node's corner is still the node's: its floors are the stylesheet's, not a frame's", () => {
    const element = FakeElement.of("ui-graph__node", { "data-ui-graph-node": "n" });

    element.rect = { left: 0, top: 0, width: 220, height: 100 };

    const dragging = new CanvasDrag(real<CanvasSelection>({}), real<DragHost>({ items: () => [], groups: () => [] }), real<CanvasSettings>({ gridSize: 20 }));
    const drag = dragging.beginResize(real(element), real(FakeElement.of("ui-graph__resize")), { x: 0, y: 0 });

    assert.deepEqual(drag.kind === "resize" ? [drag.of, drag.id, drag.least] : null, ["node", "n", { width: 1, height: 1 }]);
});

/** The frames drawn on a sheet holding a plain and a pinned group, editable or read-only: whether each carries the corner. */
function corners(readOnly: boolean): boolean[] {
    const groupLayer = FakeElement.of("ui-graph__groups");
    const context = real<PluginEngineContext>({
        names: { contextMenuUse: "data-ui-context-menu-use" },
        strings: { text: () => "Group" },
        icons: { apply: () => undefined }
    });
    const document = { groups: [{ id: "a", x: 0, y: 0, width: 300, height: 200 }, { id: "b", x: 400, y: 0, width: 300, height: 200, pinned: true }] };
    const render = new CanvasRender(context, real({}), real({}), real(groupLayer), real({}), real({}), new Map(), real({ document }), real({ has: () => false }), real({ readOnly }), real({}), real(() => ({})));

    render.drawGroups();

    return groupLayer.children.map(group => group.querySelector("[data-ui-graph-resize]") !== null);
}

test("every frame of an editable sheet carries the corner, a pinned one too, and no frame of a read-only sheet does", () => {
    assert.deepEqual(corners(false), [true, true]);
    assert.deepEqual(corners(true), [false, false]);
});
