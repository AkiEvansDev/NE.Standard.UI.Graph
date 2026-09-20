// What the viewer changes about a graph's nodes (not their places): added, renamed, recoloured, removed, linked, a link's caption
// changed or removed. Every change goes into the document's draft, by key, and nothing reaches the application until the save.

import type { CanvasServices, KindDrag } from "../canvas/canvas-kind.ts";
import { freeKey } from "./draft.ts";
import { beginLinkDrag, edgeMiddle, openChipField } from "./link-drag.ts";
import type { GraphDocument, GraphEdge, GraphNode, GraphNodeDraft } from "./model.ts";
import { toDraft } from "./model.ts";

/** What the editing reaches on the kind: the nodes as drawn and as the server has them, and a link by its key. */
export type GraphEditingHost = {
    nodes(): readonly GraphNode[];
    node(id: string): GraphNode | undefined;
    serverNode(id: string): GraphNode | undefined;
    link(id: string): GraphEdge | undefined;
};

export class GraphEditing {
    private readonly services: CanvasServices<GraphDocument>;
    private readonly host: GraphEditingHost;

    public constructor(services: CanvasServices<GraphDocument>, host: GraphEditingHost) {
        this.services = services;
        this.host = host;
    }

    private get document(): GraphDocument {
        return this.services.documentState.document;
    }

    /** The draft entry for a node, created from what's drawn on first change, with the server's node kept beside it to tell a later server change apart. */
    private draftOf(id: string): GraphNodeDraft | null {
        const existing = this.document.draft.nodes.find(entry => entry.id === id);

        if (existing !== undefined)
            return existing;

        const node = this.host.node(id);

        if (node === undefined)
            return null;

        const server = this.host.serverNode(id);
        const entry: GraphNodeDraft = { ...toDraft(node), baseline: server === undefined ? null : JSON.stringify(server) };

        this.document.draft.nodes.push(entry);

        return entry;
    }

    public rename(id: string, title: string | null): void {
        const entry = this.draftOf(id);

        if (entry !== null)
            entry.title = title;
    }

    public paint(id: string, color: string | null): void {
        const entry = this.draftOf(id);

        if (entry !== null)
            entry.color = color;
    }

    /** A node of the viewer's own where the pointer last stood, chosen, and named at once. */
    public addNode(): void {
        const id = freeKey("node", new Set(this.host.nodes().map(node => node.id)));
        const at = this.services.pointerScene();
        const title = this.services.context.strings.text("ui.graph.new-node");

        this.document.draft.nodes.push({
            id,
            title,
            subtitle: null,
            icon: null,
            image: null,
            shape: null,
            color: null,
            badge: null,
            tooltip: null,
            links: [],
            created: true,
            baseline: null
        });

        this.document.nodes.push({ id, x: at.x, y: at.y, pinned: false });
        this.services.selection.selectOnly(id);
        this.services.documentState.edited();
        this.services.renameItem(id);
    }

    /** Nodes taken out: one the viewer added simply goes from the draft, and the server's own is marked removed for the save. */
    public removeNodes(ids: ReadonlySet<string>): void {
        const draft = this.document.draft;

        for (const id of ids) {
            const at = draft.nodes.findIndex(entry => entry.id === id);
            const created = at >= 0 && draft.nodes[at].created;

            if (at >= 0)
                draft.nodes.splice(at, 1);

            if (!created && this.host.serverNode(id) !== undefined && !draft.removed.includes(id))
                draft.removed.push(id);
        }
    }

    /** Links taken out of the nodes that carry them. */
    public removeLinks(ids: ReadonlySet<string>): void {
        for (const id of ids) {
            const link = this.host.link(id);
            const owner = link === undefined ? null : this.draftOf(link.from);

            if (owner !== null)
                owner.links = owner.links.filter(candidate => candidate.id !== id);
        }
    }

    /** A press on a node's handle: a link pulled out of it, dropped on a node it does not link to yet. */
    public beginLink(handle: HTMLElement): KindDrag | null {
        return beginLinkDrag(this.services, handle, {
            canLink: (from, to) => this.host.node(from)?.links.some(link => link.to === to) !== true,
            link: (from, to) => this.link(from, to)
        });
    }

    private link(from: string, to: string): void {
        const owner = this.draftOf(from);

        if (owner === null || owner.links.some(link => link.to === to))
            return;

        const taken = new Set(this.host.nodes().flatMap(node => node.links.map(link => link.id)));
        let id = `${from}>${to}`;
        let serial = 2;

        while (taken.has(id))
            id = `${from}>${to}~${serial++}`;

        owner.links.push({ id, to, caption: null });
        this.services.documentState.edited();
    }

    /** The rename field over a link's caption, in a chip standing half way along the edge — where its caption is, or would be. */
    public editCaption(id: string): void {
        const link = this.host.link(id);
        const middle = edgeMiddle(this.services, id);

        if (link === undefined || middle === null)
            return;

        openChipField(this.services, middle, link.caption ?? "", value => {
            const owner = this.draftOf(link.from);

            if (owner === null)
                return;

            owner.links = owner.links.map(candidate => (candidate.id === id ? { ...candidate, caption: value.length === 0 ? null : value } : candidate));
            this.services.documentState.edited();
        });
    }
}
