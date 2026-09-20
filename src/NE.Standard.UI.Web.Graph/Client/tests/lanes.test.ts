// Where the stepped edges of a layered sheet turn: a lane per fork and per merge, in the order that crosses least, and the drawing
// that follows them — a sheet whose layers run backwards included.

import assert from "node:assert/strict";
import test from "node:test";

import { drawEdge } from "../src/canvas/geometry.ts";
import { assignLanes } from "../src/canvas/lanes.ts";
import type { LaneLeg } from "../src/canvas/lanes.ts";

const leg = (source: string, target: string, from: number, to: number, along = 0, until = 100): LaneLeg =>
    ({ id: `${source}>${target}`, from: { along, across: from }, to: { along: until, across: to }, source, target });

test("the edges that cross one gap between different nodes do not turn on one line", () => {
    // Three powders into two crafts, as the capsule's sheet has them: the middle one forks to both.
    const lanes = assignLanes([leg("iron", "dense", 0, 50), leg("leaf", "dense", 100, 50), leg("leaf", "ground", 100, 150), leg("flower", "ground", 200, 150)]);

    assert.equal(lanes.get("leaf>dense"), lanes.get("leaf>ground"), "a fork keeps one lane");
    assert.equal(new Set(lanes.values()).size, 3);

    for (const at of lanes.values())
        assert.ok(at > 14 && at < 86, `${at} keeps clear of both layers`);
});

test("a straight leg takes no lane, and neither does one too short to turn in", () => {
    const lanes = assignLanes([leg("a", "b", 10, 10), leg("c", "d", 0, 40, 0, 30), leg("e", "f", 0, 80)]);

    assert.deepEqual([...lanes.keys()], ["e>f"]);
    assert.equal(lanes.get("e>f"), 50);
});

test("the legs that enter one node from apart share the lane they merge in", () => {
    const lanes = assignLanes([leg("a", "sum", 0, 50), leg("b", "sum", 100, 50)]);

    assert.equal(lanes.get("a>sum"), lanes.get("b>sum"));
});

test("the lanes stand in the order that crosses least", () => {
    // Both run downwards, the upper one ending below where the lower one sets out. With the upper one turning first, its flat run on
    // crosses the lower one's upright and the lower one's flat run out crosses its own: two crossings that the other order has none of.
    const lanes = assignLanes([leg("upper", "b", 0, 120), leg("lower", "d", 100, 200)]);

    assert.ok(lanes.get("lower>d")! < lanes.get("upper>b")!, "the lower one turns first");
});

test("two gaps are shared out apart", () => {
    const lanes = assignLanes([leg("a", "b", 0, 50, 0, 100), leg("c", "d", 0, 50, 200, 300)]);

    assert.equal(lanes.get("a>b"), 50);
    assert.equal(lanes.get("c>d"), 250);
});

test("a stepped edge turns in its lane, and half way along with none", () => {
    const from = { x: 0, y: 0 };
    const to = { x: 100, y: 40 };

    assert.equal(drawEdge("orthogonal", from, to, [], { turns: [30] }).path, "M0,0 L30,0 L30,40 L100,40");
    assert.equal(drawEdge("orthogonal", from, to).path, "M0,0 L50,0 L50,40 L100,40");
    // A lane is never so close to an end that the arrow's head has nowhere to stand.
    assert.equal(drawEdge("orthogonal", from, to, [], { turns: [99] }).path, "M0,0 L88,0 L88,40 L100,40");
});

test("an edge running towards its axis's start is the mirror of one running towards its end", () => {
    assert.equal(drawEdge("orthogonal", { x: 100, y: 0 }, { x: 0, y: 40 }, [], { reversed: true, turns: [70] }).path, "M100,0 L70,0 L70,40 L0,40");
    assert.equal(drawEdge("orthogonal", { x: 0, y: 100 }, { x: 40, y: 0 }, [], { axis: "vertical", reversed: true }).path, "M0,100 L0,50 L40,50 L40,0");

    const arrow = drawEdge("orthogonal", { x: 100, y: 0 }, { x: 0, y: 40 }, [], { reversed: true, arrow: true }).arrow;

    assert.ok(arrow !== null && arrow.startsWith("M0,40 L9,"), "the head points the way the edge arrives");
});
