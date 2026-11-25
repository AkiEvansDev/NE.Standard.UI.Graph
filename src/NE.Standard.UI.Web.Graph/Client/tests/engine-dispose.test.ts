// Engine, canvas, and run-panel lifecycle and inert guards over a stand-in DOM.

import assert from "node:assert/strict";
import test from "node:test";
import type { PluginEngineContext } from "ne-standard-ui";
import { FakeElement, FakeEvent, fakeDocument, installFakeDom, real } from "./fake-dom.ts";
import { GraphEngine } from "../src/canvas/canvas.ts";
import type { CanvasDocument } from "../src/canvas/canvas-model.ts";
import type { CanvasKind, CanvasKindDefinition, CanvasServices } from "../src/canvas/canvas-kind.ts";
import { CatalogAttribute, NodesKindDefinition } from "../src/nodes/nodes-kind.ts";
import { NodesRunPanel, StopEventName } from "../src/nodes/nodes-run-panel.ts";
import type { GraphDocument } from "../src/nodes/model.ts";

installFakeDom({
    CSS: { escape: (value: string) => value },
    getComputedStyle: (element: FakeElement) => ({
        visibility: element.visible ? "visible" : "hidden",
        getPropertyValue: (name: string) => (name === "--ui-graph-grid-size" ? "32" : "")
    }),
    ResizeObserver: class {
        public observe(): void {}
        public disconnect(): void {}
    }
});

test("run panel ignores Stop when idle, blocks Run and Stop when inert, and releases listeners on dispose", () => {
    const once = FakeElement.of("ui-button", { "data-ui-graph-run-once": "" }, "button");
    const all = FakeElement.of("ui-button", { "data-ui-graph-run-all": "" }, "button");
    const stop = FakeElement.of("ui-button", { "data-ui-graph-run-stop": "" }, "button");
    const root = FakeElement.of("ui-graph").append(once, all, stop);
    const saves: string[] = [];
    let stops = 0;
    let inert = false;

    root.addEventListener(StopEventName, () => {
        stops++;
    });

    const services = {
        root,
        documentState: {
            requestSave: (reason: string) => saves.push(reason)
        },
        context: {
            states: {
                isInert: () => inert,
                setDisabled: (element: FakeElement, disabled: boolean) => element.toggleAttribute("aria-disabled", disabled)
            }
        }
    };

    const panel = new NodesRunPanel(real<CanvasServices<GraphDocument>>(services));

    // Idle: Stop raises nothing.
    stop.dispatchEvent(new FakeEvent("click"));
    assert.equal(stops, 0);

    // Inert: Run and Run all raise no save.
    inert = true;
    once.dispatchEvent(new FakeEvent("click"));
    all.dispatchEvent(new FakeEvent("click"));
    assert.deepEqual(saves, []);

    // Running while inert: Stop raises nothing; once active, Stop raises run-stop.
    panel.setRunning(true);
    stop.dispatchEvent(new FakeEvent("click"));
    assert.equal(stops, 0);

    inert = false;
    stop.dispatchEvent(new FakeEvent("click"));
    assert.equal(stops, 1);

    // Dispose releases all button click listeners.
    assert.equal(once.listenerCount("click"), 1);
    assert.equal(all.listenerCount("click"), 1);
    assert.equal(stop.listenerCount("click"), 1);
    panel.dispose();
    assert.equal(once.listenerCount("click"), 0);
    assert.equal(all.listenerCount("click"), 0);
    assert.equal(stop.listenerCount("click"), 0);
});

