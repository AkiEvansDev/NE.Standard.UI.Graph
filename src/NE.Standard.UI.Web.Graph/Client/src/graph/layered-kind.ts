// The graph as a kind of canvas: nodes from the bound collection, drawn as cards, an edge per link, laid out in layers. The
// document says where the viewer put them and, when editable, the draft laid over the collection by key. Layout is the layered sheet's.

import type { CanvasKind, CanvasKindDefinition, CanvasServices, EdgeEnds, MenuTarget } from "../canvas/canvas-kind.ts";
import { enableMenuEntries } from "../canvas/canvas-menus.ts";
import type { CanvasEdge, CanvasItem, Point } from "../canvas/canvas-model.ts";
import { EditStructureAttribute, NodeShapeAttribute } from "../canvas/canvas-settings.ts";
import { renderCard } from "./card-view.ts";
import { DraftedCollection } from "./drafted-collection.ts";
import { DraftedLayeredKind } from "./drafted-layered-kind.ts";
import { GraphEditing } from "./graph-editing.ts";
import { LayeredSheet } from "./layered-sheet.ts";
import type { GraphDocument, GraphEdge, GraphNode, GraphNodeDraft, GraphNodeShape } from "./model.ts";
import { copiedLinks, GraphDraftModel, graphEdges, readGraphDocument, readShape } from "./model.ts";

const NodeGap = 32;
/**
 * What a circle's name takes under it — the gap and two lines (`.ui-graph__bubble-title`) — and how wide it may run: the layout keeps
 * this much room around every circle, and an edge meeting a circle's bottom ends under it.
 */
export const CaptionRoom = 38;
const CaptionWidth = 96;

/** A circle's room on the sheet: its name's under it, its edges meet it at the circle's middle, and it stands in the middle of the widest. */
export function circleBox(width: number, height: number, widest: number): { width: number; height: number; anchor: Point } {
    const room = Math.max(width, CaptionWidth, widest);

    return { width: room, height: height + CaptionRoom, anchor: { x: room / 2, y: height / 2 } };
}

export const LayeredKindDefinition: CanvasKindDefinition<GraphDocument> = {
    name: "layered",
    readDocument: readGraphDocument,
    create: services => new LayeredKind(services)
};

export class LayeredKind extends DraftedLayeredKind<GraphDocument, GraphNode, GraphNodeDraft, GraphEdge> implements CanvasKind {
    protected readonly collection: DraftedCollection<GraphDocument, GraphNode, GraphNodeDraft>;
    protected readonly editing: GraphEditing;
    protected readonly sheet: LayeredSheet;

    public constructor(services: CanvasServices<GraphDocument>) {
        super(services);
        this.collection = new DraftedCollection(services, GraphDraftModel, (id, at) => this.sheet.placeAt(id, at));
        this.editing = new GraphEditing(services, this.collection, id => this.linkById.get(id));
        this.sheet = new LayeredSheet(services, {
            nodeIds: () => this.collection.items.map(node => node.id),
            links: () => this.links,
            layoutKey: () => this.shape,
            // A circle wears its name outside its own box; the layout needs that room, or a layer's names would be written over the
            // next layer's circles. A node's own shape outranks the sheet's, as its card is drawn by it.
            nodeBox: (id, width, height, widest) => (this.shapeOf(id) === "icon" ? circleBox(width, height, widest) : { width, height }),
            // A card's side is long enough to set its edges apart along; a circle's edges meet at its middle.
            spreadsEnds: id => this.shapeOf(id) === "card",
            footRoom: id => (this.shapeOf(id) === "icon" ? CaptionRoom : 0)
        }, { nodeGap: NodeGap });
        this.refresh();
    }

    /** Whether the graph lets its nodes and links be changed, beside their places. */
    protected get editable(): boolean {
        return !this.services.settings.readOnly && this.services.root.hasAttribute(EditStructureAttribute);
    }

    private get shape(): GraphNodeShape {
        return readShape(this.services.root.getAttribute(NodeShapeAttribute)) ?? "card";
    }

