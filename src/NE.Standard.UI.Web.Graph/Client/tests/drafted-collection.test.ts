// The draft both layered kinds keep over their bound collection: a conflict answered, an item the viewer added under a key the
// server has since taken kept as theirs under another key, and a removal that leaves nothing behind naming the removed key — the
// next item added under it would otherwise inherit it.

import assert from "node:assert/strict";
import test from "node:test";
import type { CanvasServices } from "../src/canvas/canvas-kind.ts";
import { conflicts } from "../src/graph/draft.ts";
import type { DraftEntry, DraftModel } from "../src/graph/draft.ts";
import { DraftedCollection, NodesAttribute } from "../src/graph/drafted-collection.ts";
import { GraphEditing } from "../src/graph/graph-editing.ts";
import type { GraphDocument, GraphNode, GraphNodeDraft } from "../src/graph/model.ts";
import { copiedLinks, GraphDraftModel, graphEdges, readGraphNode, toDraft } from "../src/graph/model.ts";
import type { Craft, CraftDraft, ProductionDocument, Resource, ResourceDraft } from "../src/production/model.ts";
import { ProductionDraftModel, craftDraft, readEntry, resourceDraft } from "../src/production/model.ts";
import { ProductionEditing } from "../src/production/production-editing.ts";
import { real } from "./fake-dom.ts";

/** A collection over the server's items and a document, with the canvas's services stood in for. */
function stage<TDocument extends { nodes: GraphDocument["nodes"]; edges: GraphDocument["edges"]; groups: GraphDocument["groups"]; draft: { removed: string[] } }, TItem extends { readonly id: string }, TEntry extends DraftEntry & { title: string | null; color: string | null }>(server: readonly unknown[], document: TDocument, model: DraftModel<TDocument, TItem, TEntry>): { items: DraftedCollection<TDocument, TItem, TEntry>; services: CanvasServices<TDocument> } {
    const state = { document, version: 0, edited: () => state.version++ };
    const services = real<CanvasServices<TDocument>>({
        root: { getAttribute: (name: string) => (name === NodesAttribute ? JSON.stringify(server) : null) },
        context: { strings: { text: (key: string) => key }, numbers: { readCulture: () => ({ decimalSeparator: "." }), format: (value: number) => String(value) } },
        documentState: state,
        settings: { readOnly: false },
        selection: { selectOnly: () => undefined },
        draw: () => undefined,
        pointerScene: () => ({ x: 0, y: 0 }),
        renameItem: () => undefined
    });
    const items = new DraftedCollection(services, model, (id, at) => document.nodes.push({ id, x: at.x, y: at.y }));

    items.refresh();

    return { items, services };
}

function node(id: string, title: string, ...to: string[]): GraphNode {
    return readGraphNode({ id, title, links: to.map(target => ({ id: `${id}>${target}`, to: target })) })!;
}

function graphDocument(nodes: GraphNodeDraft[], removed: string[] = []): GraphDocument {
    return { nodes: [], edges: [], groups: [], draft: { nodes, removed }, key: null };
}

test("a conflict is answered: the server's taken lets the change go, one's own kept ties it to the server as it now stands", () => {
    const later = [node("a", "A changed there", "b"), node("b", "B")];
    const document = graphDocument([
        { ...toDraft(node("a", "mine", "b")), baseline: JSON.stringify(node("a", "A", "b")) },
        { ...toDraft(node("gone", "Gone")), title: "kept", baseline: "{}" }
    ]);
    const { items, services } = stage(later, document, GraphDraftModel);

    assert.equal(items.answerConflict("graph:keep-mine", "a"), true);
    assert.equal(items.answerConflict("graph:keep-mine", "gone"), true);
    items.refresh();

    assert.equal(conflicts(later, document.draft.nodes).size, 0);
    assert.equal(items.item("a")!.title, "mine");
    // The one the server dropped is the viewer's to add now.
    assert.equal(document.draft.nodes.find(entry => entry.id === "gone")!.created, true);

    // Taken: the entry leaves the draft, and the node is the server's again.
    assert.equal(items.resolve("a", false), true);
    services.documentState.edited();
    items.refresh();
    assert.equal(items.item("a")!.title, "A changed there");
    assert.equal(items.resolve("a", false), false);
});