test("GraphEngine.dispose disconnects observers, unsubscribes callbacks, and releases canvas listeners", () => {
    const viewport = FakeElement.of("ui-graph__viewport");
    const groups = FakeElement.of("ui-graph__groups");
    const nodes = FakeElement.of("ui-graph__nodes");
    const edges = FakeElement.of("ui-graph__edges", {}, "svg");
    const labels = FakeElement.of("ui-graph__labels");
    const scene = FakeElement.of("ui-graph__scene").append(groups, edges, labels, nodes);
    const value = FakeElement.of("ui-graph__value", {}, "input");
    const root = FakeElement.of("ui-graph", { "data-ui-id": "1", "data-ui-graph-kind": "stub" }).append(
        viewport.append(scene),
        value
    );

    fakeDocument.body.children.length = 0;
    fakeDocument.body.append(root);

    let disconnected = 0;
    let stringsUnsubscribed = 0;
    let patchesUnsubscribed = 0;
    let sizeUnwatched = 0;
    let kindDisposed = 0;

    const stubKind: CanvasKindDefinition<CanvasDocument> = {
        name: "stub",
        readDocument: () => ({ groups: [], key: null }),
        create: (): CanvasKind => ({
            items: () => [],
            edges: () => [],
            renderItem: () => real(new FakeElement()),
            itemsDrawn: () => undefined,
            dispose: () => {
                kindDisposed++;
            },
            itemColor: () => "#006E64",
            edgeEnds: () => null,
            related: () => ({ edges: [], items: [] }),
            edgeColor: () => "#006E64",
            isEditor: () => false,
            isPanel: () => false,
            pointerDown: () => false,
            chrome: () => false,
            backgroundDoubleClick: () => undefined,
            escape: () => undefined,
            copy: () => undefined,
            paste: () => null,
            duplicate: () => null,
            canDuplicate: () => false,
            disconnect: () => false,
            canDisconnect: () => false,
            remove: () => false,
            arrange: () => new Map(),
            runCommand: () => false,
            canEditItems: () => true,
            renameItem: () => false,
            paintItem: () => false,
            hasEdgeMenu: () => false,
            syncMenus: () => undefined
        })
    };

    const context = {
        root: fakeDocument.body,
        names: {
            componentId: "data-ui-id",
            readOnlyClass: "ui-input--readonly",
            ownsKeys: "data-ui-owns-keys",
            tooltip: "data-ui-tooltip"
        },
        states: {
            isInert: () => false,
            setDisabled: () => undefined
        },
        values: {
            read: () => null,
            write: () => undefined,
            isRefused: () => false,
            hold: () => undefined,
            release: () => undefined
        },
        store: {
            read: () => null,
            write: () => undefined,
            readJson: () => null,
            writeJson: () => undefined,
            remove: () => undefined
        },
        wheel: {
            pixels: () => ({ x: 0, y: 0 })
        },
        strings: {
            get: (key: string) => key,
            format: (key: string) => key,
            write: () => undefined,
            onChange: () => () => {
                stringsUnsubscribed++;
            }
        },
        propertyPatchEngine: {
            addValueChangeHandler: () => () => {
                patchesUnsubscribed++;
            }
        },
        properties: {
            set: () => undefined
        },
        popups: {
            open: () => () => undefined
        },
        focus: {
            first: () => null
        },
        colors: {
            count: () => 8,
            at: () => "#006E64"
        },
        tooltips: {
            escape: (text: string) => text,
            hide: () => undefined
        },
        observeSize: () => () => {
            sizeUnwatched++;
        },
        observeComponents: () => ({
            disconnect: () => {
                disconnected++;
            }
        })
    };

    const engine = new GraphEngine(real<PluginEngineContext>(context), [stubKind]);

    assert.equal(root.listenerCount() > 0, true);
    assert.equal(viewport.listenerCount() > 0, true);

    engine.dispose();

    assert.equal(disconnected, 6);
    assert.equal(stringsUnsubscribed, 1);
    assert.equal(patchesUnsubscribed, 1);
    assert.equal(sizeUnwatched, 1);
    assert.equal(kindDisposed, 1);
    assert.equal(root.listenerCount(), 0);
    assert.equal(viewport.listenerCount(), 0);
});

