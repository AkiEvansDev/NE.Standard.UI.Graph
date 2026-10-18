// The graph's nodes off the wire (one object per node, with its outgoing links), and the document: where the viewer put them
// and the draft of what they changed, laid over the bound collection by key; a server change under a draft entry is a conflict.

import type { CanvasEdge, CanvasGroup, CanvasItem } from "../canvas/canvas-model.ts";
import { readCanvasEdge, readDocumentKey, readDraftMarks, readGroup, readPlacement, readText } from "../canvas/canvas-model.ts";
import type { DraftModel } from "./draft.ts";
import { overlay } from "./draft.ts";

type GraphLink = {
    readonly id: string;
    readonly to: string;
    readonly caption: string | null;
};

/** How a node is drawn: a card, or a circle holding its picture or icon. */
export type GraphNodeShape = "card" | "icon";

export type GraphNode = {
    readonly id: string;
    readonly title: string | null;
    readonly subtitle: string | null;
    readonly icon: string | null;
    readonly image: string | null;
    /** The node's own shape; unset, the graph's. */
    readonly shape: GraphNodeShape | null;
    readonly color: string | null;
    readonly badge: string | null;
    readonly tooltip: string | null;
    readonly links: readonly GraphLink[];
};

/** One drawn edge: the link, the node it leaves, and the node it enters. */
export type GraphEdge = GraphLink & { readonly from: string };

/** One node as the draft holds it, in the server's own spelling so a save reads it like a node; `created` marks a viewer-added node, `baseline` the server's node as JSON when first changed. */
export type GraphNodeDraft = {
    id: string;
    title: string | null;
    subtitle: string | null;
    icon: string | null;
    image: string | null;
    shape: "Card" | "Icon" | null;
    color: string | null;
    badge: string | null;
    tooltip: string | null;
    links: GraphLink[];
    created: boolean;
    baseline: string | null;
};

/** What the viewer changed about the nodes since the last save: every node added or changed, whole, and every node removed. */
export type GraphDraft = {
    nodes: GraphNodeDraft[];
    removed: string[];
};

export type GraphDocument = {
    nodes: CanvasItem[];
    edges: CanvasEdge[];
    groups: CanvasGroup[];
    draft: GraphDraft;
    key: string | null;
};

function emptyGraphDocument(): GraphDocument {
    return { nodes: [], edges: [], groups: [], draft: { nodes: [], removed: [] }, key: null };
}

/** A document as it came off the wire, with every part present and every number a number. */
export function readGraphDocument(value: unknown): GraphDocument {
    const source = value as Partial<GraphDocument> | null | undefined;

    if (source === null || source === undefined || typeof source !== "object")
        return emptyGraphDocument();

    const draft = source.draft as Partial<GraphDraft> | null | undefined;

    return {
        nodes: (source.nodes ?? []).map(readPlacement),
        edges: (source.edges ?? []).map(readCanvasEdge),
        groups: (source.groups ?? []).map(readGroup),
        draft: {
            nodes: (draft?.nodes ?? []).flatMap(entry => {
                const node = readGraphNode(entry);

                return node === null ? [] : [{ ...toDraft(node), ...readDraftMarks(entry) }];
            }),
            removed: (draft?.removed ?? []).map(id => String(id))
        },
        key: readDocumentKey(source)
    };
}

/** A node's state as a draft entry writes it, not yet marked as added or tied to what the server had. */
export function toDraft(node: GraphNode): GraphNodeDraft {
    return {
        id: node.id,
        title: node.title,
        subtitle: node.subtitle,
        icon: node.icon,
        image: node.image,
        shape: node.shape === "icon" ? "Icon" : node.shape === "card" ? "Card" : null,
        color: node.color,
        badge: node.badge,
        tooltip: node.tooltip,
        links: node.links.map(link => ({ ...link })),
        created: false,
        baseline: null
    };
}

/** A draft entry as the node the canvas draws. */
function fromDraft(entry: GraphNodeDraft): GraphNode {
    return readGraphNode(entry)!;
}

