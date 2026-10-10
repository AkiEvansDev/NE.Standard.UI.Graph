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
import { backEdgesOf, layered } from "./layered.ts";

/** A document laid out in layers: its placements and routes beside the groups every canvas has. */
export type LayeredDocument = CanvasDocument & { nodes: CanvasItem[]; edges: CanvasEdge[] };

export type LayeredSheetHost = {
    /** Every node's key, in the order the layout breaks its ties by. */
    nodeIds(): readonly string[];
    /**
     * The room a node takes beyond its box (a caption's), as wide as the `widest` node's extra so a layer's circles align and its
     * chips clear the gap — and where in it the edges meet the node, when not at the middle. Asked per node: a node may wear a
     * shape of its own.
     */
    nodeBox?(id: string, width: number, height: number, widest: number): { width: number; height: number; anchor?: Point };
    links(): readonly LayeredEdge[];
    /** What the layout is laid for beside its direction — how nodes are drawn — so a change lays out again what it placed. */
    layoutKey(): string;
    /** Whether a node's edges leave and enter at points of their own along its side, rather than all at its middle — a card's. */
    spreadsEnds?(id: string): boolean;
    /** What a node wears under its box (a circle's name): an edge meeting its bottom ends below it rather than through it. */
    footRoom?(id: string): number;
};

/** Below each of an edge's two nodes, the room an edge meeting its bottom stands clear of. */
export type EdgeFeet = { readonly from: number; readonly to: number };

const NoFeet: EdgeFeet = { from: 0, to: 0 };

/** How far along its side, as a share, a backward edge meets a node: high up, clear of the forward edges at the middle. */
const SideHigh = 0.35;
/** The most room between two points one side of a node sets edges apart at, and the share of the side they may take. */
const EndGap = 12;
const EndShare = 0.6;

export type LayeredSheetOptions = {
    readonly nodeGap: number;
    readonly layerGap?: number;
};

/** How far an edge's two ends stand from the middles of their sides. */
type EndShift = { from: number; to: number };

/** One edge at one side of a node, where its other end lies across the layers, and whether it runs level all the way. */
type SideEnd = { readonly id: string; readonly across: number; readonly level: boolean };

export class LayeredSheet {
    private readonly services: CanvasServices<LayeredDocument>;
    private readonly host: LayeredSheetHost;
    private readonly options: LayeredSheetOptions;

    private backEdges = new Set<string>();
    // The nodes drawn before the document placed them: laid out once their boxes can be measured.
    private readonly pending = new Set<string>();
    // The nodes the viewer added at a point: put on the grid by their middle once drawn, as only a drawn box has one.
    private readonly settling = new Set<string>();
    private placing = false;
    private turned = false;
    // Where the last layout put each node and routed each edge; a route is kept only while both ends stand where the layout left them.
    private laidAt = new Map<string, Point>();
    private routes = new Map<string, Point[]>();
    // Where the stepped edges turn, by leg; worked out with the first edge of a draw and let go with the next draw.
    private lanes: Map<string, number> | null = null;
    // How far each edge's two ends stand from the middle of their sides, by link; worked out and let go as the lanes are.
    private shifts: Map<string, EndShift> | null = null;
    // What the last layout was laid for: a turned direction or another shape of node lays out again what it placed.
    private laidFor: string;
    // Watches a canvas drawn where it has no size yet, to lay it out once it has one.
    private waiting: (() => void) | null = null;
    // The document's placements by id, for the ends of every edge to ask where their nodes stand; of the document and the list it was read off.
    private placements: { readonly nodes: readonly CanvasItem[]; readonly byId: Map<string, CanvasItem> } | null = null;

    public constructor(services: CanvasServices<LayeredDocument>, host: LayeredSheetHost, options: LayeredSheetOptions) {
        this.services = services;
        this.host = host;
        this.options = options;
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
        this.backEdges = backEdgesOf(this.host.nodeIds(), this.host.links());
    }

    public isBack(linkId: string): boolean {
        return this.backEdges.has(linkId);
    }

