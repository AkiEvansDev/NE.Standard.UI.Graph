// The corpus both ports of the plan are held to: `plan-corpus.json` carries the catalogues, what was asked of them and the answers,
// and NE.Test.Standard.UI.Graph reads the same file against the C# port. A change to the solver that only one side got fails here
// and there.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { readEntry } from "../src/production/model.ts";
import type { ProductionEntry } from "../src/production/model.ts";
import { solvePlan } from "../src/production/plan.ts";
import type { PlanRequest } from "../src/production/plan.ts";

type Expected = {
    status: string;
    runs: Record<string, number>;
    workers?: Record<string, number>;
    surplus: Record<string, number>;
    time: number;
    raw: number;
    cost: number;
};

type Case = { case: string; entries: unknown[]; request: PlanRequest; expected: Expected };

const corpus = JSON.parse(readFileSync(fileURLToPath(new URL("./plan-corpus.json", import.meta.url)), "utf8")) as { cases: Case[] };
const Tolerance = 1e-6;

function close(actual: number, expected: number, name: string): void {
    assert.ok(Math.abs(actual - expected) <= Tolerance, `${name}: ${actual} is not ${expected}`);
}

for (const entry of corpus.cases) {
    test(`corpus: ${entry.case}`, () => {
        const entries = entry.entries.map(readEntry).filter((read): read is ProductionEntry => read !== null);
        const plan = solvePlan(entries, entry.request);

        assert.equal(plan.status, entry.expected.status);
        assert.deepEqual(plan.crafts.map(craft => craft.craft).sort(), Object.keys(entry.expected.runs).sort());

        for (const craft of plan.crafts) {
            close(craft.runs, entry.expected.runs[craft.craft], `${craft.craft} (runs)`);

            if (entry.expected.workers !== undefined)
                assert.equal(craft.workers, entry.expected.workers[craft.craft], `${craft.craft} (workers)`);
            else
                assert.equal(craft.workers, null);
        }

        assert.deepEqual(plan.resources.filter(resource => resource.surplus !== 0).map(resource => resource.resource).sort(), Object.keys(entry.expected.surplus).sort());

        for (const resource of plan.resources) {
            close(resource.surplus, entry.expected.surplus[resource.resource] ?? 0, `${resource.resource} (surplus)`);
            // What is made covers what is taken and what was asked: the one thing every plan has to be.
            assert.ok(resource.source || resource.produced - resource.consumed - resource.target >= -Tolerance, `${resource.resource} comes out short`);
        }

        close(plan.time, entry.expected.time, "time");
        close(plan.raw, entry.expected.raw, "raw");
        close(plan.cost, entry.expected.cost, "cost");
    });
}
