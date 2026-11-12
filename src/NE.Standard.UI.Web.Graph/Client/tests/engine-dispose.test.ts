// Engine, canvas, and run-panel lifecycle and inert guards over a stand-in DOM.

import assert from "node:assert/strict";
import test from "node:test";
import type { PluginEngineContext } from "ne-standard-ui";
import { FakeElement, FakeEvent, fakeDocument, installFakeDom, real } from "./fake-dom.ts";
import { GraphEngine } from "../src/canvas/canvas.ts";
import type { CanvasDocument } from "../src/canvas/canvas-model.ts";
import type { CanvasKind, CanvasKindDefinition, CanvasServices } from "../src/canvas/canvas-kind.ts";
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

    assert.equal(disconnected, 5);
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
