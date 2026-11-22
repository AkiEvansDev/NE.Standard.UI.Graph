import assert from "node:assert/strict";
import test from "node:test";
import type { ValueReading } from "ne-standard-ui";
import { CanvasDocumentState } from "../src/canvas/canvas-document.ts";
import { CanvasSettings } from "../src/canvas/canvas-settings.ts";
import { emptyDocument, readDocument } from "../src/nodes/model.ts";
import type { GraphDocument } from "../src/nodes/model.ts";

// The family's read-only mark, as the plugin surface names it.
const ReadOnlyClass = "ui-readonly";

/** A canvas's root as the document state reads it: its attributes and its classes, nothing drawn. */
function canvasRoot(): { root: HTMLElement; classes: Set<string> } {
    const attributes = new Set<string>();
    const classes = new Set<string>();
    const root = {
        hasAttribute: (name: string) => attributes.has(name),
        getAttribute: () => null,
        classList: {
            contains: (name: string) => classes.has(name),
            add: (...names: string[]) => names.forEach(name => classes.add(name)),
            toggle: (name: string, on: boolean) => (on ? classes.add(name) : classes.delete(name)),
            remove: (...names: string[]) => names.forEach(name => classes.delete(name))
        }
    };

    return { root: root as unknown as HTMLElement, classes };
}

function documentState(root: HTMLElement): CanvasDocumentState<GraphDocument> {
    const value = { getAttribute: () => JSON.stringify(emptyDocument()) } as unknown as HTMLElement;
    const values = { read: () => null, hold: () => undefined, release: () => undefined } as unknown as ValueReading;

    return new CanvasDocumentState(root, value, new CanvasSettings(root, ReadOnlyClass), readDocument, { clearSelectionSets: () => undefined, redraw: () => undefined, redrawEdges: () => undefined }, values);
}

test("a read-only canvas takes no step back or forward, and keeps both for when it may be edited again", () => {
    const { root, classes } = canvasRoot();
    const state = documentState(root);

    state.document.nodes.push({ id: "n0", type: "Number", x: 0, y: 0, values: {} });
    state.edited();
    classes.add(ReadOnlyClass);

    assert.equal(state.undo(), null);
    assert.equal(state.redo(), null);

    classes.delete(ReadOnlyClass);

    assert.equal(state.undo()?.nodes.length, 0);
    assert.equal(state.redo()?.nodes.length, 1);
});

test("an edit that reaches a read-only canvas is put back, dirtying nothing", () => {
    const { root, classes } = canvasRoot();
    const state = documentState(root);

    state.document.nodes.push({ id: "n0", type: "Number", x: 0, y: 0, values: {} });
    state.edited();
    classes.add(ReadOnlyClass);
    state.document.nodes.push({ id: "n1", type: "Number", x: 40, y: 0, values: {} });
    state.edited();

    assert.deepEqual(state.document.nodes.map(node => node.id), ["n0"]);
    assert.equal(state.undo(), null);

    classes.delete(ReadOnlyClass);

    assert.equal(state.undo()?.nodes.length, 0);
});

test("saving without a wired graph-save handler settles via whenSettled and re-holds the value across edits and in-flight saves", async () => {
    const { root, classes } = canvasRoot();
    let storedAttr = JSON.stringify(emptyDocument());
    let settleResolve!: () => void;
    let refused = false;
    let holdCalls = 0;
    let releaseCalls = 0;
    let settledResult: { success: boolean; reason: string } | null = null;
    const listeners = new Map<string, ((event: Event) => void)[]>();

    const valueElement = {
        getAttribute: () => storedAttr,
        setAttribute: (_name: string, next: string) => {
            storedAttr = next;
        },
        addEventListener: (type: string, handler: (event: Event) => void) => {
            const list = listeners.get(type) ?? [];
            list.push(handler);
            listeners.set(type, list);
        },
        dispatchEvent: (event: Event) => {
            for (const handler of listeners.get(event.type) ?? [])
                handler(event);
            return true;
        }
    } as unknown as HTMLElement;

    const values = {
        read: () => null,
        hold: () => {
            holdCalls++;
        },
        release: () => {
            releaseCalls++;
        },
        isRefused: () => refused,
        whenSettled: () => new Promise<void>(resolve => {
            settleResolve = resolve;
        })
    } as unknown as ValueReading;

    const state = new CanvasDocumentState(
        root,
        valueElement,
        new CanvasSettings(root, ReadOnlyClass),
        readDocument,
        {
            clearSelectionSets: () => undefined,
            redraw: () => undefined,
            redrawEdges: () => undefined,
            saveSettled: (success, reason) => {
                settledResult = { success, reason };
            }
        },
        values
    );

    // Every dirty edit re-asserts `values.hold(valueElement)` rather than only on the false -> true edge.
    state.document.nodes.push({ id: "n0", type: "Number", x: 0, y: 0, values: {} });
    state.edited();
    assert.equal(holdCalls, 1);

    state.document.nodes.push({ id: "n1", type: "Number", x: 40, y: 0, values: {} });
    state.edited();
    assert.equal(holdCalls, 2);

    // With no `graph-save` listener setting `detail.handled = true`, `save()` awaits `whenSettled`.
    state.save("run");
    assert.equal(classes.has("ui-graph--saving"), true);
    assert.equal(classes.has("ui-graph--dirty"), true);
    assert.equal(holdCalls, 3);

    settleResolve();
    await new Promise<void>(resolve => queueMicrotask(resolve));

    assert.equal(classes.has("ui-graph--saving"), false);
    assert.equal(classes.has("ui-graph--dirty"), false);
    assert.equal(releaseCalls, 1);
    assert.deepEqual(settledResult, { success: true, reason: "run" });

    // If the bound value write is refused on the server, `whenSettled` leaves the canvas dirty and re-held.
    refused = true;
    state.document.nodes.push({ id: "n2", type: "Number", x: 80, y: 0, values: {} });
    state.edited();
    state.save();
    const holdBeforeRefusal: number = holdCalls;
    settleResolve();
    await new Promise<void>(resolve => queueMicrotask(resolve));

    assert.equal(classes.has("ui-graph--saving"), false);
    assert.equal(classes.has("ui-graph--dirty"), true);
    assert.equal(holdCalls, holdBeforeRefusal + 1);
    assert.deepEqual(settledResult, { success: false, reason: "" });

    // When a `graph-save` command is wired (`detail.handled = true`), `whenSettled` does not prematurely clear `.ui-graph--saving`.
    refused = false;
    valueElement.addEventListener("graph-save", event => {
        const detail = (event as CustomEvent<{ handled?: boolean }>).detail;
        detail.handled = true;
    });
    state.save("manual");
    settleResolve?.();
    await new Promise<void>(resolve => queueMicrotask(resolve));
    assert.equal(classes.has("ui-graph--saving"), true);

    state.saveCompleted(true, undefined);
    assert.equal(classes.has("ui-graph--saving"), false);
    assert.equal(classes.has("ui-graph--dirty"), false);
});
