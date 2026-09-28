import assert from "node:assert/strict";
import test from "node:test";
import { freeKey, resolveConflict, takenKeys } from "../src/graph/draft.ts";
import { draftConflicts, graphEdges, overlayDraft, readGraphDocument, readGraphNode, toDraft } from "../src/graph/model.ts";
import type { GraphDraft, GraphNode } from "../src/graph/model.ts";

function node(id: string, title: string, ...to: string[]): GraphNode {
    return readGraphNode({ id, title, links: to.map(target => ({ id: `${id}>${target}`, to: target })) })!;
}

const server = [node("a", "A", "b"), node("b", "B"), node("c", "C")];

test("a draft is laid over the server's nodes by key: changed, removed and added", () => {
    const changed = { ...toDraft(server[0]), title: "A2", baseline: JSON.stringify(server[0]) };
    const added = { ...toDraft(node("d", "D", "a")), created: true };
    const draft: GraphDraft = { nodes: [changed, added], removed: ["c"] };
    const nodes = overlayDraft(server, draft);

    assert.deepEqual(nodes.map(each => `${each.id}:${each.title}`), ["a:A2", "b:B", "d:D"]);
    assert.deepEqual(graphEdges(nodes).map(edge => edge.id), ["a>b", "d>a"]);
});

test("a link to a removed node is not drawn, though its owner still carries it", () => {
    const nodes = overlayDraft(server, { nodes: [], removed: ["b"] });

    assert.deepEqual(graphEdges(nodes), []);
    assert.equal(nodes[0].links.length, 1);
});

test("a drafted node conflicts when the server changed it since, dropped it, or took the key the viewer added", () => {
    const baseline = JSON.stringify(server[0]);
    const draft: GraphDraft = {
        nodes: [
            { ...toDraft(server[0]), title: "mine", baseline },
            { ...toDraft(server[1]), title: "mine", baseline: JSON.stringify(server[1]) },
            { ...toDraft(node("gone", "Gone")), baseline: "{}" },
            { ...toDraft(node("c", "Taken")), created: true }
        ],
        removed: []
    };

    const later = [node("a", "A changed there", "b"), server[1], server[2]];
    const conflicts = draftConflicts(later, draft);

    assert.equal(conflicts.get("a"), "changed");
    assert.equal(conflicts.has("b"), false);
    assert.equal(conflicts.get("gone"), "removed");
    assert.equal(conflicts.get("c"), "changed");
});

test("a conflict is answered: the server's taken lets the change go, one's own kept ties it to the server as it now stands", () => {
    const later = [node("a", "A changed there", "b"), server[1], server[2]];
    const draft: GraphDraft = {
        nodes: [
            { ...toDraft(server[0]), title: "mine", baseline: JSON.stringify(server[0]) },
            { ...toDraft(node("gone", "Gone")), title: "kept", baseline: "{}" },
            { ...toDraft(node("c", "Taken")), created: true }
        ],
        removed: []
    };

    // Kept: every mark goes, and what the save writes is still the viewer's own.
    for (const id of ["a", "gone", "c"])
        assert.equal(resolveConflict(draft.nodes, id, later.find(candidate => candidate.id === id), true), true);

    assert.equal(draftConflicts(later, draft).size, 0);
    assert.equal(overlayDraft(later, draft).find(candidate => candidate.id === "a")!.title, "mine");
    // The one the server dropped is the viewer's to add now; the key the server took is a change to the server's node.
    assert.equal(draft.nodes.find(entry => entry.id === "gone")!.created, true);
    assert.equal(draft.nodes.find(entry => entry.id === "c")!.created, false);

    // Taken: the entry leaves the draft, and the node is the server's again.
    assert.equal(resolveConflict(draft.nodes, "a", later[0], false), true);
    assert.equal(overlayDraft(later, draft).find(candidate => candidate.id === "a")!.title, "A changed there");
    assert.equal(resolveConflict(draft.nodes, "a", later[0], false), false);
});

test("a document's draft comes off the wire whole, a shape in the server's spelling", () => {
    const read = readGraphDocument({
        nodes: [{ id: "a", x: "10", y: 20, pinned: true }],
        draft: { nodes: [{ id: "a", title: "A", shape: "Icon", links: [{ id: "a>b", to: "b", caption: "uses" }], created: true, baseline: null }], removed: ["z"] }
    });

    assert.deepEqual(read.nodes, [{ id: "a", x: 10, y: 20, pinned: true }]);
    assert.equal(read.draft.nodes[0].shape, "Icon");
    assert.equal(read.draft.nodes[0].created, true);
    assert.equal(read.draft.nodes[0].links[0].caption, "uses");
    assert.deepEqual(read.draft.removed, ["z"]);
    assert.deepEqual(readGraphDocument(null).draft, { nodes: [], removed: [] });
});

test("a node added after a server node was removed never takes the removed node's key, which is the server's until the save", () => {
    const withAdded = [...server, node("node-1", "Added before")];
    const draft: GraphDraft = { nodes: [{ ...toDraft(node("node-2", "Drafted")), created: true }], removed: ["node-1"] };

    assert.equal(freeKey("node", takenKeys(withAdded, draft.nodes, draft.removed)), "node-3");
});