test("clicking an off-grid node selects and raises node-click without snapping or recording an edit until dragged past click slop", () => {
    const item = { id: "shop", x: 47, y: 63 };
    const viewport = FakeElement.of("ui-graph__viewport");
    const groups = FakeElement.of("ui-graph__groups");
    const nodes = FakeElement.of("ui-graph__nodes");
    const edges = FakeElement.of("ui-graph__edges", {}, "svg");
    const labels = FakeElement.of("ui-graph__labels");
    const marquee = FakeElement.of("ui-graph__marquee");
    const scene = FakeElement.of("ui-graph__scene").append(groups, edges, labels, nodes);
    const value = FakeElement.of("ui-graph__value", {}, "input");
    const root = FakeElement.of("ui-graph", {
        "data-ui-id": "2",
        "data-ui-graph-kind": "stub",
        "data-ui-graph-snap": ""
    }).append(viewport.append(scene, marquee), value);

    viewport.rect = { left: 0, top: 0, width: 800, height: 600 };
    (viewport as unknown as { setPointerCapture: () => void }).setPointerCapture = () => undefined;
    fakeDocument.body.children.length = 0;
    fakeDocument.body.append(root);

    const clicks: string[] = [];
    let holds = 0;

    root.addEventListener("node-click", event => {
        clicks.push((event as unknown as CustomEvent<{ nodeId: string }>).detail.nodeId);
    });

    const stubKind: CanvasKindDefinition<CanvasDocument & { node: typeof item }> = {
        name: "stub",
        readDocument: () => ({ groups: [], key: null, node: item }),
        create: (): CanvasKind => ({
            items: () => [item],
            edges: () => [],
            renderItem: entry => {
                const element = FakeElement.of("ui-graph__node", { "data-ui-graph-node": entry.id });

                element.style["--ui-graph-node-x"] = String(entry.x);
                element.style["--ui-graph-node-y"] = String(entry.y);

                return real(element);
            },
            itemsDrawn: () => undefined,
            itemColor: () => "#006E64",
            edgeEnds: () => null,
            related: () => ({ edges: [], items: [] }),
            edgeColor: () => "#006E64",
            isEditor: () => false,
            isPanel: () => false,
            pointerDown: () => false,
            chrome: () => false,
            backgroundDoubleClick: () => undefined,
            escape: () => undefined,
            copy: () => undefined,
            paste: () => null,
            duplicate: () => null,
            canDuplicate: () => false,
            disconnect: () => false,
            canDisconnect: () => false,
            remove: () => false,
            arrange: () => new Map(),
            runCommand: () => false,
            canEditItems: () => true,
            renameItem: () => false,
            paintItem: () => false,
            hasEdgeMenu: () => false,
            syncMenus: () => undefined
        })
    };

    const context = {
        root: fakeDocument.body,
        names: {
            componentId: "data-ui-id",
            readOnlyClass: "ui-input--readonly",
            ownsKeys: "data-ui-owns-keys",
            tooltip: "data-ui-tooltip"
        },
        states: {
            isInert: () => false,
            setDisabled: () => undefined
        },
        values: {
            read: () => null,
            write: () => undefined,
            isRefused: () => false,
            hold: () => {
                holds++;
            },
            release: () => undefined
        },
        store: {
            read: () => null,
            write: () => undefined,
            readJson: () => null,
            writeJson: () => undefined,
            remove: () => undefined
        },
        wheel: {
            pixels: () => ({ x: 0, y: 0 })
        },
        strings: {
            get: (key: string) => key,
            format: (key: string) => key,
            write: () => undefined,
            onChange: () => () => undefined
        },
        propertyPatchEngine: {
            addValueChangeHandler: () => () => undefined
        },
        properties: {
            set: () => undefined
        },
        popups: {
            open: () => () => undefined
        },
        focus: {
            first: () => null
        },
        colors: {
            count: () => 8,
            at: () => "#006E64"
        },
        tooltips: {
            escape: (text: string) => text,
            hide: () => undefined
        },
        observeSize: () => () => undefined,
        observeComponents: () => ({ disconnect: () => undefined })
    };

    const engine = new GraphEngine(real<PluginEngineContext>(context), [stubKind]);

    try {
        const nodeElement = nodes.querySelector("[data-ui-graph-node='shop']")!;
        const pointer = (type: string, x: number, y: number): FakeEvent => Object.assign(new FakeEvent(type), {
            button: 0,
            pointerId: 1,
            pointerType: "mouse",
            clientX: x,
            clientY: y
        });

        // Stationary press + slight 2px wobble within ClickSlop (4px): must neither move nor snap nor schedule a save.
        nodeElement.dispatchEvent(pointer("pointerdown", 50, 70));
        viewport.dispatchEvent(pointer("pointermove", 52, 71));
        viewport.dispatchEvent(pointer("pointerup", 52, 71));

        assert.equal(item.x, 47);
        assert.equal(item.y, 63);
        assert.equal(nodeElement.hasAttribute("data-ui-graph-selected"), true);
        assert.deepEqual(clicks, ["shop"]);
        assert.equal(holds, 0);

        // Dragging 20px right (past ClickSlop) moves and snaps onto the 32px grid without raising node-click.
        nodeElement.dispatchEvent(pointer("pointerdown", 50, 70));
        viewport.dispatchEvent(pointer("pointermove", 70, 70));
        viewport.dispatchEvent(pointer("pointerup", 70, 70));

        assert.equal(item.x, 64);
        assert.equal(item.y, 64);
        assert.deepEqual(clicks, ["shop"]);
        assert.equal(holds, 1);
    }
    finally {
        engine.dispose();
    }
});

