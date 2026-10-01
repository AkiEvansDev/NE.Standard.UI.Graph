// The action bar above a node is the framework's view of the node's menu: the canvas brings the entries up to date for the node the
// bar shows over without choosing it (the icon's press then asks as a right press does, choosing it), its own Delete stands in the
// node's menu enabled whatever is chosen, every node it draws is marked and keyed for the bar, and a pan or a zoom is told as a
// scroll of the viewport, which the bar follows as every anchored popup does.

import assert from "node:assert/strict";
import test from "node:test";
import type { ClientStore, DomNames, PluginEngineContext } from "ne-standard-ui";
import { FakeElement, fakeDocument, installFakeDom, real } from "./fake-dom.ts";

installFakeDom({ CSS: { escape: (value: string) => value } });

const { CanvasMenus, NodeMenuName } = await import("../src/canvas/canvas-menus.ts");
const { CanvasSettings } = await import("../src/canvas/canvas-settings.ts");
const { CanvasView } = await import("../src/canvas/canvas-view.ts");

const names = real<DomNames>({
    key: "data-ui-key",
    contextMenu: "data-ui-context-menu",
    menuItemClass: "ui-menu-item",
    menuItemCheckedClass: "ui-menu-item--checked"
});

type Scene = {
    readonly menus: InstanceType<typeof CanvasMenus>;
    readonly node: FakeElement;
    readonly pin: FakeElement;
    readonly remove: FakeElement;
    readonly chosen: string[];
    readonly disabled: Map<FakeElement, boolean>;
    readonly deleted: () => number;
};

function entry(key: string): FakeElement {
    return FakeElement.of("ui-menu__item", { "data-ui-key": key }, "li").append(FakeElement.of("ui-menu-item", {}, "a"));
}

/** A canvas of two nodes, the first pinned, with its node menu holding the pin and the delete; nothing chosen. */
function scene(readOnly = false): Scene {
    const pinEntry = entry("graph:pin");
    const deleteEntry = entry("graph:delete");
    const menu = FakeElement.of("ui-context-menu", { "data-ui-context-menu": NodeMenuName }).append(pinEntry, deleteEntry);
    const node = FakeElement.of("ui-graph__node", { "data-ui-graph-node": "a" }).append(FakeElement.of("ui-graph__node-head"));
    const root = FakeElement.of("ui-graph").append(FakeElement.of("ui-graph__scene").append(node), menu);
    const chosen: string[] = [];
    const disabled = new Map<FakeElement, boolean>();
    let deleted = 0;

    const context = real<PluginEngineContext>({
        names,
        states: { setDisabled: (element: FakeElement, off: boolean) => disabled.set(element, off) }
    });
    const kind = {
        items: () => [{ id: "a", x: 0, y: 0, pinned: true }, { id: "b", x: 0, y: 0 }],
        syncMenus: () => undefined,
        canEditItems: () => true,
        hasEdgeMenu: () => false
    };
    const selection = {
        size: 0,
        edgeSize: 0,
        has: () => false,
        chooseForMenu: (id: string) => chosen.push(id)
    };
    const host = {
        nodeElements: new Map(),
        kind: () => kind,
        nodeRect: () => null,
        drawEdges: () => undefined,
        deleteSelection: () => deleted++
    };

    const menus = new CanvasMenus(
        real(root),
        context,
        real({ document: { groups: [] } }),
        real(selection),
        real({}),
        real({ readOnly }),
        real(host),
        real(FakeElement.of("ui-graph__groups"))
    );

    return { menus, node, pin: pinEntry.children[0], remove: deleteEntry.children[0], chosen, disabled, deleted: () => deleted };
}

test("a bar about to show over a node brings its entries up to date for that node, and chooses nothing", () => {
    const at = scene();

    at.menus.prepareBar(real(at.node.children[0]));

    assert.deepEqual(at.chosen, []);
    assert.equal(at.pin.getAttribute("aria-checked"), "true");
    assert.equal(at.disabled.get(at.remove), false);
});

test("the icon's press asks as a right press does: the node is chosen, and the canvas's own Delete takes it", () => {
    const at = scene();

    at.menus.prepareMenus(real(at.node.children[0]));
    at.menus.run("graph:delete", NodeMenuName);

    assert.deepEqual(at.chosen, ["a"]);
    assert.equal(at.deleted(), 1);
});

test("on a read-only canvas the node's Delete is turned off", () => {
    const at = scene(true);

    at.menus.prepareBar(real(at.node));

    assert.equal(at.disabled.get(at.remove), true);
});

test("the canvas gives its nodes a bar only where the renderer said so", () => {
    assert.equal(new CanvasSettings(real(FakeElement.of("ui-graph", { "data-ui-graph-node-action-bar": "" }))).nodeActionBar, true);
    assert.equal(new CanvasSettings(real(FakeElement.of("ui-graph"))).nodeActionBar, false);
});

test("a node bar's more opens the rest of the node menu unless the renderer said to repeat the bar there", () => {
    assert.equal(new CanvasSettings(real(FakeElement.of("ui-graph", { "data-ui-graph-node-action-bar": "" }))).nodeActionBarRepeats, false);
    assert.equal(new CanvasSettings(real(FakeElement.of("ui-graph", { "data-ui-graph-node-action-bar": "", "data-ui-graph-node-action-bar-repeat": "" }))).nodeActionBarRepeats, true);
});

test("a pan or a zoom is told as a scroll of the viewport, for what floats over the sheet to follow it", () => {
    const scene = FakeElement.of("ui-graph__scene");
    const viewport = FakeElement.of("ui-graph__viewport").append(scene);
    const root = FakeElement.of("ui-graph").append(viewport);
    const store = real<ClientStore>({ readJson: () => null, write: () => undefined });
    const context = real<PluginEngineContext>({ store, observeSize: () => () => undefined });
    const view = new CanvasView(real(root), real({ minZoom: 0.25, maxZoom: 2.5 }), context, real({}));
    let scrolls = 0;

    fakeDocument.body.append(root);
    viewport.addEventListener("scroll", () => scrolls++);

    view.zoomBy(0.5, 0, 0);
    assert.equal(scrolls, 1);

    view.dragPan({ x: 0, y: 0 }, 40, 10);
    assert.equal(scrolls, 2);

    view.dispose();
    root.remove();
});
