import assert from "node:assert/strict";
import test from "node:test";
import { displayText, joinList, sharedColumns, splitMore } from "../src/nodes/display.ts";
import type { DisplayOptions } from "../src/nodes/display.ts";

const options: DisplayOptions = {
    empty: "—",
    number: value => `n${value}`,
    moment: text => (text.startsWith("2026-") ? `d${text}` : null),
    more: count => `+${count}`,
    list: entries => entries.join(" | "),
    field: (key, value) => `${key}=${value}`
};

const marker = { key: "ui.graph.more", args: { count: 800 } };

test("a list of records cut short keeps its marker out of the table's columns", () => {
    const { entries, more } = splitMore([{ a: 1 }, { a: 2, b: 3 }, marker]);

    assert.equal(more, 800);
    assert.deepEqual(sharedColumns(entries), ["a", "b"]);
});

test("a list with no marker is left whole", () => {
    const values = [{ a: 1 }, { key: "x", args: { count: 1 }, other: true }];
    const { entries, more } = splitMore(values);

    assert.equal(more, null);
    assert.equal(entries, values);
});

test("a cell writes a nested list's booleans, numbers and moments as a top-level value is written", () => {
    assert.equal(displayText([true, false, 3, "2026-09-29"], options), "✓ | ✕ | n3 | d2026-09-29");
});

test("a cell writes a nested record field by field in the page's words, at any depth", () => {
    assert.equal(displayText({ done: true, parts: [1, { ok: false }] }, options), "done=✓ | parts=n1 | ok=✕");
});

test("a list is joined as the page's language joins one, and as English where the language is unknown", () => {
    assert.equal(joinList(["a", "b", "c"], "en"), "a, b, c");
    assert.equal(joinList(["a", "b", "c"], "zh"), "a、b、c");
    assert.equal(joinList(["a", "b"], "not a language tag"), "a, b");
    assert.equal(joinList(["a", "b"], ""), joinList(["a", "b"], "en"));
});

test("a marker in a cell is the page's word for what was left out", () => {
    assert.equal(displayText(marker, options), "+800");
});
