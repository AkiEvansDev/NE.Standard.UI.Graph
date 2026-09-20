// The graph's nodes off the wire (one object per node, with its outgoing links), and the document: where the viewer put them
// and the draft of what they changed, laid over the bound collection by key; a server change under a draft entry is a conflict.

import type { CanvasEdge, CanvasGroup, CanvasItem } from "../canvas/canvas-model.ts";
import { readGroup, readPoints } from "../canvas/canvas-model.ts";
import type { DraftConflict } from "./draft.ts";
import { conflicts, overlay } from "./draft.ts";

export type GraphLink = {
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
};

export function emptyGraphDocument(): GraphDocument {
    return { nodes: [], edges: [], groups: [], draft: { nodes: [], removed: [] } };
}

/** A document as it came off the wire, with every part present and every number a number. */
export function readGraphDocument(value: unknown): GraphDocument {
    const source = value as Partial<GraphDocument> | null | undefined;

    if (source === null || source === undefined || typeof source !== "object")
        return emptyGraphDocument();

    const draft = source.draft as Partial<GraphDraft> | null | undefined;

    return {
        nodes: (source.nodes ?? []).map(node => ({
            id: String(node.id),
            x: Number(node.x) || 0,
            y: Number(node.y) || 0,
            pinned: node.pinned === true
        })),
        edges: (source.edges ?? []).map(edge => ({ id: String(edge.id), points: readPoints(edge.points) })),
        groups: (source.groups ?? []).map(readGroup),
        draft: {
            nodes: (draft?.nodes ?? []).flatMap(entry => {
                const node = readGraphNode(entry);

                return node === null ? [] : [{ ...toDraft(node), created: entry.created === true, baseline: typeof entry.baseline === "string" ? entry.baseline : null }];
            }),
            removed: (draft?.removed ?? []).map(id => String(id))
        }
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
export function fromDraft(entry: GraphNodeDraft): GraphNode {
    return readGraphNode(entry)!;
}

/** The nodes the canvas draws: the server's with the draft laid over them by key. */
export function overlayDraft(server: readonly GraphNode[], draft: GraphDraft): GraphNode[] {
    return overlay(server, draft.nodes, draft.removed, fromDraft);
}

/** Every drafted node the server moved under the viewer, by key. */
export function draftConflicts(server: readonly GraphNode[], draft: GraphDraft): Map<string, DraftConflict> {
    return conflicts(server, draft.nodes);
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
        title: text(source.title),
        subtitle: text(source.subtitle),
        icon: text(source.icon),
        image: text(source.image),
        shape: readShape(source.shape),
        color: text(source.color),
        badge: text(source.badge),
        tooltip: text(source.tooltip),
        links: links.flatMap(link => {
            const entry = link as Record<string, unknown> | null;

            return entry !== null && typeof entry === "object" && typeof entry.id === "string" && typeof entry.to === "string"
                ? [{ id: entry.id, to: entry.to, caption: text(entry.caption) }]
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

function text(value: unknown): string | null {
    return typeof value === "string" && value.length > 0 ? value : null;
}

/** Every link of the graph whose two ends are both nodes of it, in the nodes' order and each node's own. */
export function graphEdges(nodes: readonly GraphNode[]): GraphEdge[] {
    const known = new Set(nodes.map(node => node.id));

    return nodes.flatMap(node => node.links.filter(link => known.has(link.to)).map(link => ({ ...link, from: node.id })));
}
