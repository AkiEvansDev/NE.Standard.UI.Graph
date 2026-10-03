import assert from "node:assert/strict";
import test from "node:test";
import { bounds, contains, drawEdge, edgePath, fitClearOf, fitView, intersects, pressedInPlace, showsAny, snap, wheelZoom } from "../src/canvas/geometry.ts";

// The framework's notch, which `context.wheel.notch` carries: its reading turns lines and pages into pixels before the zoom sees them.
const Notch = 100;

test("a mouse notch zooms by a tenth, either way", () => {
    assert.ok(Math.abs(wheelZoom({ x: 0, y: -100 }, Notch) - 1.1) < 1e-9);
    assert.ok(Math.abs(wheelZoom({ x: 0, y: 100 }, Notch) - 1 / 1.1) < 1e-9);
});

test("a sideways swipe and a turn of nothing do not zoom", () => {
    assert.equal(wheelZoom({ x: 40, y: 0 }, Notch), 1);
    assert.equal(wheelZoom({ x: 40, y: 3 }, Notch), 1);
    assert.equal(wheelZoom({ x: 0, y: 0 }, Notch), 1);
});

test("a trackpad's small steps come to what one notch does over the same distance", () => {
    let zoom = 1;

    for (let step = 0; step < 25; step++)
        zoom *= wheelZoom({ x: 0, y: -4 }, Notch);

    assert.ok(Math.abs(zoom - 1.1) < 1e-9);
});

test("a flick is held to three notches", () => {
    assert.ok(Math.abs(wheelZoom({ x: 0, y: 5000 }, Notch) - 1.1 ** -3) < 1e-9);
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

    // Lifted 20 plus a tenth of the 300 it spans above the higher of the two ends, its handles leaning 64 inwards, the most they lean.
    assert.equal(arc, "M300,100 C236,50 64,50 0,100");

    // Over a short gap the handles lean nearly half of it, so the arc sets out low, and are drawn in to a circle's: round, not peaked.
    assert.equal(drawEdge("bezier", { x: 100, y: 100 }, { x: 0, y: 100 }, [], { back: true }).path, "M100,100 C69.72,79.81 30.28,79.81 0,100");

    const bent = drawEdge("straight", { x: 300, y: 100 }, { x: 0, y: 100 }, [{ x: 150, y: 300 }], { back: true }).path;

    assert.equal(bent, "M300,100 L150,300 L0,100");
});

test("a short backward arc follows a circle through its ends, so it reads round rather than peaked", () => {
    const [x0, y0, x1, y1, x2, y2, x3, y3] = drawEdge("bezier", { x: 124, y: 0 }, { x: 0, y: 0 }, [], { back: true }).path.match(/-?[\d.]+/g)!.map(Number);
    const at = (t: number): [number, number] => {
        const rest = 1 - t;

        return [
            rest ** 3 * x0 + 3 * rest * rest * t * x1 + 3 * rest * t * t * x2 + t ** 3 * x3,
            rest ** 3 * y0 + 3 * rest * rest * t * y1 + 3 * rest * t * t * y2 + t ** 3 * y3
        ];
    };
    // The circle through both ends and the top: its centre on the ends' bisector, as far from the top as from an end.
    const [, top] = at(0.5);
    const centre = (top * top - 62 * 62) / (2 * top);
    const radius = Math.abs(centre - top);

    for (let step = 1; step < 10; step++) {
        const [x, y] = at(step / 10);

        assert.ok(Math.abs(Math.hypot(x - 62, y - centre) - radius) < radius * 0.005, `t=${step / 10}`);
    }
});

test("a node's edge to itself rises well over the node, its handles reaching out past its sides, and arrives into the side it enters by", () => {
    // Leaving the right side of a node 56 across, 17 down it, and entering its left side as high.
    const drawing = drawEdge("orthogonal", { x: 56, y: 17 }, { x: 0, y: 17 }, [], { back: true, loop: true, arrow: true });

    assert.equal(drawing.path, "M56,17 C72,-39 -16,-39 0,17");
    // The arrow's tip stands at the left side, reached from above and outside it.
    assert.match(drawing.arrow!, /^M0,17 /);
});

test("an arrow's head points the way the edge arrives", () => {
    const drawing = drawEdge("straight", { x: 0, y: 0 }, { x: 100, y: 0 }, [], { arrow: true });

    assert.equal(drawing.arrow, "M100,0 L91,3.5 L91,-3.5 Z");
    assert.equal(drawEdge("straight", { x: 0, y: 0 }, { x: 100, y: 0 }).arrow, null);
});

test("a slanted edge is painted as the straight pieces of its path, each carrying how far along the edge it starts", () => {
    const bent = drawEdge("straight", { x: 0, y: 0 }, { x: 60, y: 0 }, [{ x: 30, y: 40 }]).pieces;

    assert.deepEqual(bent, [
        { x1: 0, y1: 0, x2: 30, y2: 40, along: 0 },
        { x1: 30, y1: 40, x2: 60, y2: 0, along: 50 }
    ]);
});

test("an edge whose every step runs along an axis is painted as its path, which draws crisp", () => {
    assert.equal(drawEdge("orthogonal", { x: 0, y: 0 }, { x: 100, y: 40 }).pieces, null);
    assert.equal(drawEdge("straight", { x: 0, y: 0 }, { x: 100, y: 0 }).pieces, null);
    assert.notEqual(drawEdge("orthogonal", { x: 300, y: 100 }, { x: 0, y: 100 }, [], { back: true }).pieces, null);
});