    /** A placement per node, taken from the document or added to it: a drag moves the document's own object. */
    public items(): CanvasItem[] {
        const document = this.document;
        const present = new Set(this.host.nodeIds());

        // A node that left where the layout had put it takes that place with it: coming back, it is laid out afresh rather than
        // dropped where another node may stand by then. A place the viewer chose is theirs, and stays.
        for (let i = document.nodes.length - 1; i >= 0; i--) {
            const id = document.nodes[i].id;

            if (!present.has(id) && this.standsWhereLaid(id)) {
                document.nodes.splice(i, 1);
                this.placements = null;
            }
        }

        const placed = new Map(document.nodes.map(node => [node.id, node]));

        return this.host.nodeIds().map(id => {
            let placement = placed.get(id);

            if (placement === undefined) {
                placement = { id, x: 0, y: 0, pinned: false };
                document.nodes.push(placement);
                placed.set(id, placement);
                this.pending.add(id);
                this.placements = null;
            }

            return placement;
        });
    }

    /** A node the viewer added, standing where they asked for it and settled on the grid once drawn. */
    public placeAt(id: string, at: Point): void {
        this.document.nodes.push({ id, x: at.x, y: at.y, pinned: false });
        this.placements = null;
        this.settling.add(id);
    }

    /** A route per link, taken from the document or added to it, so a reroute point dropped on an edge lands in the document. */
    public edges(): CanvasEdge[] {
        // The edges are about to be drawn again, over nodes that may have moved: the lanes and the ends' places are worked out afresh
        // with the first of them, and where each node stands is read off the document once for all of them.
        this.lanes = null;
        this.shifts = null;
        this.placements = null;

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

        if ((this.pending.size === 0 && this.settling.size === 0) || this.placing)
            return;

        // After the draw that is under way: a node is measured once it stands on the page, and drawing again from inside a draw
        // would watch the same nodes twice.
        this.placing = true;
        queueMicrotask(() => this.placePending());
    }

    /** Places nodes nothing has placed yet, per the layered layout; on an empty sheet that's everything, else a new node takes its layer's place and steps clear of what it would cover. */
    private placePending(): void {
        this.placing = false;

        // Drawn where nothing has a size yet — a dialog not open, a tab not shown: measured now, every node would stand at one point.
        if (this.services.root.offsetWidth === 0) {
            this.waitForSize();
            return;
        }

        const settled = this.settleAdded();
        const items = this.items();

        // If every existing node is still exactly where the layout put it, new nodes trigger a full relayout rather than being placed
        // beside them without routes; once the viewer has hand-placed a node, new ones are placed beside it instead.
        if (this.pending.size > 0 && this.pending.size < items.length && items.every(item => this.pending.has(item.id) || this.standsWhereLaid(item.id))) {
            for (const item of items)
                this.pending.add(item.id);
        }

        const fresh = items.filter(item => this.pending.has(item.id));

        if (fresh.length === 0) {
            if (settled)
                this.services.draw();

            return;
        }

        const layout = this.layout(this.measure());
        const taken: Rect[] = items.filter(item => !this.pending.has(item.id)).map(item => this.services.nodeRect(item.id)).filter((rect): rect is Rect => rect !== null);
        const everything = taken.length === 0;
        const whole = fresh.length === items.length;

        // Only a layout of every node is the one each stands by; placed beside, the others keep where the last one laid them and
        // routed their edges, and an edge of a node placed now runs plain.
        if (whole) {
            this.laidAt = layout.positions;
            this.routes = layout.routes;
        }
        else {
            for (const link of this.host.links()) {
                if (this.pending.has(link.from) || this.pending.has(link.to))
                    this.routes.delete(link.id);
            }
        }

        for (const item of fresh) {
            const place = layout.positions.get(item.id);
            const rect = this.services.nodeRect(item.id);

            if (place === undefined || rect === null)
                continue;

            const box: Rect = { x: place.x, y: place.y, width: rect.width, height: rect.height };

            while (taken.some(other => intersects(box, other))) {
                if (this.direction === "down")
                    box.x += box.width + this.options.nodeGap;
                else
                    box.y += box.height + this.options.nodeGap;
            }

            item.x = box.x;
            item.y = box.y;
            taken.push(box);

            if (!whole)
                this.laidAt.set(item.id, { x: box.x, y: box.y });
        }

        this.pending.clear();
        this.services.draw();

        // A freshly laid-out sheet is shown whole, as the view opens a sheet (a returning viewer's kept view stands the first time).
        if (everything || this.turned)
            this.services.view.fitSheet();

        this.turned = false;
    }

    /** Puts the nodes the viewer added at a point on the grid, by their middle as the kind snaps; whether any was there to put. */
    private settleAdded(): boolean {
        if (this.settling.size === 0)
            return false;

        for (const placement of this.document.nodes) {
            if (!this.settling.has(placement.id))
                continue;

            const place = this.services.snapPlace(placement.id, placement);

            placement.x = place.x;
            placement.y = place.y;
        }

        this.settling.clear();

        return true;
    }