test("two-finger touch pinch coalesces pointermove bursts onto requestAnimationFrame and flushes on finger lift (#309)", () => {
    const viewport = FakeElement.of("ui-graph__viewport");
    const groups = FakeElement.of("ui-graph__groups");
    const nodes = FakeElement.of("ui-graph__nodes");
    const edges = FakeElement.of("ui-graph__edges", {}, "svg");
    const labels = FakeElement.of("ui-graph__labels");
    const marquee = FakeElement.of("ui-graph__marquee");
    const scene = FakeElement.of("ui-graph__scene").append(groups, edges, labels, nodes);
    const value = FakeElement.of("ui-graph__value", {}, "input");
    const root = FakeElement.of("ui-graph", {
        "data-ui-id": "3",
        "data-ui-graph-kind": "stub"
    }).append(viewport.append(scene, marquee), value);

    viewport.rect = { left: 0, top: 0, width: 800, height: 600 };
    (viewport as unknown as { setPointerCapture: () => void }).setPointerCapture = () => undefined;
    fakeDocument.body.children.length = 0;
    fakeDocument.body.append(root);

    const stubKind: CanvasKindDefinition<CanvasDocument> = {
        name: "stub",
        readDocument: () => ({ groups: [], key: null }),
        create: (): CanvasKind => ({
            items: () => [],
            edges: () => [],
            renderItem: () => real(FakeElement.of("ui-graph__node")),
            itemsDrawn: () => undefined,
            itemColor: () => "#006E64",
            edgeEnds: () => null,
            related: () => ({ edges: [], items: [] }),
            edgeColor: () => "#006E64",
            isEditor: () => false,
            isPanel: () => false,
            pointerDown: () => false,
            chrome: () => false,
            backgroundDoubleClick: () => undefined,
            escape: () => undefined,
            copy: () => undefined,
            paste: () => null,
            duplicate: () => null,
            canDuplicate: () => false,
            disconnect: () => false,
            canDisconnect: () => false,
            remove: () => false,
            arrange: () => new Map(),
            runCommand: () => false,
            canEditItems: () => true,
            renameItem: () => false,
            paintItem: () => false,
            hasEdgeMenu: () => false,
            syncMenus: () => undefined
        })
    };

    const context = {
        root: fakeDocument.body,
        names: {
            componentId: "data-ui-id",
            readOnlyClass: "ui-input--readonly",
            ownsKeys: "data-ui-owns-keys",
            tooltip: "data-ui-tooltip"
        },
        states: { isInert: () => false, setDisabled: () => undefined },
        values: { read: () => null, write: () => undefined, isRefused: () => false, hold: () => undefined, release: () => undefined },
        store: { read: () => null, write: () => undefined, readJson: () => null, writeJson: () => undefined, remove: () => undefined },
        wheel: { pixels: () => ({ x: 0, y: 0 }) },
        strings: { get: (key: string) => key, format: (key: string) => key, write: () => undefined, onChange: () => () => undefined },
        propertyPatchEngine: { addValueChangeHandler: () => () => undefined },
        properties: { set: () => undefined },
        popups: { open: () => () => undefined },
        focus: { first: () => null },
        colors: { count: () => 8, at: () => "#006E64" },
        tooltips: { escape: (text: string) => text, hide: () => undefined },
        observeSize: () => () => undefined,
        observeComponents: () => ({ disconnect: () => undefined })
    };

    const frames: FrameRequestCallback[] = [];
    const globalWithRaf = globalThis as unknown as {
        requestAnimationFrame?: (callback: FrameRequestCallback) => number;
        cancelAnimationFrame?: (handle: number) => void;
    };
    const previousRaf = globalWithRaf.requestAnimationFrame;
    const previousCancel = globalWithRaf.cancelAnimationFrame;

    globalWithRaf.requestAnimationFrame = callback => {
        frames.push(callback);
        return frames.length;
    };
    globalWithRaf.cancelAnimationFrame = () => {
        frames.length = 0;
    };

    let scrollEvents = 0;
    viewport.addEventListener("scroll", () => {
        scrollEvents++;
    });

    const engine = new GraphEngine(real<PluginEngineContext>(context), [stubKind]);
    scrollEvents = 0;

    try {
        const touch = (type: string, pointerId: number, x: number, y: number): FakeEvent => Object.assign(new FakeEvent(type), {
            button: 0,
            pointerId,
            pointerType: "touch",
            clientX: x,
            clientY: y
        });

        viewport.dispatchEvent(touch("pointerdown", 1, 100, 100));
        viewport.dispatchEvent(touch("pointerdown", 2, 200, 100));

        // Four touch move events across both fingers before the frame fires must queue only one rAF and zero intermediate view writes.
        viewport.dispatchEvent(touch("pointermove", 1, 80, 100));
        viewport.dispatchEvent(touch("pointermove", 2, 220, 100));
        viewport.dispatchEvent(touch("pointermove", 1, 50, 100));
        viewport.dispatchEvent(touch("pointermove", 2, 250, 100));

        assert.equal(frames.length, 1);
        assert.equal(scrollEvents, 0);

        const queued = frames.shift()!;
        queued(16);

        assert.equal(scrollEvents, 1);
        assert.equal(scene.style.transform, "translate(-150px, -100px) scale(2)");

        // Another un-flushed pinch move followed immediately by lifting finger 2 flushes the pending pinch before handing back to pan.
        viewport.dispatchEvent(touch("pointermove", 2, 300, 100));
        assert.equal(frames.length, 1);
        viewport.dispatchEvent(touch("pointerup", 2, 300, 100));
        assert.equal(frames.length, 0);
        assert.equal(scene.style.transform, "translate(-200px, -150px) scale(2.5)");
    }
    finally {
        engine.dispose();
        globalWithRaf.requestAnimationFrame = previousRaf;
        globalWithRaf.cancelAnimationFrame = previousCancel;
    }
});

