// An application's entry of a canvas's menu is picked as that menu's own: `menu-entry` is raised on the entry's own component element,
// the template root the renderer marks with its id inside the keyed row, so the server holds the pick to the entries the menu offers;
// what the menu was opened on rides as the id after the entry's keys, empty where the menu is not that item's.

import assert from "node:assert/strict";
import test from "node:test";
import type { DomNames, PluginEngineContext } from "ne-standard-ui";
import { FakeElement, installFakeDom, real } from "./fake-dom.ts";

installFakeDom({ CSS: { escape: (value: string) => value } });

const { CanvasMenus } = await import("../src/canvas/canvas-menus.ts");

const names = real<DomNames>({
    componentId: "data-ui-id",
    key: "data-ui-key",
    contextMenu: "data-ui-context-menu",
    menuItemClass: "ui-menu-item",
    menuItemCheckedClass: "ui-menu-item--checked"
});

/** A menu's row as the renderer writes it: the keyed row, and in it the entry's own component — the template root, by its id. */
function row(key: string, id: number): FakeElement {
    return FakeElement.of("ui-menu__item", { "data-ui-key": key })
        .append(FakeElement.of("ui-menu-item ui-button", { "data-ui-id": String(id), "data-ui-pc": "1", role: "menuitem" }, "a"));
}

/** A sub-entry's row: its menu is the one the entry's sub-entries are shown through, nested in the entry's row. */
function group(key: string, id: number, subKey: string, subId: number): FakeElement {
    const sub = FakeElement.of("ui-menu__item", { "data-ui-key": subKey })
        .append(FakeElement.of("ui-menu-item ui-button", { "data-ui-id": String(subId), "data-ui-pc": "2", role: "menuitem" }, "a"));

    return row(key, id).append(FakeElement.of("ui-menu", { "data-ui-id": String(id + 100) }).append(FakeElement.of("ui-menu__host").append(sub)));
}

function canvas() {
    const open = row("open", 15);
    const share = group("share", 16, "share-mail", 21);
    const run = row("run", 30);
    const node = FakeElement.of("ui-graph__node", { "data-ui-graph-node": "n1" });
    const root = FakeElement.of("ui-graph").append(
        FakeElement.of("ui-context-menu", { "data-ui-context-menu": "graph-node-menu" }).append(FakeElement.of("ui-menu__host").append(open, share)),
        FakeElement.of("ui-context-menu", { "data-ui-context-menu": "graph-canvas-menu" }).append(FakeElement.of("ui-menu__host").append(run)),
        node
    );
    const context = real<PluginEngineContext>({
        names,
        states: { setDisabled: () => undefined },
        store: { read: () => null, write: () => undefined }
    });
    const kind = { items: () => [{ id: "n1" }], syncMenus: () => undefined, canEditItems: () => true, hasEdgeMenu: () => false, canDuplicate: () => false, canDisconnect: () => false };
    const selection = { size: 1, any: true, nodeIds: new Set(["n1"]), has: (id: string) => id === "n1", chooseForMenu: () => undefined };
    const host = { nodeElements: new Map(), kind: () => kind, drawEdges: () => undefined };
    const menus = new CanvasMenus(
        real(root),
        context,
        real({ document: { groups: [] } }),
        real(selection),
        real({}),
        real({ readOnly: false }),
        real(host),
        real(FakeElement.of("ui-graph__groups"))
    );
    // Where the event was raised — the one entry element that heard it first — and what reached the canvas's root by bubbling.
    const heard: FakeElement[] = [];
    const targets: unknown[] = [];

    root.addEventListener("menu-entry", event => targets.push((event as unknown as CustomEvent<{ target: unknown }>).detail.target));

    for (const element of root.querySelectorAll(".ui-menu-item"))
        element.addEventListener("menu-entry", () => heard.push(element));

    return { menus, node, open, share, run, heard, targets };
}

test("a node menu's entry is raised on its own component element, naming the node the menu was opened on", () => {
    const at = canvas();

    at.menus.prepareMenus(real(at.node));
    at.menus.raiseEntry(real(at.open), "graph-node-menu");

    assert.deepEqual(at.heard, [at.open.children[0]]);
    assert.equal(at.heard[0].getAttribute("data-ui-id"), "15");
    // Bubbling up from the entry, it carries the node's id, which the registration puts after the entry's keys.
    assert.deepEqual(at.targets, ["n1"]);
});

test("a sub-entry is raised on its own element, inside the menu its entry's sub-entries are shown through", () => {
    const at = canvas();
    const sub = at.share.querySelector("[data-ui-key='share-mail']")!;

    at.menus.prepareMenus(real(at.node));
    at.menus.raiseEntry(real(sub), "graph-node-menu");

    assert.deepEqual(at.heard.map(element => element.getAttribute("data-ui-id")), ["21"]);
    assert.deepEqual(at.targets, ["n1"]);
});

test("an entry of the sheet's menu names nothing it was opened on, though a node was pressed last", () => {
    const at = canvas();

    at.menus.prepareMenus(real(at.node));
    at.menus.raiseEntry(real(at.run), "graph-canvas-menu");

    assert.deepEqual(at.heard.map(element => element.getAttribute("data-ui-id")), ["30"]);
    assert.deepEqual(at.targets, [""]);
});
