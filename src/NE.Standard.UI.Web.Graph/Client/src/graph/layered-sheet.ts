// A sheet laid out in layers: item placements and link routes from the document, unplaced items laid out once measurable, and
// back-edges; shared by the graph and the production graph, which lend their items and links here.

import type { CanvasServices, EdgeEnds } from "../canvas/canvas-kind.ts";
import type { CanvasDocument, CanvasEdge, CanvasItem, Point } from "../canvas/canvas-model.ts";
import { DirectionAttribute } from "../canvas/canvas-settings.ts";
import type { Rect } from "../canvas/geometry.ts";
import { intersects } from "../canvas/geometry.ts";
import type { LaneLeg, LanePoint } from "../canvas/lanes.ts";
import { assignLanes } from "../canvas/lanes.ts";
import type { LayeredDirection, LayeredEdge } from "./layered.ts";
import { layered } from "./layered.ts";

/** A document laid out in layers: its placements and routes beside the groups every canvas has. */
export type LayeredDocument = CanvasDocument & { nodes: CanvasItem[]; edges: CanvasEdge[] };

export type LayeredSheetHost = {
    /** Every node's key, in the order the layout breaks its ties by. */
    nodeIds(): readonly string[];
    /** What a node takes on the sheet beyond its own box (e.g. a caption's room), as wide as the widest node's extra (`widest`), so a layer's circles still align and its chips clear the gap. */
    nodeBox?(width: number, height: number, widest: number): { width: number; height: number };
    links(): readonly LayeredEdge[];
    /** What the layout is laid for beside its direction — how nodes are drawn — so a change lays out again what it placed. */
    layoutKey(): string;
};

export type LayeredSheetOptions = {
    readonly nodeGap: number;
    readonly layerGap?: number;
};

export class LayeredSheet {
    private readonly services: CanvasServices<LayeredDocument>;
    private readonly host: LayeredSheetHost;
    private readonly options: LayeredSheetOptions;

    private backEdges = new Set<string>();
    // The nodes drawn before the document placed them: laid out once their boxes can be measured.
    private readonly pending = new Set<string>();
    private placing = false;
    // Whether the viewer had a view of this canvas kept before it was first drawn: the first layout keeps it rather than fitting.
    private readonly viewKept: boolean;
    private placedOnce = false;
    private turned = false;
    // Where the last layout put each node and routed each edge; a route is kept only while both ends stand where the layout left them.
    private laidAt = new Map<string, Point>();
    private routes = new Map<string, Point[]>();
    // Where the stepped edges turn, by leg; worked out with the first edge of a draw and let go with the next draw.
    private lanes: Map<string, number> | null = null;
    // What the last layout was laid for: a turned direction or another shape of node lays out again what it placed.
    private laidFor: string;

    public constructor(services: CanvasServices<LayeredDocument>, host: LayeredSheetHost, options: LayeredSheetOptions) {
        this.services = services;
        this.host = host;
        this.options = options;
        // Read before the first draw: the core writes the view to the store as it draws.
        this.viewKept = services.context.store.readJson(services.root, "view") !== null;
        this.laidFor = this.layoutFor;
    }

    public get direction(): LayeredDirection {
        const named = this.services.root.getAttribute(DirectionAttribute);

        return named === "down" || named === "left" || named === "up" ? named : "right";
    }

    private get document(): LayeredDocument {
        return this.services.documentState.document;
    }

    private get layoutFor(): string {
        return `${this.direction}:${this.host.layoutKey()}`;
    }

    /** The nodes or the links changed: which edges run back is worked out again. None of it follows the layout, so a drag changes nothing. */
    public structureChanged(): void {
        this.backEdges = layered(this.host.nodeIds().map(id => ({ id, width: 0, height: 0 })), this.host.links(), { direction: this.direction }).backEdges;
    }

    public isBack(linkId: string): boolean {
        return this.backEdges.has(linkId);
    }

    /** A placement per node, taken from the document or added to it: a drag moves the document's own object. */
    public items(): CanvasItem[] {
        const document = this.document;
        const placed = new Map(document.nodes.map(node => [node.id, node]));

        return this.host.nodeIds().map(id => {
            let placement = placed.get(id);

            if (placement === undefined) {
                placement = { id, x: 0, y: 0, pinned: false };
                document.nodes.push(placement);
                placed.set(id, placement);
                this.pending.add(id);
            }

            return placement;
        });
    }

    /** A route per link, taken from the document or added to it, so a reroute point dropped on an edge lands in the document. */
    public edges(): CanvasEdge[] {
        // The edges are about to be drawn again, over nodes that may have moved: the lanes are worked out afresh with the first of them.
        this.lanes = null;

        const document = this.document;
        const routed = new Map(document.edges.map(edge => [edge.id, edge]));

        return this.host.links().map(link => {
            let route = routed.get(link.id);

            if (route === undefined) {
                route = { id: link.id, points: [] };
                document.edges.push(route);
                routed.set(link.id, route);
            }

            return route;
        });
    }

