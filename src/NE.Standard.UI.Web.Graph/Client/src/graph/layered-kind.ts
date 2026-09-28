// The graph as a kind of canvas: nodes from the bound collection, drawn as cards, an edge per link, laid out in layers. The
// document says where the viewer put them and, when editable, the draft laid over the collection by key. Layout is the layered sheet's.

import { chainOf } from "./chain.ts";
import type { CollectionChange } from "ne-standard-ui";
import type { CanvasKind, CanvasKindDefinition, CanvasServices, EdgeEnds, KindDrag, MenuTarget } from "../canvas/canvas-kind.ts";
import { enableMenuEntries, showMenuEntries } from "../canvas/canvas-menus.ts";
import type { CanvasEdge, CanvasItem, Point } from "../canvas/canvas-model.ts";
import { readJson } from "../canvas/canvas-model.ts";
import { EditStructureAttribute, NodeShapeAttribute } from "../canvas/canvas-settings.ts";
import { renderCard } from "./card-view.ts";
import type { DraftConflict } from "./draft.ts";
import { resolveConflict } from "./draft.ts";
import { GraphEditing } from "./graph-editing.ts";
import { applyCollectionChange } from "./keyed-list.ts";
import { LayeredSheet } from "./layered-sheet.ts";
import { HandleAttribute } from "./link-drag.ts";
import type { GraphDocument, GraphEdge, GraphNode, GraphNodeShape } from "./model.ts";
import { draftConflicts, graphEdges, overlayDraft, readGraphDocument, readGraphNode, readShape } from "./model.ts";

/** On the root: the nodes the renderer wrote, which a bound collection's own changes then replace. */
export const NodesAttribute = "data-ui-graph-nodes";

const NodeGap = 32;
/** What a circle's name takes under it, and how wide it may run: the layout keeps this much room around every circle. */
const CaptionRoom = 34;
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

export class LayeredKind implements CanvasKind {
    /** A graph is read by its lines, and a line is straight while the middles of its nodes stand on it: the grid takes those. */
    public readonly snapsByCenter = true;

    private readonly services: CanvasServices<GraphDocument>;
    private readonly editing: GraphEditing;
    private readonly sheet: LayeredSheet;

    // The collection as the server has it; what is drawn is it with the draft laid over, worked out again whenever either changes.
    private readonly server: GraphNode[];
    private serverById = new Map<string, GraphNode>();
    private serverVersion = 0;
    private structureKey = "";
    private nodes: GraphNode[] = [];
    private nodeById = new Map<string, GraphNode>();
    private conflicts = new Map<string, DraftConflict>();
    private links: GraphEdge[] = [];
    private linkById = new Map<string, GraphEdge>();

    public constructor(services: CanvasServices<GraphDocument>) {
        const read = readJson(services.root.getAttribute(NodesAttribute));

        this.services = services;
        this.server = Array.isArray(read) ? read.map(readGraphNode).filter((node): node is GraphNode => node !== null) : [];
        this.editing = new GraphEditing(services, {
            nodes: () => this.nodes,
            serverNodes: () => this.server,
            node: id => this.nodeById.get(id),
            serverNode: id => this.serverById.get(id),
            link: id => this.linkById.get(id)
        });
        this.sheet = new LayeredSheet(services, {
            nodeIds: () => this.nodes.map(node => node.id),
            links: () => this.links,
            layoutKey: () => this.shape,
            // A circle wears its name outside its own box; the layout needs that room, or a layer's names would be written over the
            // next layer's circles.
            nodeBox: (width, height, widest) => (this.shape === "icon" ? circleBox(width, height, widest) : { width, height }),
            // A card's side is long enough to set its edges apart along; a circle's edges meet at its middle.
            spreadsEnds: id => (this.nodeById.get(id)?.shape ?? this.shape) === "card"
        }, { nodeGap: NodeGap });
        this.refresh();
    }

    /** Whether the graph lets its nodes and links be changed, beside their places. */
    private get editable(): boolean {
        return !this.services.settings.readOnly && this.services.root.hasAttribute(EditStructureAttribute);
    }

    private get document(): GraphDocument {
        return this.services.documentState.document;
    }

    private get shape(): GraphNodeShape {
        return readShape(this.services.root.getAttribute(NodeShapeAttribute)) ?? "card";
    }

    /** A change to the bound collection, the initial reset and insert among them: the cards are drawn again, and a new node placed. */
    public applyChange(change: CollectionChange): void {
        applyCollectionChange(this.server, change, readGraphNode);
        this.serverVersion++;
        this.services.draw();
    }

