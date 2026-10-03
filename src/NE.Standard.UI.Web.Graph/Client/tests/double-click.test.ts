// What a double click on the canvas asks for, against the markup the kinds draw: a node's name renames it, the rest of a node and
// a group take nothing, an edge takes a reroute point, the bare sheet the kind's own (a node canvas's picker), the chrome nothing.

import assert from "node:assert/strict";
import test from "node:test";
import { FakeElement } from "./fake-dom.ts";
import { doubleClickAim, MenuPanelAttribute } from "../src/canvas/canvas-dom.ts";

const NoPanel = (): boolean => false;
const CornerPanel = (target: Element): boolean => target.closest(`[${MenuPanelAttribute}]`) !== null;

function aim(target: FakeElement, isPanel: (target: Element) => boolean = NoPanel): ReturnType<typeof doubleClickAim> {
    return doubleClickAim(target as unknown as Element, isPanel);
}

/** A sheet holding one node — its head with its name and its body with a field — a group's band, and an edge. */
function sheet(): { viewport: FakeElement; title: FakeElement; titleText: FakeElement; head: FakeElement; field: FakeElement; band: FakeElement; edge: FakeElement; corner: FakeElement } {
    const titleText = FakeElement.of("ui-graph__node-title-text", {}, "span");
    const title = FakeElement.of("ui-graph__node-title").append(titleText);
    const head = FakeElement.of("ui-graph__node-head").append(title);
    const field = FakeElement.of("ui-text-input__row");
    const band = FakeElement.of("ui-graph__group-title");
    const edge = FakeElement.of("ui-graph__edge", { "data-ui-graph-edge": "e1" }, "path");
    const corner = FakeElement.of("ui-graph__bar-button", {}, "button");
    const viewport = FakeElement.of("ui-graph__viewport").append(
        FakeElement.of("ui-graph__scene").append(
            FakeElement.of("ui-graph__node", { "data-ui-graph-node": "n1" }).append(head, FakeElement.of("ui-graph__node-body").append(field)),
            FakeElement.of("ui-graph__group", { "data-ui-graph-group": "g1" }).append(FakeElement.of("ui-graph__group-band").append(band)),
            FakeElement.of("", {}, "svg").append(edge)
        ),
        FakeElement.of("", { "data-ui-graph-menu-panel": "graph-menu" }).append(corner)
    );

    return { viewport, title, titleText, head, field, band, edge, corner };
}

test("a double click on a node's name, or the words inside it, renames that node", () => {
    const { title, titleText } = sheet();

    assert.deepEqual(aim(title), { to: "rename", id: "n1" });
    assert.deepEqual(aim(titleText), { to: "rename", id: "n1" });
});

test("a double click elsewhere on a node, or on a group, asks for nothing", () => {
    const { head, field, band } = sheet();

    assert.equal(aim(head), null);
    assert.equal(aim(field), null);
    assert.equal(aim(band), null);
});

test("a double click on the bare sheet is the kind's own, on an edge a reroute point, on the chrome over the sheet nothing", () => {
    const { viewport, edge, corner } = sheet();

    assert.deepEqual(aim(viewport), { to: "sheet" });
    assert.deepEqual(aim(edge), { to: "reroute", id: "e1" });
    assert.equal(aim(corner, CornerPanel), null);
});

test("a circle's name takes no pointer, so a double click on the circle itself renames it; its badge and link handle take nothing", () => {
    const face = FakeElement.of("ui-graph__bubble-face").append(FakeElement.of("", {}, "img"));
    const badge = FakeElement.of("ui-graph__bubble-badge");
    const handle = FakeElement.of("ui-graph__handle", {}, "span");
    const circle = FakeElement.of("ui-graph__node ui-graph__bubble", { "data-ui-graph-node": "r1" }).append(face, FakeElement.of("ui-graph__node-title ui-graph__bubble-title", {}, "span"), badge, handle);

    FakeElement.of("ui-graph__viewport").append(circle);

    assert.deepEqual(aim(face.children[0]), { to: "rename", id: "r1" });
    assert.deepEqual(aim(circle), { to: "rename", id: "r1" });
    assert.equal(aim(badge), null);
    assert.equal(aim(handle), null);
});
