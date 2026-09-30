import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { Urls } from "ne-standard-ui";
import { displayText, isPictureAddress, joinList, renderDisplayValue, sharedColumns, splitMore } from "../src/nodes/display.ts";
import type { DisplayOptions } from "../src/nodes/display.ts";
import { FakeElement, installFakeDom } from "./fake-dom.ts";

installFakeDom();

// The framework's own rule, as the plugin surface hands it over.
const repository = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../../..");
const urls = await import(pathToFileURL(resolve(repository, "src/Platforms/Web/NE.Standard.UI.Web/Client/src/rendering/url-safety.ts")).href) as Urls;

const options: DisplayOptions = {
    empty: "—",
    number: value => `n${value}`,
    moment: text => (text.startsWith("2026-") ? `d${text}` : null),
    more: count => `+${count}`,
    list: entries => entries.join(" | "),
    field: (key, value) => `${key}=${value}`,
    isImageSource: address => urls.isImageSource(address)
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

test("an address a type calls a picture is this site's, the web's or an inline one, never a path naming another site", () => {
    assert.equal(isPictureAddress("/_ne/content/abc", options), true);
    assert.equal(isPictureAddress("https://cdn.example/a.png", options), true);
    assert.equal(isPictureAddress("data:image/png;base64,AA==", options), true);
    assert.equal(isPictureAddress("//elsewhere.example/a.png", options), false);
    assert.equal(isPictureAddress("/\\elsewhere.example/a.png", options), false);
    assert.equal(isPictureAddress("/\t/elsewhere.example/a.png", options), false);
    assert.equal(isPictureAddress("\u0001//elsewhere.example/a.png", options), false);
    assert.equal(isPictureAddress("in/a.png", options), false);
    assert.equal(isPictureAddress("blob:https://this.example/5f1c", options), true);
});

function drawn(value: unknown, picture?: boolean): FakeElement {
    return renderDisplayValue(value, { ...options, picture }) as unknown as FakeElement;
}

test("a text is a picture only when the pin's type says so, never by what it looks like", () => {
    assert.equal(drawn("/_ne/content/abc").tagName.toLowerCase(), "div");
    assert.equal(drawn("https://cdn.example/a.png").tagName.toLowerCase(), "div");
    assert.equal(drawn("/_ne/content/abc", true).tagName.toLowerCase(), "img");
    // Typed a picture, an address naming another site is still its text.
    assert.equal(drawn("//elsewhere.example/a.png", true).tagName.toLowerCase(), "div");
});

test("a picture the server marked is drawn at its size, alone, in a record and in a list; a field that only looks like one is text", () => {
    const alone = drawn({ $picture: "/_ne/content/a", width: 40, height: 30 });

    assert.equal(alone.tagName.toLowerCase(), "img");
    assert.equal(alone.style["width"], "40px");
    assert.equal(alone.style["height"], "30px");

    const fields = drawn({ name: "sea", shown: { $picture: "/_ne/content/b" }, path: "/data/in/sea.png" });

    assert.deepEqual(fields.children.map(child => child.tagName.toLowerCase()), ["div", "img", "div"]);

    const items = drawn([{ $picture: "/_ne/content/a" }, { $picture: "/_ne/content/b" }], true);

    assert.deepEqual(items.children.map(child => child.tagName.toLowerCase()), ["img", "img"]);
    assert.equal(drawn(["/_ne/content/a"], true).children[0].tagName.toLowerCase(), "div");
    assert.equal(displayText({ $picture: "/_ne/content/a" }, options), "/_ne/content/a");
});
