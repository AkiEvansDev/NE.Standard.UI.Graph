import assert from "node:assert/strict";
import test from "node:test";
import { edgeSides } from "../src/graph/layered-sheet.ts";

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