    public itemsDrawn(): void {
        // A turned direction or reshaped nodes re-lays out the whole sheet, since sizes and axes changed; Ctrl+Z restores any hand-placed positions.
        if (this.layoutFor !== this.laidFor) {
            this.laidFor = this.layoutFor;
            this.turned = true;

            for (const id of this.host.nodeIds())
                this.pending.add(id);
        }

        if (this.pending.size === 0 || this.placing)
            return;

        // After the draw that is under way: a node is measured once it stands on the page, and drawing again from inside a draw
        // would watch the same nodes twice.
        this.placing = true;
        queueMicrotask(() => this.placePending());
    }

    /** Places nodes nothing has placed yet, per the layered layout; on an empty sheet that's everything, else a new node takes its layer's place and steps clear of what it would cover. */
    private placePending(): void {
        this.placing = false;

        const items = this.items();

        // If every existing node is still exactly where the layout put it, new nodes trigger a full relayout rather than being placed
        // beside them without routes; once the viewer has hand-placed a node, new ones are placed beside it instead.
        if (this.pending.size > 0 && this.pending.size < items.length && items.every(item => this.pending.has(item.id) || this.standsWhereLaid(item.id))) {
            for (const item of items)
                this.pending.add(item.id);
        }

        const fresh = items.filter(item => this.pending.has(item.id));

        if (fresh.length === 0)
            return;

        const layout = this.layout(this.measure());
        this.laidAt = layout.positions;
        this.routes = layout.routes;

        const taken: Rect[] = items.filter(item => !this.pending.has(item.id)).map(item => this.services.nodeRect(item.id)).filter((rect): rect is Rect => rect !== null);
        const everything = taken.length === 0;

        for (const item of fresh) {
            const place = layout.positions.get(item.id);
            const rect = this.services.nodeRect(item.id);

            if (place === undefined || rect === null)
                continue;

            const box: Rect = { x: place.x, y: place.y, width: rect.width, height: rect.height };

            while (!everything && taken.some(other => intersects(box, other))) {
                if (this.direction === "down")
                    box.x += box.width + this.options.nodeGap;
                else
                    box.y += box.height + this.options.nodeGap;
            }

            item.x = box.x;
            item.y = box.y;
            taken.push(box);
        }

        this.pending.clear();
        this.services.draw();

        // A freshly laid-out sheet is shown whole (Fit), except the first time a returning viewer opens it — their kept view stands.
        if ((everything || this.turned) && (this.placedOnce || !this.viewKept))
            this.services.view.fit();

        this.placedOnce = true;
        this.turned = false;
    }

    /** Runs the layered layout, snapped to the grid; a long edge's via-points move with its source's snap so it sets out level — remembered positions tell laid-out nodes from hand-placed ones. */
    private layout(sizes: readonly { id: string; width: number; height: number }[]): ReturnType<typeof layered> {
        const widest = this.host.nodeBox === undefined ? 0 : Math.max(0, ...sizes.map(size => this.services.nodeExtent(size.id)?.width ?? 0));
        const boxes = sizes.map(size => ({ id: size.id, ...this.box(size.width, size.height, widest) }));
        const result = layered(boxes, this.host.links(), { direction: this.direction, nodeGap: this.options.nodeGap, layerGap: this.options.layerGap });
        const moved = new Map<string, Point>();

        for (const [index, size] of sizes.entries()) {
            const place = result.positions.get(size.id);

            // A node stands in the middle of the room it was given, as what it wears hangs either side of it.
            if (place !== undefined)
                result.positions.set(size.id, { x: place.x + (boxes[index].width - size.width) / 2, y: place.y });
        }

        for (const [id, place] of result.positions) {
            const snapped = this.services.snapPlace(id, place);

            moved.set(id, { x: snapped.x - place.x, y: snapped.y - place.y });
            result.positions.set(id, snapped);
        }

        for (const link of this.host.links()) {
            const by = moved.get(link.from);
            const route = result.routes.get(link.id);

            if (by !== undefined && route !== undefined)
                result.routes.set(link.id, route.map(point => ({ x: point.x + by.x, y: point.y + by.y })));
        }

        return result;
    }

    private measure(): { id: string; width: number; height: number }[] {
        return this.host.nodeIds().map(id => {
            const element = this.services.nodeElements.get(id);

            return { id, width: element?.offsetWidth ?? 0, height: element?.offsetHeight ?? 0 };
        });
    }

    /** A node's box as the layout sees it: its own, or what the kind draws around it. */
    private box(width: number, height: number, widest: number): { width: number; height: number } {
        return this.host.nodeBox === undefined ? { width, height } : this.host.nodeBox(width, height, widest);
    }

