import assert from "node:assert/strict";
import test from "node:test";
import { layered } from "../src/graph/layered.ts";
import { formatAmount, formatTime, parsePositive } from "../src/production/craft-view.ts";
import { craftDraft, draftConflicts, drawProduction, overlayDraft, readEntry, readProductionDocument, readSpan, resourceDraft, writeSpan } from "../src/production/model.ts";
import type { Craft, ProductionDraft, ProductionEntry, Resource } from "../src/production/model.ts";

function resource(id: string): Resource {
    return readEntry({ kind: "Resource", id, title: id.toUpperCase() }) as Resource;
}

function craft(id: string, ingredients: [string, number][], products: [string, number][], time = "00:00:01"): Craft {
    return readEntry({
        kind: "Craft",
        id,
        ingredients: ingredients.map(([name, amount]) => ({ resource: name, amount })),
        products: products.map(([name, amount]) => ({ resource: name, amount })),
        time
    }) as Craft;
}

// The owner's example: 10 X need 10 Y and 5 Z; 1 Y needs 5 X and 1 G.
const catalogue: ProductionEntry[] = [
    resource("x"),
    resource("y"),
    resource("z"),
    resource("g"),
    craft("make-x", [["y", 10], ["z", 5]], [["x", 10]]),
    craft("make-y", [["x", 5], ["g", 1]], [["y", 1]]),
    craft("smelt", [["z", 1]], [["g", 2]], "00:00:03.5000000")
];

test("an entry is read by its kind, whichever way the kind is spelled, and one of neither kind is not", () => {
    assert.equal(readEntry({ kind: "craft", id: "c" })?.kind, "craft");
    assert.equal(readEntry({ kind: 0, id: "r" })?.kind, "resource");
    assert.equal(readEntry({ kind: "Other", id: "o" }), null);
    assert.equal(readEntry({ kind: "Resource" }), null);
});

test("a span reads as the server writes it, and seconds write back the same way", () => {
    assert.equal(readSpan("00:00:03.5000000"), 3.5);
    assert.equal(readSpan("1.02:00:00"), 93600);
    assert.equal(readSpan(12), 12);
    assert.equal(readSpan("soon"), 0);
    assert.equal(writeSpan(3.5), "00:00:03.5000000");
    assert.equal(writeSpan(93600), "1.02:00:00");
    assert.equal(readSpan(writeSpan(0.25)), 0.25);
});

test("a craft that gives one resource nothing else makes takes no room: its ingredients run straight into it", () => {
    const drawing = drawProduction(catalogue);
    const made = drawing.edges.filter(edge => edge.craft === "make-y");

    // Y is made by one craft alone, so that craft is drawn on its own edges and the resource says what a run gives.
    assert.deepEqual([...drawing.collapsed].sort(), ["make-x", "make-y", "smelt"]);
    assert.deepEqual(made.map(edge => `${edge.id}:${edge.from}->${edge.to}:${edge.role}:${edge.amount}`), [
        "make-y<x:x->y:recipe:5",
        "make-y<g:g->y:recipe:1"
    ]);
    assert.deepEqual(drawing.outputs.get("y"), { craft: "make-y", amount: 1, time: 1, edge: "make-y>y" });
    assert.equal(drawing.quiet.size, 0);
});

test("a craft two of whose products others also make stays a junction, and its product edge says nothing", () => {
    const shared = [...catalogue, craft("other-g", [["z", 2]], [["g", 1]])];
    const drawing = drawProduction(shared);

    // G is made by two crafts now, so neither is collapsed and both carry their own amounts.
    assert.equal(drawing.collapsed.has("smelt"), false);
    assert.equal(drawing.outputs.has("g"), false);
    assert.deepEqual(drawing.edges.filter(edge => edge.craft === "smelt").map(edge => edge.role), ["ingredient", "product"]);

    // X is still one craft's own, and that craft is a junction: the resource's chip speaks and the edge holds its tongue.
    assert.deepEqual(drawing.outputs.get("x"), { craft: "make-x", amount: 10, time: 1, edge: "make-x>x" });
});

