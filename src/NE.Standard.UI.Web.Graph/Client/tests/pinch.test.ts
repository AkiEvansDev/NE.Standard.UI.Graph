// Two fingers on the sheet pinch it: the zoom follows how far apart they are, around their midpoint, held to the wheel's limits; the
// pan follows the midpoint's move; one finger alone is no pinch, and the one left after a pinch pans on from where it stands.

import assert from "node:assert/strict";
import test from "node:test";
import { pinchView } from "../src/canvas/geometry.ts";
import { CanvasPinch } from "../src/canvas/pinch.ts";

const Start = { zoom: 1, panX: 0, panY: 0 };

test("fingers spread twice as far zoom twice as near, the point under their midpoint staying under it", () => {
    const view = pinchView(Start, { x: 100, y: 100 }, 100, { x: 100, y: 100 }, 200, 0.25, 2.5);

    assert.deepEqual(view, { zoom: 2, panX: -100, panY: -100 });
    // The sheet's point (100, 100) still stands at the midpoint.
    assert.equal(100 * view.zoom + view.panX, 100);
});

test("a midpoint that moves pans the sheet with it, and the zoom stops at the wheel's limits", () => {
    assert.deepEqual(pinchView(Start, { x: 100, y: 100 }, 100, { x: 140, y: 90 }, 100, 0.25, 2.5), { zoom: 1, panX: 40, panY: -10 });
    assert.equal(pinchView(Start, { x: 0, y: 0 }, 100, { x: 0, y: 0 }, 1000, 0.25, 2.5).zoom, 2.5);
    assert.equal(pinchView(Start, { x: 0, y: 0 }, 100, { x: 0, y: 0 }, 1, 0.25, 2.5).zoom, 0.25);
});

test("one finger is no pinch; the second begins one, and their moves make the view", () => {
    const pinch = new CanvasPinch();

    assert.equal(pinch.down(1, { x: 50, y: 100 }, Start), false);
    assert.equal(pinch.move(1, { x: 60, y: 100 }, 0.25, 2.5), null);
    assert.equal(pinch.pinching, false);

    assert.equal(pinch.down(2, { x: 160, y: 100 }, Start), true);
    assert.equal(pinch.pinching, true);

    // From 100 apart around (110, 100) to 200 apart around (160, 100): twice as near, and moved by the midpoint.
    assert.deepEqual(pinch.move(2, { x: 260, y: 100 }, 0.25, 2.5), { zoom: 2, panX: -60, panY: -100 });
    assert.deepEqual(pinch.move(1, { x: 10, y: 100 }, 0.25, 2.5), { zoom: 2.5, panX: -140, panY: -150 });
});

test("a finger lifted ends the pinch and hands back the one left down; a third finger is no part of it", () => {
    const pinch = new CanvasPinch();

    pinch.down(1, { x: 0, y: 0 }, Start);
    pinch.down(2, { x: 100, y: 0 }, Start);
    assert.equal(pinch.down(3, { x: 50, y: 50 }, Start), false);
    assert.equal(pinch.move(3, { x: 70, y: 70 }, 0.25, 2.5), null);

    assert.deepEqual(pinch.up(3), { ended: false, left: null });
    assert.deepEqual(pinch.up(1), { ended: true, left: { x: 100, y: 0 } });
    assert.equal(pinch.pinching, false);
    assert.deepEqual(pinch.up(2), { ended: false, left: null });
});
