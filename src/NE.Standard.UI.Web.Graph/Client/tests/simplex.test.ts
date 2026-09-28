// The solver under the plan, on the programmes a catalogue cannot build: one no x reaches, and one whose cost falls without end.
// The plan tells the two apart — "no runs reach these targets" is wrong for a cost that only needed a bound.

import assert from "node:assert/strict";
import test from "node:test";

import { minimise } from "../src/production/simplex.ts";

test("a programme no x reaches is infeasible", () => {
    assert.equal(minimise({ rows: [[-1]], atLeast: [1], cost: [1], tieCost: [0] }), "infeasible");
});

test("a cost that falls without end is unsettled, not infeasible", () => {
    assert.equal(minimise({ rows: [[1]], atLeast: [1], cost: [-1], tieCost: [0] }), "unsettled");
});

test("a bounded programme answers its least", () => {
    assert.deepEqual(minimise({ rows: [[1, 1]], atLeast: [2], cost: [3, 1], tieCost: [0, 0] }), [0, 2]);
});
