// What the viewer changes about a graph's nodes beyond what the collection itself takes (named, recoloured): added, removed,
// linked, a link's caption changed or removed. Every change goes into the document's draft, by key, until the save.

import type { CanvasServices, KindDrag } from "../canvas/canvas-kind.ts";
import type { DraftedCollection } from "./drafted-collection.ts";
import { beginLinkDrag, edgeMiddle, openChipField } from "./link-drag.ts";
import type { GraphDocument, GraphEdge, GraphNode, GraphNodeDraft } from "./model.ts";
import { linkKey } from "./model.ts";

export class GraphEditing {
    private readonly services: CanvasServices<GraphDocument>;
    private readonly nodes: DraftedCollection<GraphDocument, GraphNode, GraphNodeDraft>;
    /** A drawn link by its key. */
    private readonly link: (id: string) => GraphEdge | undefined;

    public constructor(services: CanvasServices<GraphDocument>, nodes: DraftedCollection<GraphDocument, GraphNode, GraphNodeDraft>, link: (id: string) => GraphEdge | undefined) {
        this.services = services;
        this.nodes = nodes;
        this.link = link;
    }

    /** A node of the viewer's own where the pointer last stood, chosen, and named at once. */
    public addNode(): void {
        const title = this.services.context.strings.text("ui.graph.new-node");

        this.nodes.add("node", id => ({ id, title, subtitle: null, icon: null, image: null, shape: null, color: null, badge: null, tooltip: null, links: [], created: true, baseline: null }));
    }

    /**
     * Nodes taken out, and every drafted link into them: a link left to a key nothing holds would be drawn again to the next node
     * added under it.
     */
    public removeNodes(ids: ReadonlySet<string>): void {
        this.nodes.remove(ids);

        for (const entry of this.services.documentState.document.draft.nodes) {
            if (entry.links.some(link => ids.has(link.to)))
                entry.links = entry.links.filter(link => !ids.has(link.to));
        }
    }

    /** Links taken out of the nodes that carry them. */
    public removeLinks(ids: ReadonlySet<string>): void {
        for (const id of ids) {
            const link = this.link(id);
            const owner = link === undefined ? null : this.nodes.draftOf(link.from);

            if (owner !== null)
                owner.links = owner.links.filter(candidate => candidate.id !== id);
        }
    }

    /** A press on a node's handle: a link pulled out of it, dropped on a node it does not link to yet. */
    public beginLink(handle: HTMLElement): KindDrag | null {
        return beginLinkDrag(this.services, handle, {
            canLink: (from, to) => this.nodes.item(from)?.links.some(link => link.to === to) !== true,
            link: (from, to) => this.addLink(from, to)
        });
    }

    private addLink(from: string, to: string): void {
        const owner = this.nodes.draftOf(from);

        if (owner === null || owner.links.some(link => link.to === to))
            return;

        const taken = new Set(this.nodes.items.flatMap(node => node.links.map(link => link.id)));

        owner.links.push({ id: linkKey(from, to, taken), to, caption: null });
        this.services.documentState.edited();
    }

    /** The rename field over a link's caption, in a chip standing half way along the edge — where its caption is, or would be. */
    public editCaption(id: string): void {
        const link = this.link(id);
        const middle = edgeMiddle(this.services, id);

        if (link === undefined || middle === null)
            return;

        openChipField(this.services, middle, link.caption ?? "", value => {
            const owner = this.nodes.draftOf(link.from);

            if (owner === null)
                return;

            owner.links = owner.links.map(candidate => (candidate.id === id ? { ...candidate, caption: value.length === 0 ? null : value } : candidate));
            this.services.documentState.edited();
        });
    }
}
