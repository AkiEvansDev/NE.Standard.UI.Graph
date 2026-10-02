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
