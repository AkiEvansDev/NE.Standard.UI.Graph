// The canvas's own buttons, which carry the sheet's keys (Delete, Ctrl+A) as the sheet does, against the markup the renderers write:
// every switch and bar button, and never a panel's contents, a menu's entry or a log line's name.

import assert from "node:assert/strict";
import test from "node:test";
import { FakeElement } from "./fake-dom.ts";
import { ChromeButtonSelector } from "../src/canvas/canvas-dom.ts";

function button(classes = "", attributes: Readonly<Record<string, string>> = {}): FakeElement {
    return FakeElement.of(classes, attributes, "button");
}

test("the zoom bar's and run panel's buttons, the corner's and side panels' switches and the log's strip are the canvas's own", () => {
    const zoom = button("ui-graph__bar-button ui-button ui-button--ghost");
    const cornerSwitch = button("ui-menu__toggle", { "data-ui-collapse-toggle": "" });
    const sideSwitch = button("ui-graph__parameters-toggle", { "data-ui-collapse-toggle": "" });
    const logToggle = button("ui-graph__log-toggle", { "data-ui-graph-log-toggle": "" });
    const logClear = button("ui-graph__log-clear");

    FakeElement.of("", { "data-ui-graph-menu-panel": "graph-menu" }).append(FakeElement.of("ui-menu").append(cornerSwitch));
    FakeElement.of("ui-graph__parameters", { "data-ui-graph-side": "" }, "aside").append(sideSwitch);
    FakeElement.of("ui-graph__log-head").append(logToggle, logClear);

    for (const own of [zoom, cornerSwitch, sideSwitch, logToggle, logClear])
        assert.equal(own.matches(ChromeButtonSelector), true, own.className);
});

test("a menu's entry, a side panel's contents and a log line's node name are not the canvas's own", () => {
    const entry = button("ui-menu-item");
    const field = button("ui-select__trigger");
    const name = button("ui-graph__parameter-name");
    const lineName = button("ui-graph__log-node", { "data-ui-graph-log-node": "n1" });

    FakeElement.of("", { "data-ui-graph-menu-panel": "graph-menu" }).append(
        FakeElement.of("ui-menu").append(FakeElement.of("ui-menu__items", {}, "ul").append(FakeElement.of("ui-menu__item", {}, "li").append(entry)))
    );
    FakeElement.of("ui-graph__parameters", { "data-ui-graph-side": "" }, "aside").append(
        FakeElement.of("ui-graph__parameters-body").append(field, name)
    );
    FakeElement.of("ui-graph__log-entries", {}, "ul").append(FakeElement.of("ui-graph__log-entry", {}, "li").append(lineName));

    for (const other of [entry, field, name, lineName])
        assert.equal(other.matches(ChromeButtonSelector), false, other.className);
});
