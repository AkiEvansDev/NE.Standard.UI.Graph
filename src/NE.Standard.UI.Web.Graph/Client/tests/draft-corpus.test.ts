// The corpus both sides of the draft's removal rule are held to: `draft-corpus.json` carries catalogues, the keys removed from them
// and what is left, and NE.Test.Standard.UI.Graph reads the same file against `UIProductionDraft.ApplyTo`. What the canvas takes off
// on a removal is what the application's save takes off; a change only one side got fails here and there.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { readEntry, withoutResources } from "../src/production/model.ts";
import type { CraftAmount, ProductionEntry } from "../src/production/model.ts";

type Expected = {
    entries: string[];
    crafts: Record<string, { ingredients: CraftAmount[]; products: CraftAmount[] }>;
};

type Case = { case: string; entries: unknown[]; removed: string[]; expected: Expected };

const corpus = JSON.parse(readFileSync(fileURLToPath(new URL("./draft-corpus.json", import.meta.url)), "utf8")) as { cases: Case[] };

/** The catalogue as the canvas leaves it once the keys are removed: the entries gone, and each craft without what they named. */
function remove(entries: readonly ProductionEntry[], keys: readonly string[]): ProductionEntry[] {
    const removed = new Set(keys);

    return entries.filter(entry => !removed.has(entry.id)).flatMap(entry => {
        const kept = entry.kind === "craft" ? withoutResources(entry, removed) : null;

        if (entry.kind !== "craft" || kept === null)
            return [entry];

        return kept.goes ? [] : [{ ...entry, ingredients: kept.ingredients, products: kept.products }];
    });
}

for (const entry of corpus.cases) {
    test(`corpus: ${entry.case}`, () => {
        const left = remove(entry.entries.map(readEntry).filter((read): read is ProductionEntry => read !== null), entry.removed);

        assert.deepEqual(left.map(item => item.id), entry.expected.entries);

        for (const item of left) {
            if (item.kind === "craft")
                assert.deepEqual({ ingredients: item.ingredients, products: item.products }, entry.expected.crafts[item.id], item.id);
        }
    });
}
