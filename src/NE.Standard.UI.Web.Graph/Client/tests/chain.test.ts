// The line a hover reads out of a sheet: all the way up and all the way down from the item, and no branch that leaves it sideways.

import assert from "node:assert/strict";
import test from "node:test";

import { chainOf } from "../src/graph/chain.ts";

const link = (from: string, to: string) => ({ id: `${from}>${to}`, from, to });

// ore -> ferrium -> powder -> dense -> steel -> bottle -> capsule; leaf -> leaf-powder -> dense; leaf-powder -> ground -> capsule;
// flower -> flower-powder -> ground; and a seed loop on the leaf.
const links = [
    link("ore", "ferrium"), link("ferrium", "powder"), link("powder", "dense"), link("dense", "steel"), link("steel", "bottle"),
    link("bottle", "capsule"), link("leaf", "leaf-powder"), link("leaf-powder", "dense"), link("leaf-powder", "ground"),
    link("ground", "capsule"), link("flower", "flower-powder"), link("flower-powder", "ground"), link("seed", "leaf"), link("leaf", "seed")
];

test("the whole line up and down, without the branches beside it", () => {
    const chain = chainOf(links, "steel");

    assert.deepEqual([...chain.items].sort(), ["bottle", "capsule", "dense", "ferrium", "leaf", "leaf-powder", "ore", "powder", "seed", "steel"]);
    assert.ok(!chain.items.includes("ground"));
    assert.ok(!chain.items.includes("flower"));
    assert.ok(chain.edges.includes("ore>ferrium"));
    assert.ok(!chain.edges.includes("leaf-powder>ground"));
    assert.ok(!chain.edges.includes("ground>capsule"));
});

test("a loop is walked once", () => {
    const chain = chainOf(links, "leaf");

    assert.ok(chain.items.includes("seed"));
    assert.ok(chain.edges.includes("seed>leaf"));
    assert.ok(chain.edges.includes("leaf>seed"));
    assert.ok(chain.items.includes("capsule"));
});

test("an item with no links stands alone", () => {
    assert.deepEqual(chainOf(links, "nothing"), { items: ["nothing"], edges: [] });
});
