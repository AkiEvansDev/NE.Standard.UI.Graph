// A group made and used from the menus: the sheet menu's Add group puts an empty, unnamed frame cornered where the menu was opened,
// on the grid, chosen, as one edit, and does nothing on a read-only sheet; a frame holds what stands wholly inside it, pinned or not;
// and on the node canvas the group's Disabled turns every node inside it off, or on again once all are, checked while all are off,
// unavailable on a frame that holds none.

import assert from "node:assert/strict";
import test from "node:test";
import type { DomNames, PluginEngineContext } from "ne-standard-ui";
import type { CanvasServices, MenuTarget } from "../src/canvas/canvas-kind.ts";
import type { CanvasGroup } from "../src/canvas/canvas-model.ts";
import type { Rect } from "../src/canvas/geometry.ts";
import type { GraphDocument } from "../src/nodes/model.ts";
import { FakeElement, installFakeDom, real } from "./fake-dom.ts";

installFakeDom({ CSS: { escape: (value: string) => value } });

const { CanvasMenus } = await import("../src/canvas/canvas-menus.ts");
const { itemsInFrame } = await import("../src/canvas/canvas-drag.ts");
const { NodesKind } = await import("../src/nodes/nodes-kind.ts");

const names = real<DomNames>({
    key: "data-ui-key",
    contextMenu: "data-ui-context-menu",
    menuItemClass: "ui-menu-item",
    menuItemCheckedClass: "ui-menu-item--checked"
});

function entry(key: string): FakeElement {
    return FakeElement.of("ui-menu__item", { "data-ui-key": key }, "li").append(FakeElement.of("ui-menu-item", {}, "a"));
}

/** A sheet menu holding Add group, over an empty sheet whose menu was opened at (47, 92) on a grid of 20. */
function sheet(readOnly = false, snapping = true) {
    const addGroup = entry("graph:add-group");
    const root = FakeElement.of("ui-graph").append(FakeElement.of("ui-context-menu", { "data-ui-context-menu": "graph-canvas-menu" }).append(addGroup));
    const disabled = new Map<FakeElement, boolean>();
    const chosen: string[] = [];
    const document = { groups: [] as CanvasGroup[] };
    let edits = 0;

    const context = real<PluginEngineContext>({
        names,
        states: { setDisabled: (element: FakeElement, off: boolean) => disabled.set(element, off) },
        store: { read: () => null, write: () => undefined }
    });
    const kind = { items: () => [], syncMenus: () => undefined, canEditItems: () => true, hasEdgeMenu: () => false, canDuplicate: () => false };
    const selection = { size: 0, any: false, nodeIds: new Set<string>(), has: () => false, select: (id: string, add: boolean) => chosen.push(`${id}${add ? "+" : ""}`) };
    const host = {
        nodeElements: new Map(),
        kind: () => kind,
        nodeRect: () => null,
        pointerScene: () => ({ x: 47, y: 92 }),
        // The canvas's own snap: by the corner, to the nearest step, and only while the grid is on.
        snapPlace: (_id: string, point: { x: number; y: number }) => (snapping ? { x: Math.round(point.x / 20) * 20, y: Math.round(point.y / 20) * 20 } : point),
        drawEdges: () => undefined,
        deleteSelection: () => undefined,
        duplicate: () => undefined
    };
    const menus = new CanvasMenus(
        real(root),
        context,
        real({ document, edited: () => edits++ }),
        real(selection),
        real({}),
        real({ readOnly, snapping, gridSize: 20 }),
        real(host),
        real(FakeElement.of("ui-graph__groups"))
    );

    return { menus, document, chosen, edits: () => edits, addGroup: addGroup.children[0], disabled };
}

test("Add group puts an empty, unnamed frame cornered on the grid where the menu was opened, chosen alone, as one edit", () => {
    const at = sheet();

    at.menus.run("graph:add-group", "graph-canvas-menu");

    assert.equal(at.document.groups.length, 1);

    const [group] = at.document.groups;

    assert.deepEqual({ x: group.x, y: group.y, width: group.width, height: group.height, title: group.title, color: group.color }, { x: 40, y: 100, width: 480, height: 280, title: null, color: null });
    assert.deepEqual(at.chosen, [group.id]);
    assert.equal(at.edits(), 1);
});

test("with the grid off, the frame's corner is where the menu was opened", () => {
    const at = sheet(false, false);

    at.menus.run("graph:add-group", "graph-canvas-menu");

    assert.deepEqual([at.document.groups[0].x, at.document.groups[0].y], [47, 92]);
});

test("a read-only sheet adds no frame, and its Add group stands disabled", () => {
    const at = sheet(true);

    at.menus.syncMenus();
    at.menus.run("graph:add-group", "graph-canvas-menu");

    assert.equal(at.document.groups.length, 0);
    assert.equal(at.edits(), 0);
    assert.equal(at.disabled.get(at.addGroup), true);

    const editable = sheet();

    editable.menus.syncMenus();

    assert.equal(editable.disabled.get(editable.addGroup), false);
});