    /** Recomputes drawn nodes, links, back-edges and server-conflicted drafts; only when the collection or the draft actually changed. */
    private refresh(): void {
        // The document's own edit count, not the draft stringified: this runs on every pointer move of a drag.
        const draft = this.document.draft;
        const key = `${this.serverVersion}|${this.services.documentState.version}`;

        if (key === this.structureKey)
            return;

        this.structureKey = key;
        this.serverById = new Map(this.server.map(node => [node.id, node]));
        this.nodes = overlayDraft(this.server, draft);
        this.conflicts = draftConflicts(this.server, draft);
        this.nodeById = new Map(this.nodes.map(node => [node.id, node]));
        this.links = graphEdges(this.nodes);
        this.linkById = new Map(this.links.map(link => [link.id, link]));
        this.sheet.structureChanged();
    }

    // --- the sheet -------------------------------------------------------------------------------------------------------------

    public items(): readonly CanvasItem[] {
        this.refresh();
        return this.sheet.items();
    }

    public edges(): readonly CanvasEdge[] {
        this.refresh();
        return this.sheet.edges();
    }

    public renderItem(item: CanvasItem): HTMLElement {
        const node = this.nodeById.get(item.id) ?? { id: item.id, title: null, subtitle: null, icon: null, image: null, shape: null, color: null, badge: null, tooltip: null, links: [] };

        return renderCard(item, node, {
            icons: this.services.context.icons,
            tooltips: this.services.context.tooltips,
            shape: this.shape,
            connectable: this.editable,
            conflict: this.conflicts.get(node.id) ?? null
        });
    }

    public itemsDrawn(): void {
        this.sheet.itemsDrawn();
    }

    public itemColor(item: CanvasItem): string {
        return this.nodeById.get(item.id)?.color ?? "";
    }

    public edgeEnds(edge: CanvasEdge): EdgeEnds | null {
        const link = this.linkById.get(edge.id);
        const ends = link === undefined ? null : this.sheet.ends(link);

        return link === undefined || ends === null ? null : { ...ends, arrow: true, label: link.caption };
    }

    /** The whole line the node stands on, up and down, without the branches beside it. */
    public related(itemId: string): { edges: readonly string[]; items: readonly string[] } {
        return chainOf(this.links, itemId);
    }

    public edgeColor(): string {
        return "var(--ui-text-muted)";
    }

    // --- presses: a card has no parts of its own ------------------------------------------------------------------------------------

    public isEditor(): boolean {
        return false;
    }

    public isPanel(): boolean {
        return false;
    }

    /** A press on a node's handle pulls a link out of it; every other press is the canvas's. */
    public pointerDown(_event: PointerEvent, target: Element): KindDrag | boolean {
        const handle = target.closest<HTMLElement>(`[${HandleAttribute}]`);

        if (handle === null || !this.editable)
            return false;

        return this.editing.beginLink(handle) ?? true;
    }

    public chrome(): boolean {
        return false;
    }

    public backgroundDoubleClick(): void {
    }

    public escape(): void {
    }

    // --- editing: the nodes and links into the draft, when the graph allows it -------------------------------------------------------

    // A copy of the application's node would need a key of the application's own, which the canvas cannot make up: no clipboard.
    public copy(): void {
    }

    public paste(): readonly string[] | null {
        return null;
    }

    public remove(itemIds: ReadonlySet<string>, edgeIds: ReadonlySet<string>): void {
        if (!this.editable)
            return;

        this.editing.removeLinks(edgeIds);
        this.editing.removeNodes(itemIds);
    }

    public canEditItems(): boolean {
        return this.editable;
    }

    /** A node's name is the node's, in the draft; on a graph that does not allow it, nothing is written anywhere. */
    public renameItem(id: string, title: string | null): boolean {
        if (this.editable)
            this.editing.rename(id, title);

        return true;
    }

    public paintItem(id: string, color: string | null): boolean {
        if (this.editable)
            this.editing.paint(id, color);

        return true;
    }

    public hasEdgeMenu(): boolean {
        return true;
    }

    public arrange(sizes: ReadonlyMap<string, { width: number; height: number }>, only: ReadonlySet<string> | undefined): Map<string, Point> {
        return this.sheet.arrange(sizes, only);
    }

    public runCommand(key: string, target: MenuTarget | null): boolean {
        if (key === "graph:take-server" || key === "graph:keep-mine") {
            if (target?.kind === "node" && !this.services.settings.readOnly && resolveConflict(this.document.draft.nodes, target.id, this.serverById.get(target.id), key === "graph:keep-mine"))
                this.services.documentState.edited();

            return true;
        }

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
        const conflict = editable && target?.kind === "node" && this.conflicts.has(target.id);

        // A conflict's two answers stand in the menu only of an item that has one.
        showMenuEntries(this.services.root, "graph:take-server", conflict);
        showMenuEntries(this.services.root, "graph:keep-mine", conflict);

        for (const key of ["graph:add-node", "graph:caption", "graph:delete-edge"])
            enableMenuEntries(this.services.root, key, allowed);
    }
}
