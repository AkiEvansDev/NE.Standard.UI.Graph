// The node canvas as a kind of canvas: typed nodes and pins, edges between them, and what a run paints over them. Concerns:
// `NodesWiring`, `NodesLog`, `NodesPickerBinding` and `NodesImageUpload` handle wiring, run status/log, the picker and picture uploads.

import type { CanvasKind, CanvasKindDefinition, CanvasServices, EdgeEnds, KindDrag } from "../canvas/canvas-kind.ts";
import { snapBoxes } from "../canvas/canvas-drag.ts";
import { enableMenuEntries } from "../canvas/canvas-menus.ts";
import type { CanvasEdge, CanvasItem, Point } from "../canvas/canvas-model.ts";
import { assignLanes } from "../canvas/lanes.ts";
import { readJson } from "../canvas/canvas-model.ts";
import { arrange } from "./layout.ts";
import type { DocumentEdge, DocumentNode, GraphDocument, NodeType } from "./model.ts";
import { AnyType, duplicate, edgeInto, readDocument, resolveOutputType, slice } from "./model.ts";
import { LogNodeAttribute, NodesLog } from "./nodes-log.ts";
import { NodesPickerBinding } from "./nodes-picker-binding.ts";
import { NodesImageUpload } from "./nodes-upload.ts";
import { NodesWiring } from "./nodes-wiring.ts";
import { HeadAttribute, PinAttribute, PinDirectionAttribute, renderNode } from "./node-view.ts";

// A node's editor — the framework's own component, its open list among it — whose pointer, wheel and keys are its own.
const EditorSelector = ".ui-graph__editor";
// The panels a node canvas stands over its sheet: the log and the run line.
const PanelSelector = "[data-ui-graph-log], [data-ui-graph-run]";
const CatalogAttribute = "data-ui-graph-catalog";

export const NodesKindDefinition: CanvasKindDefinition<GraphDocument> = {
    name: "nodes",
    readDocument,
    create: services => new NodesKind(services)
};

export class NodesKind implements CanvasKind {
    private readonly services: CanvasServices<GraphDocument>;
    private readonly types = new Map<string, NodeType>();
    private readonly seriesColors: number;
    private readonly wiring: NodesWiring;
    // Where every wire ends and turns, by its id; read with the first wire of a draw and let go with the next draw.
    private wires: Map<string, EdgeEnds> | null = null;
    private readonly log: NodesLog;
    private readonly pickerBinding: NodesPickerBinding;
    private readonly upload: NodesImageUpload;

    private clipboard: { nodes: DocumentNode[]; edges: DocumentEdge[] } | null = null;

    public constructor(services: CanvasServices<GraphDocument>) {
        const catalog = readCatalog(services.root.getAttribute(CatalogAttribute));

        this.services = services;
        this.seriesColors = readSeriesColorCount(services.root);

        for (const type of catalog)
            this.types.set(type.key, type);

        this.wiring = new NodesWiring(services, { pinPoint: (nodeId, pinName, direction) => this.pinPoint(nodeId, pinName, direction), pinColor: type => this.pinColor(type) }, this.types);
        this.log = new NodesLog(services, this.types);
        this.pickerBinding = new NodesPickerBinding(services, catalog);
        this.upload = new NodesImageUpload(services);

        this.log.setLogOpen(services.context.store.read(services.root, "log") === "open");
        this.log.drawRun();
    }

    private get document(): GraphDocument {
        return this.services.documentState.document;
    }

    // --- the sheet -------------------------------------------------------------------------------------------------------------

    public items(): readonly CanvasItem[] {
        return this.document.nodes;
    }

    public edges(): readonly CanvasEdge[] {
        // The wires are about to be drawn again, over nodes that may have moved: where they end and turn is read afresh.
        this.wires = null;

        return this.document.edges;
    }

    public renderItem(item: CanvasItem): HTMLElement {
        const node = item as DocumentNode;
        const context = this.services.context;

        return renderNode(node, this.types.get(node.type), {
            words: context.strings,
            icons: context.icons,
            readOnly: this.services.settings.readOnly,
            pinColor: type => this.pinColor(type),
            outputType: (nodeId, pinName) => resolveOutputType(this.document, this.types, nodeId, pinName),
            isConnected: (nodeId, pinName, direction) => direction === "in"
                ? edgeInto(this.document, nodeId, pinName) !== undefined
                : this.document.edges.some(edge => edge.fromNode === nodeId && edge.fromPin === pinName),
            onValueChanged: (nodeId, pinName, value) => this.setValue(nodeId, pinName, value),
            onPickImage: (nodeId, pinName) => this.upload.pickImage(nodeId, pinName),
            onImageUploaded: (nodeId, pinName, selectionId, fileName) => this.upload.announce(nodeId, pinName, selectionId, fileName),
            tooltips: context.tooltips,
            number: (value, format) => this.log.formatNumber(value, format),
            cloneEditor: region => this.cloneEditor(region),
            setProperty: (component, propertyName, value) => context.properties.set(component, propertyName, value),
            readValue: component => context.values.read(component)
        });
    }