    /** Lays out what is pending once the canvas is shown; one watch at a time, let go as soon as it has done its work. */
    private waitForSize(): void {
        if (this.waiting !== null)
            return;

        this.waiting = this.services.context.observeSize(this.services.root, () => {
            if (this.services.root.offsetWidth === 0)
                return;

            this.dispose();
            this.placePending();
        });
    }

    /** Lets go of the watch for a size, laid out or not; the canvas's root has left the page. */
    public dispose(): void {
        this.waiting?.();
        this.waiting = null;
    }

    /** Runs the layered layout, snapped to the grid; a long edge's via-points move with its source's snap so it sets out level — remembered positions tell laid-out nodes from hand-placed ones. */
    private layout(sizes: readonly { id: string; width: number; height: number }[]): ReturnType<typeof layered> {
        let widest = 0;

        // A loop rather than a spread: thousands of nodes pass more arguments than a call may take.
        if (this.host.nodeBox !== undefined) {
            for (const size of sizes)
                widest = Math.max(widest, this.services.nodeExtent(size.id)?.width ?? 0);
        }

        const boxes = sizes.map(size => ({ id: size.id, ...this.box(size.id, size.width, size.height, widest) }));
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
    private box(id: string, width: number, height: number, widest: number): { width: number; height: number; anchor?: Point } {
        return this.host.nodeBox === undefined ? { width, height } : this.host.nodeBox(id, width, height, widest);
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
    public ends(link: LayeredEdge): Pick<EdgeEnds, "from" | "to" | "axis" | "back" | "loop" | "via" | "reversed" | "turns"> | null {
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

    /** A link's ends, each moved along its side to the point that side sets it at. */
    private endsOf(link: LayeredEdge): Pick<EdgeEnds, "from" | "to" | "axis" | "back" | "loop" | "via" | "reversed"> | null {
        const ends = this.middleEndsOf(link);

        if (ends === null || ends.back === true || this.host.spreadsEnds === undefined)
            return ends;

        this.shifts ??= this.assignShifts();

        const shift = this.shifts.get(link.id);

        if (shift === undefined)
            return ends;

        const move = (point: Point, by: number): Point => (ends.axis === "vertical" ? { x: point.x + by, y: point.y } : { x: point.x, y: point.y + by });

        return { ...ends, from: move(ends.from, shift.from), to: move(ends.to, shift.to) };
    }

    /**
     * Spreads the edges on one side of a card in the order their other ends lie, so none overlaps another; a lone edge, or every
     * edge of a node that doesn't spread its ends, stays at the middle.
     */
    private assignShifts(): Map<string, EndShift> {
        const shifts = new Map<string, EndShift>();
        const leaving = new Map<string, SideEnd[]>();
        const entering = new Map<string, SideEnd[]>();

        for (const link of this.host.links()) {
            const ends = this.middleEndsOf(link);

            if (ends === null || ends.back === true || link.from === link.to)
                continue;

            // Where the edge heads once it has left, and where it comes from as it arrives: the first and last of its stops.
            const via = ends.via ?? [];
            const across = (point: Point): number => (ends.axis === "vertical" ? point.x : point.y);
            const level = [ends.to, ...via].every(point => Math.abs(across(point) - across(ends.from)) < 0.5);

            shifts.set(link.id, { from: 0, to: 0 });
            leaving.set(link.from, [...leaving.get(link.from) ?? [], { id: link.id, across: across(via[0] ?? ends.to), level }]);
            entering.set(link.to, [...entering.get(link.to) ?? [], { id: link.id, across: across(via.at(-1) ?? ends.from), level }]);
        }

        this.spread(leaving, shifts, "from");
        this.spread(entering, shifts, "to");

        return shifts;
    }

    private spread(sides: ReadonlyMap<string, SideEnd[]>, shifts: Map<string, EndShift>, end: "from" | "to"): void {
        const down = this.direction === "down" || this.direction === "up";

        for (const [id, side] of sides) {
            const rect = side.length > 1 && this.host.spreadsEnds!(id) ? this.services.nodeRect(id) : null;

            if (rect === null)
                continue;

            const sorted = [...side].sort((left, right) => left.across - right.across);
            // An edge that runs level between two nodes set in line keeps the middle of both its sides, so it stays one straight line;
            // the others fan out either side of it in their order. With none level, the side's edges stand evenly about its middle.
            const straight = sorted.findIndex(sideEnd => sideEnd.level);
            const middle = straight >= 0 ? straight : (sorted.length - 1) / 2;
            const reach = Math.max(middle, sorted.length - 1 - middle);
            const step = Math.min(EndGap, ((down ? rect.width : rect.height) * EndShare) / (2 * reach));

            sorted.forEach((sideEnd, index) => {
                shifts.get(sideEnd.id)![end] = (index - middle) * step;
            });
        }
    }

    /** A link's ends at the middles of the sides it leaves and enters. */
    private middleEndsOf(link: LayeredEdge): Pick<EdgeEnds, "from" | "to" | "axis" | "back" | "loop" | "via" | "reversed"> | null {
        const from = this.services.nodeRect(link.from);
        const to = this.services.nodeRect(link.to);

        if (from === null || to === null)
            return null;

        const direction = this.direction;
        const back = this.backEdges.has(link.id);
        const self = link.from === link.to;
        const feet = this.host.footRoom === undefined ? NoFeet : { from: this.host.footRoom(link.from), to: this.host.footRoom(link.to) };
        const { start, end } = edgeSides(from, to, direction, back, self, feet);

        return { from: start, to: end, axis: direction === "down" || direction === "up" ? "vertical" : "horizontal", back, loop: back && self, via: this.routeOf(link), reversed: direction === "left" || direction === "up" };
    }

    /** The route the last layout gave a long edge, while both its ends still stand where that layout put them. */
    private routeOf(link: LayeredEdge): readonly Point[] | undefined {
        const route = this.routes.get(link.id);

        return route !== undefined && this.standsWhereLaid(link.from) && this.standsWhereLaid(link.to) ? route : undefined;
    }

    private standsWhereLaid(id: string): boolean {
        const laid = this.laidAt.get(id);
        const placement = laid === undefined ? undefined : this.placementOf(id);

        return laid !== undefined && placement !== undefined && Math.abs(laid.x - placement.x) < 0.5 && Math.abs(laid.y - placement.y) < 0.5;
    }

    /** A node's placement in the document, read off a map made again whenever the document is another or its list changed. */
    private placementOf(id: string): CanvasItem | undefined {
        const nodes = this.document.nodes;

        if (this.placements === null || this.placements.nodes !== nodes)
            this.placements = { nodes, byId: new Map(nodes.map(node => [node.id, node])) };

        return this.placements.byId.get(id);
    }
}

/** Where an edge leaves its source and enters its target, given the two boxes, the way the layers run and what each wears under it. */
export function edgeSides(from: Rect, to: Rect, direction: LayeredDirection, back: boolean, self: boolean, feet: EdgeFeet = NoFeet): { start: Point; end: Point } {
    const down = direction === "down" || direction === "up";
    // The layers run back the other way: an edge then leaves by the side that faces the next layer there, which is the other one.
    const turned = direction === "left" || direction === "up";
    const fromBottom = from.y + from.height + feet.from;
    const toBottom = to.y + to.height + feet.to;

    if (!back) {
        return {
            start: down
                ? { x: from.x + from.width / 2, y: turned ? from.y : fromBottom }
                : { x: turned ? from.x : from.x + from.width, y: from.y + from.height / 2 },
            end: down
                ? { x: to.x + to.width / 2, y: turned ? toBottom : to.y }
                : { x: turned ? to.x + to.width : to.x, y: to.y + to.height / 2 }
        };
    }

    // High on the sides, not on the tops: a node's top carries what it wears there (a production node's chip), which hid an arc's
    // ends and arrow. A back edge leaves by its source's side facing the earlier layers and enters its target's side facing the later
    // ones, so its arc spans the gap between them, beside the forward edge; a node's link to itself leaves by the side facing the next
    // layer and comes back by the other, rising over the node.
    const leaving = self ? !turned : turned;
    const entering = self ? turned : !turned;

    return {
        start: down
            ? { x: from.x + from.width * SideHigh, y: leaving ? fromBottom : from.y }
            : { x: leaving ? from.x + from.width : from.x, y: from.y + from.height * SideHigh },
        end: down
            ? { x: to.x + to.width * SideHigh, y: entering ? toBottom : to.y }
            : { x: entering ? to.x + to.width : to.x, y: to.y + to.height * SideHigh }
    };
}