test("the cycle through the crafts is broken at an edge that runs back", () => {
    const nodes = catalogue.map(entry => ({ id: entry.id, width: 10, height: 10 }));
    const layout = layered(nodes, drawProduction(catalogue).edges, { direction: "right" });

    assert.equal(layout.backEdges.size, 1);
    assert.ok([...layout.backEdges].every(id => id.startsWith("make-")));
});

test("a draft is laid over the catalogue by key: a craft changed, a resource added, a craft removed", () => {
    const changed = { ...craftDraft(catalogue[5] as Craft), products: [{ resource: "y", amount: 2 }], baseline: JSON.stringify(catalogue[5]) };
    const added = { ...resourceDraft(resource("coal")), created: true };
    const draft: ProductionDraft = { resources: [added], crafts: [changed], removed: ["smelt"] };
    const entries = overlayDraft(catalogue, draft);

    assert.deepEqual(entries.map(entry => `${entry.kind}:${entry.id}`), ["resource:x", "resource:y", "resource:z", "resource:g", "craft:make-x", "craft:make-y", "resource:coal"]);
    assert.equal((entries[5] as Craft).products[0].amount, 2);
    assert.equal((entries[5] as Craft).time, 1);
});

test("a drafted entry conflicts when the server changed it since", () => {
    const baseline = JSON.stringify(catalogue[4]);
    const draft: ProductionDraft = { resources: [], crafts: [{ ...craftDraft(catalogue[4] as Craft), baseline }], removed: [] };
    const later = catalogue.map(entry => (entry.id === "make-x" ? craft("make-x", [["y", 20]], [["x", 10]]) : entry));

    assert.equal(draftConflicts(catalogue, draft).size, 0);
    assert.equal(draftConflicts(later, draft).get("make-x"), "changed");
});

test("a document's draft comes off the wire with both lists and a craft's time as a span", () => {
    const read = readProductionDocument({
        nodes: [{ id: "x", x: "4", y: 2 }],
        draft: {
            resources: [{ id: "coal", title: "Coal", unit: "kg", cost: 2, created: true, baseline: null }],
            crafts: [{ id: "burn", ingredients: [{ resource: "coal", amount: "3" }], products: [], time: "00:00:02", created: false, baseline: "{}" }],
            removed: ["x"]
        }
    });

    assert.equal(read.nodes[0].x, 4);
    assert.equal(read.draft.resources[0].unit, "kg");
    assert.equal(read.draft.resources[0].created, true);
    assert.equal(read.draft.crafts[0].ingredients[0].amount, 3);
    assert.equal(read.draft.crafts[0].time, "00:00:02");
    assert.equal(read.draft.crafts[0].baseline, "{}");
    assert.deepEqual(read.draft.removed, ["x"]);
});

test("an amount is read as a count of one run, with its unit, and typed back the same way", () => {
    assert.equal(formatAmount(2.5, null), "×2.5");
    assert.equal(formatAmount(100, "l"), "×100 l");
    assert.equal(formatTime(3.5), "3.5 s");
    assert.equal(parsePositive("×2,5"), 2.5);
    assert.equal(parsePositive("0"), null);
    assert.equal(parsePositive("soon"), null);
});

test("a resource several crafts make is left out, so neither run speaks for the other", () => {
    const twice = [...catalogue, craft("spare-x", [["g", 1]], [["x", 1]])];
    const drawing = drawProduction(twice);

    assert.equal(drawing.outputs.has("x"), false);
    assert.equal(drawing.outputs.has("y"), true);
    // Neither maker of X is collapsed: a junction is what says which edges are one run.
    assert.equal(drawing.collapsed.has("make-x"), false);
    assert.equal(drawing.collapsed.has("spare-x"), false);
});