test("touching controls, editors, panels or the minimap leaves no ghost pointer in pinch, and a third finger during pinch never gets panning stuck", () => {
    const toolbarButton = FakeElement.of("ui-graph__bar-button", { "data-ui-graph-fit": "" }, "button");
    const editorField = FakeElement.of("ui-graph__editor", { "data-test-editor": "" });
    const panel = FakeElement.of("ui-graph__log", { "data-test-panel": "" });
    const minimap = FakeElement.of("ui-graph__minimap", { "data-ui-graph-map": "" });
    const viewport = FakeElement.of("ui-graph__viewport");
    const groups = FakeElement.of("ui-graph__groups");
    const edges = FakeElement.of("ui-graph__edges", {}, "svg");
    const nodes = FakeElement.of("ui-graph__nodes").append(editorField);
    const labels = FakeElement.of("ui-graph__labels");
    const scene = FakeElement.of("ui-graph__scene").append(groups, edges, nodes, labels);
    const marquee = FakeElement.of("ui-graph__marquee");
    const value = FakeElement.of("ui-graph__value", {
        "data-ui-graph-document": JSON.stringify({ groups: [], key: null })
    });
    const root = FakeElement.of("ui-graph", {
        "data-ui-id": "4",
        "data-ui-graph-kind": "stub"
    }).append(viewport.append(scene, marquee, toolbarButton, panel, minimap), value);

    viewport.rect = { left: 0, top: 0, width: 800, height: 600 };
    (viewport as unknown as { setPointerCapture: () => void }).setPointerCapture = () => undefined;
    fakeDocument.body.children.length = 0;
    fakeDocument.body.append(root);

    const stubKind: CanvasKindDefinition<CanvasDocument> = {
        name: "stub",
        readDocument: () => ({ groups: [], key: null }),
        create: (): CanvasKind => ({
            items: () => [],
            edges: () => [],
            renderItem: () => real(FakeElement.of("ui-graph__node")),
            itemsDrawn: () => undefined,
            itemColor: () => "#006E64",
            edgeEnds: () => null,
            related: () => ({ edges: [], items: [] }),
            edgeColor: () => "#006E64",
            isEditor: target => target.closest("[data-test-editor]") !== null,
            isPanel: target => target.closest("[data-test-panel]") !== null,
            pointerDown: () => false,
            chrome: () => false,
            backgroundDoubleClick: () => undefined,
            escape: () => undefined,
            copy: () => undefined,
            paste: () => null,
            duplicate: () => null,
            canDuplicate: () => false,
            disconnect: () => false,
            canDisconnect: () => false,
            remove: () => false,
            arrange: () => new Map(),
            runCommand: () => false,
            canEditItems: () => true,
            renameItem: () => false,
            paintItem: () => false,
            hasEdgeMenu: () => false,
            syncMenus: () => undefined
        })
    };

    const context = {
        root: fakeDocument.body,
        names: {
            componentId: "data-ui-id",
            readOnlyClass: "ui-input--readonly",
            ownsKeys: "data-ui-owns-keys",
            tooltip: "data-ui-tooltip"
        },
        states: { isInert: () => false, setDisabled: () => undefined },
        values: { read: () => null, write: () => undefined, isRefused: () => false, hold: () => undefined, release: () => undefined },
        store: { read: () => null, write: () => undefined, readJson: () => null, writeJson: () => undefined, remove: () => undefined },
        wheel: { pixels: () => ({ x: 0, y: 0 }) },
        strings: { get: (key: string) => key, format: (key: string) => key, write: () => undefined, onChange: () => () => undefined },
        propertyPatchEngine: { addValueChangeHandler: () => () => undefined },
        properties: { set: () => undefined },
        popups: { open: () => () => undefined },
        focus: { first: () => null },
        colors: { count: () => 8, at: () => "#006E64" },
        tooltips: { escape: (text: string) => text, hide: () => undefined },
        observeSize: () => () => undefined,
        observeComponents: () => ({ disconnect: () => undefined })
    };

    const engine = new GraphEngine(real<PluginEngineContext>(context), [stubKind]);

    try {
        const touch = (type: string, pointerId: number, x: number, y: number): FakeEvent => Object.assign(new FakeEvent(type), {
            button: 0,
            pointerId,
            pointerType: "touch",
            clientX: x,
            clientY: y
        });

        // Touching button, editor, panel, and minimap (without matching pointerup on viewport) must leave zero ghost pointers in pinch.
        toolbarButton.dispatchEvent(touch("pointerdown", 10, 20, 20));
        editorField.dispatchEvent(touch("pointerdown", 11, 40, 40));
        panel.dispatchEvent(touch("pointerdown", 12, 60, 60));
        minimap.dispatchEvent(touch("pointerdown", 13, 80, 80));
        viewport.dispatchEvent(touch("pointerup", 13, 80, 80));

        // A single finger now touching the sheet pans normally (scale stays 1, not a phantom pinch!).
        viewport.dispatchEvent(touch("pointerdown", 1, 100, 100));
        viewport.dispatchEvent(touch("pointermove", 1, 140, 130));
        assert.equal(scene.style.transform, "translate(40px, 30px) scale(1)");
        assert.equal(root.classList.contains("ui-graph--panning"), true);

        // Second finger starts a two-finger pinch and clears `.ui-graph--panning`.
        viewport.dispatchEvent(touch("pointerdown", 2, 240, 130));
        assert.equal(root.classList.contains("ui-graph--panning"), false);

        // Third finger touching down while pinching does NOT start a single-pointer pan or re-apply `.ui-graph--panning`.
        viewport.dispatchEvent(touch("pointerdown", 3, 180, 200));
        assert.equal(root.classList.contains("ui-graph--panning"), false);

        viewport.dispatchEvent(touch("pointerup", 3, 180, 200));
        viewport.dispatchEvent(touch("pointerup", 2, 240, 130));
        viewport.dispatchEvent(touch("pointerup", 1, 140, 130));
        assert.equal(root.classList.contains("ui-graph--panning"), false);
    }
    finally {
        engine.dispose();
    }
});

