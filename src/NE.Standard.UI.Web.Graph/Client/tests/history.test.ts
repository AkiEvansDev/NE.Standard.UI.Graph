import assert from "node:assert/strict";
import test from "node:test";
import { DocumentHistory } from "../src/canvas/history.ts";
import { emptyDocument, readDocument } from "../src/nodes/model.ts";
import type { GraphDocument } from "../src/nodes/model.ts";

function withNode(count: number): GraphDocument {
    const document = emptyDocument();

    for (let index = 0; index < count; index++)
        document.nodes.push({ id: `n${index}`, type: "Number", x: 0, y: 0, values: {} });

    return document;
}

test("a loaded document is clean, and an edit makes it dirty", () => {
    const history = new DocumentHistory(withNode(1), readDocument);

    assert.equal(history.dirty, false);
    assert.equal(history.canUndo, false);

    history.record(withNode(2));

    assert.equal(history.dirty, true);
    assert.equal(history.canUndo, true);
});

test("an edit that changed nothing is not a step", () => {
    const history = new DocumentHistory(withNode(1), readDocument);

    history.record(withNode(1));

    assert.equal(history.canUndo, false);
    assert.equal(history.dirty, false);
});

test("undo walks back and redo walks forward", () => {
    const history = new DocumentHistory(withNode(1), readDocument);

    history.record(withNode(2));
    history.record(withNode(3));

    assert.equal(history.undo()?.nodes.length, 2);
    assert.equal(history.undo()?.nodes.length, 1);
    assert.equal(history.undo(), null);
    assert.equal(history.redo()?.nodes.length, 2);
    assert.equal(history.redo()?.nodes.length, 3);
});

test("a new edit drops what was undone", () => {
    const history = new DocumentHistory(withNode(1), readDocument);

    history.record(withNode(2));
    history.undo();
    history.record(withNode(5));

    assert.equal(history.canRedo, false);
});

test("a save marks the present clean, and a push starts the history again", () => {
    const history = new DocumentHistory(withNode(1), readDocument);

    history.record(withNode(2));
    history.markSaved();

    assert.equal(history.dirty, false);

    history.record(withNode(3));
    history.reset(withNode(4), true);

    assert.equal(history.dirty, false);
    assert.equal(history.canUndo, false);
    assert.equal(history.canRedo, false);
});

test("what a save sent is what lands, so an edit made while it travelled stays dirty", () => {
    const history = new DocumentHistory(withNode(1), readDocument);

    history.record(withNode(2));

    // What the save put on the wire, and the edit the viewer made before the server answered.
    const sent = JSON.stringify(withNode(2));

    history.record(withNode(3));
    history.markSaved(sent);

    assert.equal(history.dirty, true);

    history.markSaved();

    assert.equal(history.dirty, false);
});

test("the stack stops at its depth", () => {
    const history = new DocumentHistory(withNode(0), readDocument, 2);

    history.record(withNode(1));
    history.record(withNode(2));
    history.record(withNode(3));

    assert.equal(history.undo()?.nodes.length, 2);
    assert.equal(history.undo()?.nodes.length, 1);
    assert.equal(history.undo(), null);
});
