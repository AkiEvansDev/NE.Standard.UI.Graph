// The canvas's own buttons, which carry the sheet's keys (Delete, Ctrl+A) as the sheet does, against the markup the renderers write:
// every switch and bar button, and never a panel's contents, a menu's entry or a log line's name.

import assert from "node:assert/strict";
import test from "node:test";
import { FakeElement } from "./fake-dom.ts";
import { ChromeButtonSelector } from "../src/canvas/canvas-dom.ts";

function button(classes = "", attributes: Readonly<Record<string, string>> = {}): FakeElement {
    return FakeElement.of(classes, attributes, "button");
}

/** The corner as RenderMenuPanel writes it: a folding panel, its switch over the core's menu in its body. */
function corner(entry: FakeElement = button("ui-menu-item")): { toggle: FakeElement; entry: FakeElement } {
    const toggle = button("ui-graph__menu-panel-toggle", { "data-ui-collapse-toggle": "", "aria-expanded": "true" });
    const body = FakeElement.of("ui-graph__menu-panel-body ui-collapsible__content").append(
        FakeElement.of("ui-menu").append(FakeElement.of("ui-menu__host").append(FakeElement.of("ui-menu__item").append(entry)))
    );

    FakeElement.of("ui-graph__menu-panel ui-collapsible ui-side--left", { "data-ui-graph-menu-panel": "graph-menu" }, "aside").append(toggle, body);

    return { toggle, entry };
}

test("the zoom bar's and run panel's buttons, the corner menu's and side panels' switches and the log's strip are the canvas's own", () => {
    const zoom = button("ui-graph__bar-button ui-button ui-button--ghost");
    const { toggle } = corner();
    const sideSwitch = button("ui-graph__plan-toggle", { "data-ui-collapse-toggle": "" });
    const logToggle = button("ui-graph__log-toggle", { "data-ui-graph-log-toggle": "" });
    const logClear = button("ui-graph__log-clear");

    FakeElement.of("ui-graph__plan", { "data-ui-graph-side": "" }, "aside").append(sideSwitch);
    FakeElement.of("ui-graph__log-head").append(logToggle, logClear);

    for (const own of [zoom, toggle, sideSwitch, logToggle, logClear])
        assert.equal(own.matches(ChromeButtonSelector), true, own.className);
});

test("a menu's entry, a side panel's contents and a log line's node name are not the canvas's own", () => {
    const { entry } = corner();
    const field = button("ui-select__trigger");
    const name = button("ui-graph__plan-name");
    const lineName = button("ui-graph__log-node", { "data-ui-graph-log-node": "n1" });
    // A switch of a collapsible inside a panel's body is that part's own, not the panel's.
    const nested = button("ui-collapsible__toggle", { "data-ui-collapse-toggle": "" });

    FakeElement.of("ui-graph__plan", { "data-ui-graph-side": "" }, "aside").append(
        FakeElement.of("ui-graph__plan-body").append(field, name, FakeElement.of("ui-collapsible").append(nested))
    );
    FakeElement.of("ui-graph__log-entries", {}, "ul").append(FakeElement.of("ui-graph__log-entry", {}, "li").append(lineName));

    for (const other of [entry, field, name, lineName, nested])
        assert.equal(other.matches(ChromeButtonSelector), false, other.className);
});
