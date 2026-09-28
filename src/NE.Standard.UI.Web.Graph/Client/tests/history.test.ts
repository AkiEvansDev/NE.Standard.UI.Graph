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

test("what the canvas placed on its own is saved with the step before it, not left unsaved", () => {
    const history = new DocumentHistory(withNode(0), readDocument);

    history.record(withNode(1));

    // A layout placed a second node after the edit was recorded: the save sends it, and the canvas is clean once it lands.
    const sent = JSON.stringify(withNode(2));

    history.absorb(sent);
    history.markSaved(sent);

    assert.equal(history.dirty, false);
    assert.equal(history.undo()?.nodes.length, 0);
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

test("a change the server already holds reaches every step, so undo and redo never take it back", () => {
    const setCount = (value: number) => (document: GraphDocument): void => {
        const node = document.nodes.find(candidate => candidate.id === "n0");

        if (node !== undefined)
            node.values.Next = value;
    };
    const history = new DocumentHistory(withNode(1), readDocument);

    history.record(withNode(2));
    history.record(withNode(3));
    assert.notEqual(history.undo(), null);

    const present = withNode(2);

    setCount(2)(present);
    history.commit(setCount(2));
    history.absorb(JSON.stringify(present));

    assert.equal(history.undo()?.nodes[0].values.Next, 2);
    assert.equal(history.dirty, false);
    assert.equal(history.redo()?.nodes[0].values.Next, 2);
    assert.equal(history.redo()?.nodes[0].values.Next, 2);
});

test("a committed change to a node a step does not hold leaves that step as it was", () => {
    const history = new DocumentHistory(withNode(1), readDocument);

    history.record(withNode(2));
    history.commit(document => {
        const node = document.nodes.find(candidate => candidate.id === "n1");

        if (node !== undefined)
            node.values.Next = 5;
    });

    assert.deepEqual(history.undo(), readDocument(withNode(1)));
    assert.equal(history.dirty, false);
});
