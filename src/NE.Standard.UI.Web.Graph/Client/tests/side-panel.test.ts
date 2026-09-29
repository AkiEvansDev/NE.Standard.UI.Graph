// A side panel's fold against the one the server drew it with: the parameters panel arrives folded, the plan open, and only the
// viewer's departure from that is stored for the canvas.

import assert from "node:assert/strict";
import test from "node:test";
import type { ClientStore } from "ne-standard-ui";
import { FakeElement, real } from "./fake-dom.ts";
import { SidePanelFold } from "../src/canvas/side-panel.ts";

const Collapsed = "data-ui-collapsed";

function memoryStore(initial: string | null = null): { store: ClientStore; stored: () => string | null } {
    let value = initial;

    return {
        store: real<ClientStore>({
            read: () => value,
            write: (_root: unknown, _slot: string, next: string | null) => {
                value = next;
            }
        }),
        stored: () => value
    };
}

function panel(folded: boolean): { panel: FakeElement; toggle: FakeElement } {
    const toggle = FakeElement.of("ui-graph__parameters-toggle", { "data-ui-collapse-toggle": "", "aria-expanded": folded ? "false" : "true" }, "button");
    const aside = FakeElement.of("ui-graph__parameters", folded ? { [Collapsed]: "" } : {}, "aside").append(toggle);

    return { panel: aside, toggle };
}

test("a panel drawn folded stays folded with nothing stored, and opened by the viewer it is stored open", () => {
    const { store, stored } = memoryStore();
    const { panel: aside, toggle } = panel(true);
    const fold = new SidePanelFold(store, real(FakeElement.of("ui-graph")), real(aside), "parameters");

    assert.equal(aside.hasAttribute(Collapsed), true);

    // The framework's engine opens it on the way down; the fold only remembers.
    aside.removeAttribute(Collapsed);
    assert.equal(fold.press(real(toggle)), true);
    assert.equal(stored(), "open");

    aside.setAttribute(Collapsed, "");
    fold.press(real(toggle));
    assert.equal(stored(), null);
});

test("a stored open panel opens a panel drawn folded, and a stored fold folds one drawn open", () => {
    const folded = panel(true);

    new SidePanelFold(memoryStore("open").store, real(FakeElement.of("ui-graph")), real(folded.panel), "parameters");
    assert.equal(folded.panel.hasAttribute(Collapsed), false);
    assert.equal(folded.toggle.getAttribute("aria-expanded"), "true");

    const open = panel(false);

    new SidePanelFold(memoryStore("folded").store, real(FakeElement.of("ui-graph")), real(open.panel), "plan");
    assert.equal(open.panel.hasAttribute(Collapsed), true);
    assert.equal(open.toggle.getAttribute("aria-expanded"), "false");
});

test("a panel drawn open stores its fold, and nothing once opened again", () => {
    const { store, stored } = memoryStore();
    const { panel: aside, toggle } = panel(false);
    const fold = new SidePanelFold(store, real(FakeElement.of("ui-graph")), real(aside), "plan");

    aside.setAttribute(Collapsed, "");
    fold.press(real(toggle));
    assert.equal(stored(), "folded");

    aside.removeAttribute(Collapsed);
    fold.press(real(toggle));
    assert.equal(stored(), null);
});