    /** Where Arrange puts each moving node: the whole layout, remembered as the one edges keep their routes by. */
    public arrange(sizes: ReadonlyMap<string, { width: number; height: number }>, only: ReadonlySet<string> | undefined): Map<string, Point> {
        const layout = this.layout(this.host.nodeIds().map(id => ({ id, width: sizes.get(id)?.width ?? 0, height: sizes.get(id)?.height ?? 0 })));
        const positions = layout.positions;

        this.laidAt = new Map(layout.positions);
        this.routes = layout.routes;

        if (only !== undefined) {
            for (const id of [...positions.keys()]) {
                if (!only.has(id))
                    positions.delete(id);
            }
        }

        return positions;
    }

    /** Where a link's edge leaves and enters: a forward edge from the side facing the next layer to the one facing the last; a backward edge arcs clear of the layers it runs back over. */
    public ends(link: LayeredEdge): Pick<EdgeEnds, "from" | "to" | "axis" | "back" | "via" | "reversed" | "turns"> | null {
        const ends = this.endsOf(link);

        if (ends === null || ends.back === true || this.services.settings.edgeShape !== "orthogonal")
            return ends;

        this.lanes ??= this.assignLanes();

        return { ...ends, turns: [ends.from, ...ends.via ?? []].map((_, leg) => this.lanes!.get(`${link.id}#${leg}`)) };
    }

    /** Assigns a lane per forward-edge leg (`canvas/lanes.ts`) so stepped edges crossing one gap don't all turn on one line; a leg's key is its edge id plus its position along it. */
    private assignLanes(): Map<string, number> {
        const legs: LaneLeg[] = [];

        for (const link of this.host.links()) {
            const ends = this.endsOf(link);

            if (ends === null || ends.back === true)
                continue;

            const sign = ends.reversed === true ? -1 : 1;
            const turn = (point: Point): LanePoint => (ends.axis === "vertical" ? { along: point.y * sign, across: point.x } : { along: point.x * sign, across: point.y });
            const stops = [ends.from, ...ends.via ?? [], ends.to];

            for (let leg = 0; leg + 1 < stops.length; leg++) {
                legs.push({
                    id: `${link.id}#${leg}`,
                    from: turn(stops[leg]),
                    to: turn(stops[leg + 1]),
                    source: leg === 0 ? link.from : `${link.id}#${leg}`,
                    target: leg + 2 === stops.length ? link.to : `${link.id}#${leg + 1}`
                });
            }
        }

        const lanes = assignLanes(legs);
        const reversed = this.direction === "left" || this.direction === "up";

        // Back on the page's own axis, where the drawing reads them.
        return reversed ? new Map([...lanes].map(([id, at]) => [id, -at])) : lanes;
    }

    private endsOf(link: LayeredEdge): Pick<EdgeEnds, "from" | "to" | "axis" | "back" | "via" | "reversed"> | null {
        const from = this.services.nodeRect(link.from);
        const to = this.services.nodeRect(link.to);

        if (from === null || to === null)
            return null;

        const direction = this.direction;
        const down = direction === "down" || direction === "up";
        // The layers run back the other way: an edge then leaves by the side that faces the next layer there, which is the other one.
        const back = this.backEdges.has(link.id);
        const turned = direction === "left" || direction === "up";
        const self = link.from === link.to;

        let start: Point;
        let end: Point;

        if (!back) {
            start = down
                ? { x: from.x + from.width / 2, y: turned ? from.y : from.y + from.height }
                : { x: turned ? from.x : from.x + from.width, y: from.y + from.height / 2 };
            end = down
                ? { x: to.x + to.width / 2, y: turned ? to.y + to.height : to.y }
                : { x: turned ? to.x + to.width : to.x, y: to.y + to.height / 2 };
        }
        else {
            // A node's link to itself leaves and returns on the same side, a little apart, so its arc is a loop over the node.
            const leave = self ? 0.7 : 0.5;
            const enter = self ? 0.3 : 0.5;

            start = down ? { x: from.x, y: from.y + from.height * leave } : { x: from.x + from.width * leave, y: from.y };
            end = down ? { x: to.x, y: to.y + to.height * enter } : { x: to.x + to.width * enter, y: to.y };
        }

        return { from: start, to: end, axis: down ? "vertical" : "horizontal", back, via: this.routeOf(link), reversed: turned };
    }

    /** The route the last layout gave a long edge, while both its ends still stand where that layout put them. */
    private routeOf(link: LayeredEdge): readonly Point[] | undefined {
        const route = this.routes.get(link.id);

        return route !== undefined && this.standsWhereLaid(link.from) && this.standsWhereLaid(link.to) ? route : undefined;
    }

    private standsWhereLaid(id: string): boolean {
        const laid = this.laidAt.get(id);
        const placement = this.document.nodes.find(node => node.id === id);

        return laid !== undefined && placement !== undefined && Math.abs(laid.x - placement.x) < 0.5 && Math.abs(laid.y - placement.y) < 0.5;
    }
}
