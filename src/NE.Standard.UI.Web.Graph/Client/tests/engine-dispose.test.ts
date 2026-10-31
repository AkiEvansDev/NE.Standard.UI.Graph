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
            isRefused: () => false
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
