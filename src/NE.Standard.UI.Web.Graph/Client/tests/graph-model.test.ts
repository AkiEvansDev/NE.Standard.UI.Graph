import assert from "node:assert/strict";
import test from "node:test";
import { conflicts, freeKey, takenKeys } from "../src/graph/draft.ts";
import { graphEdges, overlayDraft, readGraphDocument, readGraphNode, toDraft } from "../src/graph/model.ts";
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
    const found = conflicts(later, draft.nodes);

    assert.equal(found.get("a"), "changed");
    assert.equal(found.has("b"), false);
    assert.equal(found.get("gone"), "removed");
    assert.equal(found.get("c"), "changed");
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
