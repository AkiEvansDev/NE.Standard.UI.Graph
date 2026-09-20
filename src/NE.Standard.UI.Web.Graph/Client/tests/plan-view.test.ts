// How a solved plan is read off the sheet: what it draws of the catalogue, and what stands on a resource, a craft and an edge in
// place of one run's numbers. The solver itself is held by the corpus (`plan.test.ts`).

import assert from "node:assert/strict";
import test from "node:test";

import { readEntry, readProductionDocument } from "../src/production/model.ts";
import type { ProductionEntry } from "../src/production/model.ts";
import { solvePlan } from "../src/production/plan.ts";
import type { PlanRequest } from "../src/production/plan.ts";
import { craftNote, edgeFlow, formatFlow, planEntries, readPlan, resourceChip } from "../src/production/plan-view.ts";

const words = { text: (key: string) => (key === "ui.graph.per-hour" ? "/h" : key === "ui.graph.per-minute" ? "/min" : "{count} at once") };

const amount = (resource: string, value: number) => ({ resource, amount: value });
const resource = (id: string) => ({ kind: "Resource", id });
const craft = (id: string, time: number, ingredients: unknown[], products: unknown[]) => ({ kind: "Craft", id, time, ingredients, products });

// ore -> ingot by either of two recipes, 2 ingots -> plate, and a wire nothing here asks for.
const entries = [
    resource("ore"), resource("ingot"), resource("plate"), resource("wire"),
    craft("smelt", 2, [amount("ore", 1)], [amount("ingot", 1)]),
    craft("blast", 1, [amount("ore", 3)], [amount("ingot", 2)]),
    craft("press", 3, [amount("ingot", 2)], [amount("plate", 1)]),
    craft("draw", 1, [amount("ingot", 1)], [amount("wire", 4)])
].map(readEntry).filter((entry): entry is ProductionEntry => entry !== null);

function reading(request: PlanRequest) {
    return readPlan(solvePlan(entries, request), request.period);
}

test("a plan draws the crafts that run and the resources they touch, and nothing else", () => {
    const plan = reading({ targets: [amount("plate", 5)], period: "Once", objective: "LeastRaw" });

    assert.deepEqual(planEntries(entries, plan).map(entry => entry.id), ["ore", "ingot", "plate", "smelt", "press"]);
});

test("made once, a resource says its total and its craft's time; a source, what is brought in", () => {
    const plan = reading({ targets: [amount("plate", 5)], period: "Once", objective: "LeastRaw" });

    assert.equal(resourceChip(plan.resources.get("ingot")!, null, plan.crafts.get("smelt"), words), "×10 · 20 s");
    assert.equal(resourceChip(plan.resources.get("ore")!, "kg", undefined, words), "×10 kg");
    assert.equal(craftNote(plan.crafts.get("press")!, words), "×5 · 15 s");
    assert.equal(formatFlow(plan.crafts.get("press")!.runs * 2, null), "×10");
});

test("an edge says its amount only where the node it leaves does not say it already", () => {
    // Plates and wire both out of the ingots: all along the chain the edge would repeat the chip, and where the ingots part it says
    // how they are shared out.
    const plan = reading({ targets: [amount("plate", 5), amount("wire", 8)], period: "Once", objective: "LeastRaw" });
    const ingot = plan.resources.get("ingot")!;

    assert.equal(ingot.produced, 12);
    assert.equal(edgeFlow(12, plan.resources.get("ore"), null), null);
    assert.equal(edgeFlow(10, ingot, null), "×10");
    assert.equal(edgeFlow(2, ingot, null), "×2");
    // A target that is taken further too: the chip says all that is made, the edge what goes on.
    assert.equal(edgeFlow(4, { resource: "x", source: false, target: 6, produced: 10, consumed: 4, surplus: 0 }, null), "×4");
});

test("counted over a period, a craft says how many of it keep up in place of its time", () => {
    const plan = reading({ targets: [amount("plate", 900)], period: "Hour", objective: "LeastRaw" });
    // The sheet writes a number the viewer's own way; the test asks for the same rather than for a comma.
    const ingots = new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 }).format(1800);

    // The period is the whole plan's and the panel's to name: the sheet's own numbers do not repeat it.
    assert.equal(resourceChip(plan.resources.get("ingot")!, null, plan.crafts.get("smelt"), words), `×${ingots} · 1 at once`);
    assert.equal(craftNote(plan.crafts.get("press")!, words), "×900 · 1 at once");
    assert.equal(reading({ targets: [amount("plate", 3600)], period: "Hour", objective: "LeastRaw" }).crafts.get("press")!.workers, 3);
});

test("what is made least chooses the recipe, and the sheet draws the one chosen", () => {
    const plan = reading({ targets: [amount("plate", 5)], period: "Once", objective: "LeastTime" });

    assert.deepEqual(planEntries(entries, plan).filter(entry => entry.kind === "craft").map(entry => entry.id), ["blast", "press"]);
});

test("a document's plan comes off the wire by the server's names, in whichever case, and an unknown one reads as the default", () => {
    assert.deepEqual(readProductionDocument({ plan: { targets: [amount("plate", 2)], period: "hour", objective: "LeastCost", bought: ["ingot"] } }).plan, { targets: [amount("plate", 2)], period: "Hour", objective: "LeastCost", bought: ["ingot"] });
    assert.deepEqual(readProductionDocument({ plan: { period: "Fortnight" } }).plan, { targets: [], period: "Once", objective: "LeastRaw", bought: [] });
    assert.deepEqual(readProductionDocument({}).plan, { targets: [], period: "Once", objective: "LeastRaw", bought: [] });
});

test("a made resource the plan brings in is drawn with nothing behind it", () => {
    const plan = reading({ targets: [amount("plate", 4)], period: "Once", objective: "LeastRaw", bought: ["ingot"] });

    assert.deepEqual(planEntries(entries, plan).map(entry => entry.id), ["ingot", "plate", "press"]);
    assert.equal(plan.resources.get("ingot")!.source, true);
    assert.equal(resourceChip(plan.resources.get("ingot")!, null, undefined, words), "×8");
});