    /** A fresh copy of a framework component the canvas carries a template of: a node's editor, drawn anew with the node. */
    private cloneEditor(region: string): HTMLElement | null {
        const template = this.services.root.querySelector<HTMLTemplateElement>(`template[data-ui-graph-editor="${CSS.escape(region)}"]`);
        const copy = template?.content.firstElementChild?.cloneNode(true);

        return copy instanceof HTMLElement ? copy : null;
    }

    public itemsDrawn(drawn: ReadonlySet<string>): void {
        this.log.reapplyToRedrawnNodes(drawn);

        // A node's far corner lands on the grid as its near one does, whatever gave it its size — its contents, the kind's least
        // width, a folded head.
        if (this.services.settings.snapping)
            snapBoxes(this.services.nodeElements.values(), this.services.settings.gridSize);
    }

    public itemColor(item: CanvasItem): string {
        return item.color ?? this.types.get((item as DocumentNode).type)?.color ?? "";
    }

    public edgeEnds(edge: CanvasEdge): EdgeEnds | null {
        this.wires ??= this.readWires();

        return this.wires.get(edge.id) ?? null;
    }

    /** Every wire's two pins, read off the page once per draw, plus each stepped wire's lane (`canvas/lanes.ts`) so wires between two columns don't all turn on one line. */
    private readWires(): Map<string, EdgeEnds> {
        const wires = new Map<string, EdgeEnds>();

        for (const wire of this.document.edges) {
            const from = this.pinPoint(wire.fromNode, wire.fromPin, "out");
            const to = this.pinPoint(wire.toNode, wire.toPin, "in");

            if (from !== null && to !== null)
                wires.set(wire.id, { from, to });
        }

        if (this.services.settings.edgeShape !== "orthogonal")
            return wires;

        const lanes = assignLanes(this.document.edges.flatMap(wire => {
            const ends = wires.get(wire.id);

            return ends === undefined ? [] : [{
                id: wire.id,
                from: { along: ends.from.x, across: ends.from.y },
                to: { along: ends.to.x, across: ends.to.y },
                source: `${wire.fromNode}:${wire.fromPin}`,
                target: `${wire.toNode}:${wire.toPin}`
            }];
        }));

        for (const [id, lane] of lanes)
            wires.set(id, { ...wires.get(id)!, turns: [lane] });

        return wires;
    }

    /** Every wire that leaves or enters one node, whichever of its pins it hangs on, and the nodes at their other ends. */
    public related(itemId: string): { edges: readonly string[]; items: readonly string[] } {
        const wires = this.document.edges.filter(edge => edge.fromNode === itemId || edge.toNode === itemId);

        return { edges: wires.map(edge => edge.id), items: [itemId, ...wires.map(edge => (edge.fromNode === itemId ? edge.toNode : edge.fromNode))] };
    }

    public edgeColor(edge: CanvasEdge): string {
        const wire = edge as DocumentEdge;

        return this.pinColor(resolveOutputType(this.document, this.types, wire.fromNode, wire.fromPin));
    }

    /** Where a pin sits in canvas coordinates: measured off the page, since a node's height is what its editors make it. */
    private pinPoint(nodeId: string, pinName: string, direction: "in" | "out"): Point | null {
        const pin = this.services.nodeElements.get(nodeId)?.querySelector<HTMLElement>(`[${PinAttribute}="${CSS.escape(pinName)}"][${PinDirectionAttribute}="${direction}"]`);

        return pin === null || pin === undefined ? null : this.services.centerOf(pin);
    }

    /** The colour a pin type wears: a theme series picked by the type's name, cycled the way `ThemeColorRenderer.SeriesColorCss` cycles it server-side; the universal pin wears neutral instead. */
    private pinColor(type: string): string {
        if (type === AnyType)
            return "var(--ui-text-muted)";

        const known: Record<string, number> = { image: 1, array: 2, number: 3, boolean: 4, text: 5, date: 8, time: 8, datetime: 8 };
        const index = ((known[type] ?? hash(type) + 1) - 1) % this.seriesColors + 1;

        return `var(--ui-color-series-${index})`;
    }

    // --- values ------------------------------------------------------------------------------------------------------------------

    /** One value on a node, from an editor the viewer typed into: a pin shown beside this one redraws only when it may have changed. */
    private setValue(nodeId: string, pinName: string, value: unknown): void {
        const node = this.document.nodes.find(candidate => candidate.id === nodeId);

        if (node === undefined)
            return;

        node.values[pinName] = value;
        this.services.documentState.edited(this.types.get(node.type)?.inputs.some(pin => pin.visibleWhen === pinName) === true);
    }