test("a frame holds what stands wholly inside it, pinned or not, and nothing reaching past its edge", () => {
    const group: CanvasGroup = { id: "g", x: 0, y: 0, width: 300, height: 200 };
    const rects: Record<string, Rect> = {
        inside: { x: 20, y: 40, width: 100, height: 60 },
        pinned: { x: 150, y: 40, width: 100, height: 60 },
        across: { x: 250, y: 40, width: 100, height: 60 },
        away: { x: 400, y: 40, width: 100, height: 60 }
    };
    const items = Object.keys(rects).map(id => ({ id, x: rects[id].x, y: rects[id].y, pinned: id === "pinned" }));

    assert.deepEqual(itemsInFrame(group, items, id => rects[id] ?? null).map(item => item.id), ["inside", "pinned"]);
    assert.deepEqual(itemsInFrame(group, items, () => null), []);
});

/** A node canvas of three nodes — two inside the frame `g`, the second pinned, one outside it — and the group's menu with Disabled. */
function nodeSheet(readOnly = false) {
    const disable = entry("graph:disable");
    const root = FakeElement.of("ui-graph").append(FakeElement.of("ui-context-menu", { "data-ui-context-menu": "graph-group-menu" }).append(disable));
    const rects: Record<string, Rect> = { a: { x: 20, y: 40, width: 100, height: 60 }, b: { x: 150, y: 40, width: 100, height: 60 }, c: { x: 600, y: 40, width: 100, height: 60 } };
    const document: GraphDocument = {
        nodes: ["a", "b", "c"].map(id => ({ id, type: "t", x: rects[id].x, y: rects[id].y, values: {}, pinned: id === "b" })),
        edges: [],
        groups: [{ id: "g", x: 0, y: 0, width: 300, height: 200 }, { id: "empty", x: 1000, y: 0, width: 300, height: 200 }]
    } as unknown as GraphDocument;
    const disabled = new Map<FakeElement, boolean>();
    let edits = 0;

    // Whatever the kind's other concerns reach for on a sheet that draws none of their panels answers nothing.
    const inert: unknown = new Proxy(() => undefined, { get: (_target, key) => (key === "then" ? undefined : inert), apply: () => null });
    const context = new Proxy({
        names,
        states: { setDisabled: (element: FakeElement, off: boolean) => disabled.set(element, off), isInert: () => false },
        colors: { count: () => 8 },
        store: { read: () => null, write: () => undefined }
    }, { get: (target, key) => (key in target ? target[key as keyof typeof target] : inert) });
    const services = {
        root: real(root),
        context: real<PluginEngineContext>(context),
        settings: { readOnly, snapping: true, gridSize: 20 },
        documentState: { document, edited: () => edits++ },
        selection: { has: () => false },
        nodeRect: (id: string) => rects[id] ?? null
    };
    const kind = new NodesKind(real<CanvasServices<GraphDocument>>(new Proxy(services, { get: (target, key) => (key in target ? target[key as keyof typeof target] : inert) })));
    const group: MenuTarget = { kind: "group", id: "g" };
    const button = disable.children[0];

    return { kind, document, group, edits: () => edits, checked: () => button.getAttribute("aria-checked"), off: () => disabled.get(button) };
}

test("a group's Disabled turns every node in its frame off, pinned ones too, as one edit, and leaves the node outside alone", () => {
    const at = nodeSheet();

    at.kind.runCommand("graph:disable", at.group);

    assert.deepEqual(at.document.nodes.map(node => node.enabled), [false, false, undefined]);
    assert.equal(at.edits(), 1);

    at.kind.syncMenus(true, at.group);

    assert.equal(at.checked(), "true");
});

test("once every node in the frame is off, the group's Disabled turns them all on again; while some are on, all go off", () => {
    const at = nodeSheet();

    at.document.nodes[0].enabled = false;
    at.kind.syncMenus(true, at.group);

    assert.equal(at.checked(), "false");

    at.kind.runCommand("graph:disable", at.group);

    assert.deepEqual(at.document.nodes.map(node => node.enabled), [false, false, undefined]);

    at.kind.runCommand("graph:disable", at.group);

    assert.deepEqual(at.document.nodes.map(node => node.enabled), [true, true, undefined]);
    assert.equal(at.edits(), 2);
});

test("a group's Disabled is unavailable on a frame that holds no node and on a read-only sheet, and does nothing there", () => {
    const at = nodeSheet();
    const empty: MenuTarget = { kind: "group", id: "empty" };

    at.kind.syncMenus(true, empty);

    assert.equal(at.off(), true);
    assert.equal(at.checked(), "false");

    at.kind.runCommand("graph:disable", empty);
    at.kind.syncMenus(true, at.group);

    assert.equal(at.off(), false);
    assert.equal(at.edits(), 0);

    const readOnly = nodeSheet(true);

    readOnly.kind.syncMenus(false, readOnly.group);
    readOnly.kind.runCommand("graph:disable", readOnly.group);

    assert.equal(readOnly.off(), true);
    assert.deepEqual(readOnly.document.nodes.map(node => node.enabled), [undefined, undefined, undefined]);
});