test("NodesKind incrementally reconciles only changed nodes and preserves sibling node DOM elements across edits", () => {
    const viewport = FakeElement.of("ui-graph__viewport");
    const groups = FakeElement.of("ui-graph__groups");
    const edges = FakeElement.of("ui-graph__edges", {}, "svg");
    const nodes = FakeElement.of("ui-graph__nodes");
    const labels = FakeElement.of("ui-graph__labels");
    const scene = FakeElement.of("ui-graph__scene").append(groups, edges, nodes, labels);
    const marquee = FakeElement.of("ui-graph__marquee");
    const catalog = [
        { key: "calc.in", title: "Source", inputs: [], outputs: [{ name: "Out", title: "Out", type: "number", editor: "None" }] },
        { key: "calc.out", title: "Sink", inputs: [{ name: "In", title: "In", type: "number", editor: "None" }], outputs: [] }
    ];
    const initialDoc = {
        nodes: [
            { id: "n1", type: "calc.in", x: 32, y: 32, values: {} },
            { id: "n2", type: "calc.out", x: 256, y: 32, values: {} },
            { id: "n3", type: "calc.in", x: 32, y: 192, values: {} }
        ],
        edges: [],
        groups: [],
        key: null
    };
    const value = FakeElement.of("ui-graph__value", { "data-ui-graph-document": JSON.stringify(initialDoc) });
    const root = FakeElement.of("ui-graph", {
        "data-ui-id": "5",
        "data-ui-graph-kind": "nodes",
        [CatalogAttribute]: JSON.stringify(catalog)
    }).append(viewport.append(scene, marquee), value);

    viewport.rect = { left: 0, top: 0, width: 800, height: 600 };
    (viewport as unknown as { setPointerCapture: () => void }).setPointerCapture = () => undefined;
    fakeDocument.body.children.length = 0;
    fakeDocument.body.append(root);

    const context = {
        root: fakeDocument.body,
        names: {
            componentId: "data-ui-id",
            readOnlyClass: "ui-input--readonly",
            ownsKeys: "data-ui-owns-keys",
            tooltip: "data-ui-tooltip",
            menuOpeningEvent: "ui-context-menu-opening",
            contextMenu: "data-ui-context-menu",
            contextMenuUse: "data-ui-context-menu-use",
            actionBar: "data-ui-action-bar",
            actionBarKey: "data-ui-action-bar-key",
            actionBarRest: "data-ui-action-bar-rest",
            collapsed: "data-ui-collapsed",
            collapseToggle: "data-ui-collapse-toggle",
            key: "data-ui-key",
            menuItemClass: "ui-menu-item",
            menuItemCheckedClass: "ui-menu-item--checked",
            menuItemValueClass: "ui-menu-item__value",
            fileMaxSize: "data-ui-file-max-size",
            badgeDangerClass: "ui-badge--danger",
            badgeWarningClass: "ui-badge--warning",
            badgeSurfaceClass: "ui-badge--surface"
        },
        states: { isInert: () => false, setDisabled: () => undefined },
        values: { read: () => null, write: () => undefined, isRefused: () => false, hold: () => undefined, release: () => undefined },
        store: { read: () => null, write: () => undefined, readJson: () => null, writeJson: () => undefined, remove: () => undefined },
        wheel: { pixels: () => ({ x: 0, y: 0 }) },
        strings: { text: (k: string) => k, get: (k: string) => k, format: (k: string) => k, write: () => undefined, onChange: () => () => undefined },
        propertyPatchEngine: { addValueChangeHandler: () => () => undefined },
        properties: { set: () => undefined },
        popups: { open: () => () => undefined },
        focus: { first: () => null },
        icons: { apply: () => undefined },
        colors: { count: () => 8, color: () => "#006E64", at: () => "#006E64" },
        numbers: { format: (v: number) => String(v), readCulture: () => ({}) },
        temporal: { format: () => "", parse: () => null, toDate: () => new Date(0), readCulture: () => ({}) },
        urls: { isImageSource: () => false },
        dom: { ensureId: (el: Element, prefix: string) => (el.id ||= prefix) },
        roving: { target: () => null, applyTabIndex: () => undefined },
        shortcuts: { words: () => null, aria: () => null, matches: () => false, isComposing: () => false, isFieldKey: () => false, isPlainKey: () => true, isEscapeClaimed: () => false },
        badges: { writeCount: () => undefined },
        renames: { open: () => undefined },
        tooltips: { escape: (text: string) => text, show: () => undefined, hide: () => undefined },
        observeSize: () => () => undefined,
        observeComponents: () => ({ disconnect: () => undefined })
    };

    const kinds = [NodesKindDefinition] as readonly CanvasKindDefinition<CanvasDocument>[];
    const engine = new GraphEngine(real<PluginEngineContext>(context), kinds);

    try {
        const el1Before = nodes.querySelector("[data-ui-graph-node='n1']")!;
        const el2Before = nodes.querySelector("[data-ui-graph-node='n2']")!;
        const el3Before = nodes.querySelector("[data-ui-graph-node='n3']")!;

        // Folding `n1` replaces `n1` alone while `n2` and `n3` stay the exact same DOM elements.
        const fold1 = el1Before.querySelector("[data-ui-graph-fold]")!;
        fold1.dispatchEvent(Object.assign(new FakeEvent("pointerdown"), { button: 0, pointerId: 1, pointerType: "mouse", clientX: 40, clientY: 40 }));

        const el1AfterFold = nodes.querySelector("[data-ui-graph-node='n1']")!;
        assert.notEqual(el1AfterFold, el1Before);
        assert.equal(el1AfterFold.hasAttribute("data-ui-graph-collapsed"), true);
        assert.equal(nodes.querySelector("[data-ui-graph-node='n2']"), el2Before);
        assert.equal(nodes.querySelector("[data-ui-graph-node='n3']"), el3Before);

        // Pinning `n2` replaces `n2` alone while `n1AfterFold` and `n3Before` stay untouched.
        const pin2 = el2Before.querySelector("[data-ui-graph-pin-toggle]")!;
        pin2.dispatchEvent(Object.assign(new FakeEvent("pointerdown"), { button: 0, pointerId: 2, pointerType: "mouse", clientX: 264, clientY: 40 }));

        const el2AfterPin = nodes.querySelector("[data-ui-graph-node='n2']")!;
        assert.notEqual(el2AfterPin, el2Before);
        assert.equal(el2AfterPin.hasAttribute("data-ui-graph-pinned"), true);
        assert.equal(nodes.querySelector("[data-ui-graph-node='n1']"), el1AfterFold);
        assert.equal(nodes.querySelector("[data-ui-graph-node='n3']"), el3Before);
    }
    finally {
        engine.dispose();
    }
});