    /** The shape a node is drawn in: its own, or the sheet's. */
    private shapeOf(id: string): GraphNodeShape {
        return this.collection.item(id)?.shape ?? this.shape;
    }

    /** Recomputes drawn nodes, links, back-edges and server-conflicted drafts; only when the collection or the draft actually changed. */
    protected refresh(): void {
        if (!this.collection.refresh())
            return;

        this.links = graphEdges(this.collection.items);
        this.linkById = new Map(this.links.map(link => [link.id, link]));
        this.sheet.structureChanged();
    }

    // --- the sheet -------------------------------------------------------------------------------------------------------------

    public renderItem(item: CanvasItem): HTMLElement {
        const node = this.collection.item(item.id) ?? { id: item.id, title: null, subtitle: null, icon: null, image: null, shape: null, color: null, badge: null, tooltip: null, links: [] };

        return renderCard(item, node, {
            icons: this.services.context.icons,
            tooltips: this.services.context.tooltips,
            urls: this.services.context.urls,
            shape: this.shape,
            connectable: this.editable,
            conflict: this.collection.conflict(node.id)
        });
    }

    public edgeEnds(edge: CanvasEdge): EdgeEnds | null {
        const link = this.linkById.get(edge.id);
        const ends = link === undefined ? null : this.sheet.ends(link);

        return link === undefined || ends === null ? null : { ...ends, arrow: true, label: link.caption };
    }

    // --- presses: a card has no parts of its own ------------------------------------------------------------------------------------

    public isPanel(): boolean {
        return false;
    }

    public chrome(): boolean {
        return false;
    }

    public escape(): void {
    }

    // --- editing: the nodes and links into the draft, when the graph allows it -------------------------------------------------------

    /** Copies as the viewer's own nodes under keys the canvas makes, as Add node makes one; a link stays only between two copies. */
    public duplicate(itemIds: ReadonlySet<string>): readonly string[] | null {
        if (!this.editable)
            return null;

        const taken = new Set([...this.collection.items, ...this.services.documentState.document.draft.nodes].flatMap(node => node.links.map(link => link.id)));
        const copies = this.collection.duplicate(itemIds, this.services.settings.gridSize * 2, (entry, keys) => {
            entry.links = copiedLinks(entry, keys, taken);
        });

        return copies.length === 0 ? null : copies;
    }

    public canDuplicate(id: string): boolean {
        return this.editable && this.collection.item(id) !== undefined;
    }

    public disconnect(itemIds: ReadonlySet<string>): boolean {
        const links = this.editable ? this.links.filter(link => itemIds.has(link.from) || itemIds.has(link.to)) : [];

        this.editing.removeLinks(new Set(links.map(link => link.id)));

        return links.length > 0;
    }

    public canDisconnect(id: string): boolean {
        return this.editable && this.links.some(link => link.from === id || link.to === id);
    }

    public remove(itemIds: ReadonlySet<string>, edgeIds: ReadonlySet<string>): boolean {
        if (!this.editable)
            return false;

        this.editing.removeLinks(edgeIds);
        this.editing.removeNodes(itemIds);

        return true;
    }

    public runCommand(key: string, target: MenuTarget | null): boolean {
        if (this.collection.answerConflict(key, target?.kind === "node" ? target.id : null))
            return true;

        if (!this.editable)
            return key === "graph:add-node" || key === "graph:caption" || key === "graph:delete-edge";

        switch (key) {
            case "graph:add-node":
                this.editing.addNode();
                return true;

            case "graph:caption":
                if (target?.kind === "edge")
                    this.editing.editCaption(target.id);

                return true;

            case "graph:delete-edge":
                if (target?.kind === "edge") {
                    this.editing.removeLinks(new Set([target.id]));
                    this.services.documentState.edited();
                }

                return true;

            default:
                return false;
        }
    }

    public syncMenus(editable: boolean, target: MenuTarget | null): void {
        const allowed = editable && this.editable;

        this.collection.showConflictAnswers(editable && target?.kind === "node" && this.collection.conflict(target.id) !== null);

        for (const key of ["graph:add-node", "graph:caption", "graph:delete-edge"])
            enableMenuEntries(this.services, key, allowed);
    }
}
