import assert from "node:assert/strict";
import test from "node:test";
import { bounds, contains, drawEdge, edgePath, fitView, intersects, snap, wheelZoom } from "../src/canvas/geometry.ts";

test("a mouse notch zooms by a tenth, either way", () => {
    assert.ok(Math.abs(wheelZoom(0, -100, 0) - 1.1) < 1e-9);
    assert.ok(Math.abs(wheelZoom(0, 100, 0) - 1 / 1.1) < 1e-9);
    // Three lines are a notch where the wheel counts in lines.
    assert.ok(Math.abs(wheelZoom(0, 3, 1) - wheelZoom(0, 99, 0)) < 1e-9);
});

test("a sideways swipe and a turn of nothing do not zoom", () => {
    assert.equal(wheelZoom(40, 0, 0), 1);
    assert.equal(wheelZoom(40, 3, 0), 1);
    assert.equal(wheelZoom(0, 0, 0), 1);
});

test("a trackpad's small steps come to what one notch does over the same distance", () => {
    let zoom = 1;

    for (let step = 0; step < 25; step++)
        zoom *= wheelZoom(0, -4, 0);

    assert.ok(Math.abs(zoom - 1.1) < 1e-9);
});

test("a flick is held to three notches", () => {
    assert.ok(Math.abs(wheelZoom(0, 5000, 0) - 1.1 ** -3) < 1e-9);
});

test("a straight edge is the stops joined in order", () => {
    assert.equal(edgePath("straight", { x: 0, y: 0 }, { x: 100, y: 50 }), "M0,0 L100,50");
    assert.equal(edgePath("straight", { x: 0, y: 0 }, { x: 100, y: 50 }, [{ x: 40, y: 10 }]), "M0,0 L40,10 L100,50");
});

test("a bezier edge leaves each pin sideways", () => {
    const path = edgePath("bezier", { x: 0, y: 0 }, { x: 200, y: 0 });

    assert.match(path, /^M0,0 C/);
    assert.ok(path.endsWith("200,0"));
});

test("a bezier edge running backwards reaches further, so the loop is drawn outside the pins", () => {
    const forward = edgePath("bezier", { x: 0, y: 0 }, { x: 200, y: 0 });
    const backward = edgePath("bezier", { x: 200, y: 0 }, { x: 0, y: 0 });

    const forwardHandle = Number(forward.split("C")[1].split(",")[0]);
    const backwardHandle = Number(backward.split("C")[1].split(",")[0]) - 200;

    assert.ok(backwardHandle > forwardHandle);
});

test("an orthogonal edge turns half way when there is room, and outside the pins when there is not", () => {
    assert.equal(edgePath("orthogonal", { x: 0, y: 0 }, { x: 100, y: 40 }), "M0,0 L50,0 L50,40 L100,40");

    const tight = edgePath("orthogonal", { x: 100, y: 0 }, { x: 0, y: 40 });

    assert.equal(tight, "M100,0 L124,0 L124,20 L-24,20 L-24,40 L0,40");
});

test("a vertical edge is the horizontal one turned: it leaves downwards and enters from above", () => {
    const path = drawEdge("orthogonal", { x: 0, y: 0 }, { x: 40, y: 100 }, [], { axis: "vertical" }).path;

    assert.equal(path, "M0,0 L0,50 L40,50 L40,100");
});

test("a backward edge arcs beside its two ends, away from the nodes between them, and bends through the viewer's points instead", () => {
    const arc = drawEdge("bezier", { x: 300, y: 100 }, { x: 0, y: 100 }, [], { back: true }).path;

    // Lifted 20 plus a tenth of the 300 it spans above the higher of the two ends, its handles leaning a fifth of the span inwards.
    assert.equal(arc, "M300,100 C240,50 60,50 0,100");

    const bent = drawEdge("straight", { x: 300, y: 100 }, { x: 0, y: 100 }, [{ x: 150, y: 300 }], { back: true }).path;

    assert.equal(bent, "M300,100 L150,300 L0,100");
});

test("an arrow's head points the way the edge arrives", () => {
    const drawing = drawEdge("straight", { x: 0, y: 0 }, { x: 100, y: 0 }, [], { arrow: true });

    assert.equal(drawing.arrow, "M100,0 L91,3.5 L91,-3.5 Z");
    assert.equal(drawEdge("straight", { x: 0, y: 0 }, { x: 100, y: 0 }).arrow, null);
});

test("bounds hold every rectangle", () => {
    assert.deepEqual(bounds([{ x: 10, y: 10, width: 20, height: 20 }, { x: 40, y: 0, width: 10, height: 10 }]), { x: 10, y: 0, width: 40, height: 30 });
    assert.equal(bounds([]), null);
});

test("intersects and contains answer what a band and a group ask", () => {
    const frame = { x: 0, y: 0, width: 100, height: 100 };

    assert.equal(intersects(frame, { x: 90, y: 90, width: 40, height: 40 }), true);
    assert.equal(intersects(frame, { x: 120, y: 0, width: 10, height: 10 }), false);
    assert.equal(contains(frame, { x: 10, y: 10, width: 20, height: 20 }), true);
    assert.equal(contains(frame, { x: 90, y: 90, width: 40, height: 40 }), false);
});

test("fitting puts the content in the middle of the viewport", () => {
    const view = fitView({ x: 0, y: 0, width: 200, height: 100 }, 600, 400, 0.25, 2.5, 0);

    assert.equal(view.zoom, 2.5);
    assert.equal(view.panX, 600 / 2 - 100 * 2.5);
    assert.equal(view.panY, 400 / 2 - 50 * 2.5);
});

test("snapping rounds to the step, and leaves the value alone when it is off", () => {
    assert.equal(snap(23, 20, true), 20);
    assert.equal(snap(31, 20, true), 40);
    assert.equal(snap(23, 20, false), 23);
});