    /** The value effect: one pin's saved value, from the server — an edit like any other, so it is undone and saved like one. */
    public setPinValue(nodeId: string, pinName: string, value: unknown): void {
        const node = this.document.nodes.find(candidate => candidate.id === nodeId);

        if (node === undefined)
            return;

        node.values[pinName] = value;
        this.services.documentState.edited();
    }

    // --- the run's channel -------------------------------------------------------------------------------------------------------

    /** The status effect: a node's state, progress and message. */
    public setStatus(nodeId: string, state: string, progress: number | null, message: string | null): void {
        this.log.setStatus(nodeId, state, progress, message);
    }

    /** The display effect: what one display pin shows, drawn by the shape the value turns out to have. */
    public setDisplay(nodeId: string, pinName: string, value: unknown): void {
        this.log.setDisplay(nodeId, pinName, value);
    }

    /** The log effect: one line from one node, appended to the canvas's log. */
    public addLog(nodeId: string, level: string, message: string): void {
        this.log.addLog(nodeId, level, message);
    }

    /** The run effect: how many of a run's nodes are through, of how many. */
    public setRunProgress(completed: number, total: number): void {
        this.log.setRunProgress(completed, total);
    }

    // --- presses -------------------------------------------------------------------------------------------------------------------

    public isEditor(target: Element): boolean {
        // The head's own parts are the node's, not an editor's: a press there drags the node.
        return target.closest(EditorSelector) !== null && target.closest(`[${HeadAttribute}]`) === null;
    }

    public isPanel(target: Element): boolean {
        return target.closest(PanelSelector) !== null;
    }

    public pointerDown(_event: PointerEvent, target: Element): KindDrag | boolean {
        const pin = target.closest<HTMLElement>(`[${PinAttribute}]`);

        if (pin === null || this.services.settings.readOnly)
            return false;

        // A press on a pin is the pin's even when it pulls nothing — an input nothing feeds — rather than a drag of its node.
        return this.wiring.beginConnect(pin) ?? true;
    }

    public chrome(target: Element): boolean {
        if (target.closest("[data-ui-graph-log-toggle]") !== null) {
            this.log.setLogOpen(!this.log.isLogOpen(), true);
            return true;
        }

        if (target.closest("[data-ui-graph-log-clear]") !== null) {
            this.log.clearLog();
            return true;
        }

        const logged = target.closest<HTMLElement>(`[${LogNodeAttribute}]`);

        if (logged !== null) {
            this.log.goToNode(logged.getAttribute(LogNodeAttribute)!);
            return true;
        }

        return false;
    }

    public backgroundDoubleClick(): void {
        this.pickerBinding.open();
    }

    public escape(): void {
        this.pickerBinding.close();
    }

    // --- editing -------------------------------------------------------------------------------------------------------------------

    public copy(ids: ReadonlySet<string>): void {
        this.clipboard = slice(this.document, ids);
    }

    public paste(): readonly string[] | null {
        if (this.clipboard === null)
            return null;

        const step = this.services.settings.gridSize * 2;
        const copy = duplicate(this.clipboard, step, step);

        this.document.nodes.push(...copy.nodes);
        this.document.edges.push(...copy.edges);

        // The pasted copy becomes the clipboard, so pasting again steps further rather than landing on the same spot.
        this.clipboard = copy;

        return copy.nodes.map(node => node.id);
    }

    public remove(itemIds: ReadonlySet<string>, edgeIds: ReadonlySet<string>): void {
        const document = this.document;

        document.nodes = document.nodes.filter(node => !itemIds.has(node.id));
        document.edges = document.edges.filter(edge => !edgeIds.has(edge.id) && !itemIds.has(edge.fromNode) && !itemIds.has(edge.toNode));
    }

    public arrange(sizes: ReadonlyMap<string, { width: number; height: number }>, only: ReadonlySet<string> | undefined): Map<string, Point> {
        return arrange(this.document, { sizes, only });
    }

    public canEditItems(): boolean {
        return true;
    }

    public renameItem(): boolean {
        return false;
    }

    public paintItem(): boolean {
        return false;
    }

    public hasEdgeMenu(): boolean {
        return false;
    }

    public runCommand(key: string): boolean {
        if (key !== "graph:add-node")
            return false;

        this.pickerBinding.open();
        return true;
    }

    public syncMenus(editable: boolean): void {
        enableMenuEntries(this.services.root, "graph:add-node", editable);
    }
}

function readCatalog(value: string | null): NodeType[] {
    const read = readJson(value);

    return Array.isArray(read) ? (read as NodeType[]) : [];
}

/** How many series colours the theme has, off the root; the theme writes it beside the colours, and eight is the palette's own count. */
function readSeriesColorCount(root: Element): number {
    const value = Number(getComputedStyle(root).getPropertyValue("--ui-color-series-count"));

    return Number.isFinite(value) && value >= 1 ? Math.floor(value) : 8;
}

function hash(value: string): number {
    let result = 0;

    for (let index = 0; index < value.length; index++)
        result = (result * 31 + value.charCodeAt(index)) >>> 0;

    return result;
}