/** The nodes the canvas draws: the server's with the draft laid over them by key. */
export function overlayDraft(server: readonly GraphNode[], draft: GraphDraft): GraphNode[] {
    return overlay(server, draft.nodes, draft.removed, fromDraft);
}

/** How the graph keeps its draft: one list of nodes, each carrying the links it leaves by. */
export const GraphDraftModel: DraftModel<GraphDocument, GraphNode, GraphNodeDraft> = {
    read: readGraphNode,
    overlay: (server, document) => overlayDraft(server, document.draft),
    lists: document => [document.draft.nodes],
    listOf: document => document.draft.nodes,
    toEntry: toDraft,
    prefix: () => "node",
    rekey: rekeyNode
};

/** The links the draft draws into the viewer's node and out of it, under keys of its new key, and the bends the viewer gave them. */
function rekeyNode(document: GraphDocument, from: string, to: string, nodes: readonly GraphNode[]): void {
    const taken = new Set([...nodes, ...document.draft.nodes].flatMap(node => node.links.map(link => link.id)));
    const renamed = new Map<string, string>();

    for (const entry of document.draft.nodes) {
        entry.links = entry.links.map(link => {
            if (entry.id !== to && link.to !== from)
                return link;

            const target = link.to === from ? to : link.to;
            const id = linkKey(entry.id, target, taken);

            taken.add(id);
            renamed.set(link.id, id);

            return { ...link, id, to: target };
        });
    }

    for (const edge of document.edges)
        edge.id = renamed.get(edge.id) ?? edge.id;
}

/** A copy's links: only those to another copy, aimed at that copy under a key of their own; one to a node left behind goes. */
export function copiedLinks(copy: GraphNodeDraft, keys: ReadonlyMap<string, string>, taken: Set<string>): GraphLink[] {
    return copy.links.flatMap(link => {
        const to = keys.get(link.to);

        if (to === undefined)
            return [];

        const id = linkKey(copy.id, to, taken);

        taken.add(id);

        return [{ ...link, id, to }];
    });
}

/** The key of a link the viewer draws: its two ends, and a serial when the two are linked already. */
export function linkKey(from: string, to: string, taken: ReadonlySet<string>): string {
    let id = `${from}>${to}`;
    let serial = 2;

    while (taken.has(id))
        id = `${from}>${to}~${serial++}`;

    return id;
}

/** One node off the wire, or nothing for a value that has no key. */
export function readGraphNode(value: unknown): GraphNode | null {
    if (value === null || typeof value !== "object")
        return null;

    const source = value as Record<string, unknown>;
    const id = source.id;

    if (typeof id !== "string" || id.length === 0)
        return null;

    const links = Array.isArray(source.links) ? source.links : [];

    return {
        id,
        title: readText(source.title),
        subtitle: readText(source.subtitle),
        icon: readText(source.icon),
        image: readText(source.image),
        shape: readShape(source.shape),
        color: readText(source.color),
        badge: readText(source.badge),
        tooltip: readText(source.tooltip),
        links: links.flatMap(link => {
            const entry = link as Record<string, unknown> | null;

            return entry !== null && typeof entry === "object" && typeof entry.id === "string" && typeof entry.to === "string"
                ? [{ id: entry.id, to: entry.to, caption: readText(entry.caption) }]
                : [];
        })
    };
}

/** A shape off the wire, where an enum travels by its name — or by its number, from a writer that does not name it. */
export function readShape(value: unknown): GraphNodeShape | null {
    if (value === "Icon" || value === "icon" || value === 1)
        return "icon";

    return value === "Card" || value === "card" || value === 0 ? "card" : null;
}

/** Every link of the graph whose two ends are both nodes of it, in the nodes' order and each node's own. */
export function graphEdges(nodes: readonly GraphNode[]): GraphEdge[] {
    const known = new Set(nodes.map(node => node.id));

    return nodes.flatMap(node => node.links.filter(link => known.has(link.to)).map(link => ({ ...link, from: node.id })));
}