test("a curved edge is cut into pieces about four long, joined end to end from one pin to the other", () => {
    const pieces = drawEdge("bezier", { x: 0, y: 0 }, { x: 200, y: 100 }).pieces ?? [];
    const lengths = pieces.map(piece => Math.hypot(piece.x2 - piece.x1, piece.y2 - piece.y1));

    assert.deepEqual([pieces[0].x1, pieces[0].y1], [0, 0]);
    assert.deepEqual([pieces[pieces.length - 1].x2, pieces[pieces.length - 1].y2], [200, 100]);
    assert.ok(Math.max(...lengths) < 6 && Math.min(...lengths) > 1, `pieces from ${Math.min(...lengths)} to ${Math.max(...lengths)} long`);

    for (let i = 1; i < pieces.length; i++) {
        assert.ok(pieces[i].x1 === pieces[i - 1].x2 && pieces[i].y1 === pieces[i - 1].y2, `piece ${i} starts where the one before ends`);
        assert.ok(Math.abs(pieces[i].along - (pieces[i - 1].along + lengths[i - 1])) < 1e-9, `piece ${i} picks the dash up where the one before left it`);
    }
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

test("fitting keeps the room a side asks for, and centres the content in what is left", () => {
    const view = fitView({ x: 0, y: 0, width: 200, height: 100 }, 600, 400, 0.25, 1, 48, { top: 100, right: 0, bottom: 0, left: 0 });

    assert.equal(view.zoom, 1);
    assert.equal(view.panX, 300 - 100);
    assert.equal(view.panY, 100 + (400 - 100 - 48) / 2 - 50);
});

test("a fit keeps the sheet clear of the top's chrome, beside a corner's box or under it, whichever zooms larger", () => {
    const band = { x: 0, y: 0, width: 800, height: 22 };
    const menu = { x: 8, y: 30, width: 36, height: 36 };
    const panel = { x: 690, y: 30, width: 102, height: 90 };
    // As tall as the view is wide: a narrow column of the trailing side costs less than a strip across the top.
    const tall = fitClearOf({ x: 0, y: 0, width: 800, height: 800 }, 800, 600, 0.1, 1, [band, menu, panel]);

    assert.equal(tall.zoom, (600 - 48 * 2) / 800);
    assert.ok(tall.panX + 800 * tall.zoom <= 690 - 8);
    assert.ok(tall.panY >= 30);

    // Wide and low: a strip across the top costs less than the trailing side.
    const wide = fitClearOf({ x: 0, y: 0, width: 1600, height: 200 }, 800, 600, 0.1, 1, [band, menu, panel]);

    assert.equal(wide.zoom, (800 - 48 * 2) / 1600);
    assert.ok(wide.panY >= 30 + 90 + 8);

    // A part over an open side panel's column, or one that is hidden, takes nothing.
    const clear = fitClearOf({ x: 0, y: 0, width: 200, height: 100 }, 600, 400, 0.1, 1, [{ x: 640, y: 8, width: 40, height: 40 }, { x: 0, y: 0, width: 0, height: 0 }]);

    assert.deepEqual(clear, fitView({ x: 0, y: 0, width: 200, height: 100 }, 600, 400, 0.1, 1));
});

test("a kept view shows the sheet while any node stands in the viewport, and none once every node lies past an edge", () => {
    const nodes = [{ x: 0, y: 0, width: 200, height: 100 }, { x: 400, y: 600, width: 200, height: 100 }];

    assert.equal(showsAny(nodes, { zoom: 1, panX: 0, panY: 0 }, 800, 600), true);
    // Panned so the sheet lies above the view, as a view kept before the sheet's nodes moved up can leave it.
    assert.equal(showsAny(nodes, { zoom: 1, panX: 0, panY: -800 }, 800, 600), false);
    // At half the zoom the same pan shows the lower node again: the view is read in the sheet's own coordinates.
    assert.equal(showsAny(nodes, { zoom: 0.5, panX: 0, panY: -320 }, 800, 600), true);
    assert.equal(showsAny([], { zoom: 1, panX: 0, panY: 0 }, 800, 600), false);
});

test("snapping rounds to the step, and leaves the value alone when it is off", () => {
    assert.equal(snap(23, 20, true), 20);
    assert.equal(snap(31, 20, true), 40);
    assert.equal(snap(23, 20, false), 23);
});

test("a fit on a narrow canvas leaves a share of its width around the sheet, not a desktop's 48 px", () => {
    const phone = fitClearOf({ x: 0, y: 0, width: 1000, height: 200 }, 342, 548, 0.05, 1, []);

    // 342 / 12 = 28.5 on each side: the sheet takes 285 px of the width.
    assert.equal(phone.zoom, 0.285);
    assert.deepEqual(fitClearOf({ x: 0, y: 0, width: 1000, height: 200 }, 1200, 548, 0.05, 1, []), fitView({ x: 0, y: 0, width: 1000, height: 200 }, 1200, 548, 0.05, 1));
});

test("a press let go within four of the viewport's pixels of its place is a click; one dragged further is not, at any zoom", () => {
    assert.equal(pressedInPlace({ x: 10, y: 10 }, { x: 10, y: 10 }, 1), true);
    assert.equal(pressedInPlace({ x: 10, y: 10 }, { x: 13, y: 10 }, 1), true);
    assert.equal(pressedInPlace({ x: 10, y: 10 }, { x: 15, y: 10 }, 1), false);
    // Five units on a sheet zoomed to half are two and a half pixels under the hand; at twice, ten.
    assert.equal(pressedInPlace({ x: 0, y: 0 }, { x: 5, y: 0 }, 0.5), true);
    assert.equal(pressedInPlace({ x: 0, y: 0 }, { x: 5, y: 0 }, 2), false);
});