test("Keep mine on a node the viewer added under a key the server has since taken keeps it theirs, under another key, with its links and place", () => {
    const later = [node("a", "A"), node("node-1", "The server's", "a")];
    const document = graphDocument([
        { ...toDraft(node("node-1", "Mine", "a")), created: true },
        { ...toDraft(node("a", "A", "node-1")), baseline: JSON.stringify(node("a", "A")) }
    ]);

    document.nodes.push({ id: "node-1", x: 40, y: 80 });
    document.edges.push({ id: "a>node-1", points: [{ x: 1, y: 2 }] });

    const { items } = stage(later, document, GraphDraftModel);

    assert.equal(items.conflict("node-1"), "changed");
    assert.equal(items.answerConflict("graph:keep-mine", "node-1"), true);
    items.refresh();

    // Both stand now: the server's under its key, the viewer's under a free one, still added rather than written over the server's.
    assert.equal(items.item("node-1")!.title, "The server's");
    assert.equal(items.item("node-2")!.title, "Mine");
    assert.equal(document.draft.nodes.find(entry => entry.id === "node-2")!.created, true);
    assert.equal(items.conflict("node-2"), null);
    assert.deepEqual(graphEdges(items.items).map(edge => edge.id).sort(), ["a>node-2", "node-1>a", "node-2>a"]);
    assert.deepEqual(document.nodes, [{ id: "node-2", x: 40, y: 80 }]);
    assert.deepEqual(document.edges.map(edge => edge.id), ["a>node-2"]);
});

test("a removed node takes the links into it out of the draft, so a node added under its key next is not linked", () => {
    const document = graphDocument([
        { ...toDraft(node("node-1", "Added")), created: true },
        { ...toDraft(node("a", "A", "node-1")), baseline: JSON.stringify(node("a", "A")) }
    ]);
    const { items, services } = stage([node("a", "A")], document, GraphDraftModel);
    const editing = new GraphEditing(services, items, () => undefined);

    editing.removeNodes(new Set(["node-1"]));
    assert.deepEqual(document.draft.nodes.find(entry => entry.id === "a")!.links, []);

    editing.addNode();
    items.refresh();

    assert.equal(items.item("node-1")?.title, "ui.graph.new-node");
    assert.deepEqual(graphEdges(items.items), []);
});

test("duplicated nodes are the viewer's own under free keys, a step off their originals, linked only to one another", () => {
    const document = graphDocument([]);

    document.nodes.push({ id: "a", x: 40, y: 80 }, { id: "b", x: 200, y: 80 });

    const { items, services } = stage([node("a", "A", "b", "c"), node("b", "B", "c"), node("c", "C")], document, GraphDraftModel);
    const taken = new Set(graphEdges(items.items).map(link => link.id));
    const copies = items.duplicate(["a", "b", "missing"], 40, (entry, keys) => {
        entry.links = copiedLinks(entry, keys, taken);
    });

    services.documentState.edited();
    items.refresh();

    assert.deepEqual(copies, ["node-1", "node-2"]);
    assert.equal(items.item("node-1")!.title, "A");
    assert.deepEqual(document.draft.nodes.map(entry => [entry.id, entry.created, entry.baseline]), [["node-1", true, null], ["node-2", true, null]]);
    assert.deepEqual(document.nodes.slice(2), [{ id: "node-1", x: 80, y: 120 }, { id: "node-2", x: 240, y: 120 }]);
    // The originals keep their links; the copies carry only the one between them.
    assert.deepEqual(graphEdges(items.items).map(link => `${link.from}>${link.to}`), ["a>b", "a>c", "b>c", "node-1>node-2"]);
});

function productionDocument(resources: ResourceDraft[], crafts: CraftDraft[], plan: ProductionDocument["plan"]): ProductionDocument {
    return { nodes: [], edges: [], groups: [], draft: { resources, crafts, removed: [] }, plan, key: null };
}

function resource(id: string): Resource {
    return readEntry({ kind: "Resource", id }) as Resource;
}

function craft(id: string, from: string, to: string): Craft {
    return readEntry({ kind: "Craft", id, time: 1, ingredients: [{ resource: from, amount: 1 }], products: [{ resource: to, amount: 1 }] }) as Craft;
}

test("Keep mine on a resource whose key the server took moves the crafts, the bends and the plan that named it along", () => {
    const later = [resource("ore"), resource("resource-1"), craft("server-craft", "ore", "resource-1")];
    const document = productionDocument(
        [{ ...resourceDraft(resource("resource-1")), title: "Mine", created: true }],
        [{ ...craftDraft(craft("craft-1", "ore", "resource-1")), created: true }],
        { targets: [{ resource: "resource-1", amount: 2 }], period: "Once", objective: "LeastRaw", bought: ["resource-1"] }
    );

    document.nodes.push({ id: "resource-1", x: 5, y: 6 });
    document.edges.push({ id: "craft-1<ore", points: [] }, { id: "server-craft<ore", points: [] });

    const { items } = stage(later, document, ProductionDraftModel);

    assert.equal(items.answerConflict("graph:keep-mine", "resource-1"), true);
    items.refresh();

    assert.equal(items.item("resource-2")?.title, "Mine");
    assert.equal(items.item("resource-1")?.title, null);
    assert.deepEqual(document.draft.crafts[0].products, [{ resource: "resource-2", amount: 1 }]);
    // The server's own craft still makes the server's resource.
    assert.deepEqual((items.item("server-craft") as Craft).products, [{ resource: "resource-1", amount: 1 }]);
    assert.deepEqual(document.plan.targets, [{ resource: "resource-2", amount: 2 }]);
    assert.deepEqual(document.plan.bought, ["resource-2"]);
    assert.deepEqual(document.nodes, [{ id: "resource-2", x: 5, y: 6 }]);
    assert.deepEqual(document.edges.map(edge => edge.id), ["craft-1<ore", "server-craft<ore"]);
});

test("Keep mine on a craft whose key the server took renames the bends of its edges", () => {
    const later = [resource("ore"), resource("plate"), craft("craft-1", "plate", "ore")];
    const document = productionDocument([], [{ ...craftDraft(craft("craft-1", "ore", "plate")), created: true }], { targets: [], period: "Once", objective: "LeastRaw", bought: [] });

    document.edges.push({ id: "craft-1<ore", points: [] }, { id: "craft-1>plate", points: [] });

    const { items } = stage(later, document, ProductionDraftModel);

    items.resolve("craft-1", true);

    assert.equal(document.draft.crafts[0].id, "craft-2");
    assert.deepEqual(document.edges.map(edge => edge.id), ["craft-2<ore", "craft-2>plate"]);
});

test("a removed resource takes itself off the plan's targets and what it brings in", () => {
    const document = productionDocument(
        [{ ...resourceDraft(resource("resource-1")), created: true }],
        [],
        { targets: [{ resource: "resource-1", amount: 1 }, { resource: "ore", amount: 3 }], period: "Once", objective: "LeastRaw", bought: ["resource-1"] }
    );
    const { items, services } = stage([resource("ore")], document, ProductionDraftModel);
    const editing = new ProductionEditing(services, items, { collapsed: () => false, craftEdge: () => undefined, edge: () => undefined });

    editing.removeEntries(new Set(["resource-1"]));

    assert.deepEqual(document.draft.resources, []);
    assert.deepEqual(document.plan.targets, [{ resource: "ore", amount: 3 }]);
    assert.deepEqual(document.plan.bought, []);
});
