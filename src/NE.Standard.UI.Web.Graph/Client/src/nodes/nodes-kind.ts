// The node canvas as a kind of canvas: typed nodes and pins, edges between them, and what a run paints over them. Concerns:
// `NodesWiring`, `NodesLog`, `NodesPickerBinding` and `NodesImageUpload` handle wiring, run status/log, the picker and picture uploads.

import type { CanvasKind, CanvasKindDefinition, CanvasServices, EdgeEnds, KindDrag, MenuTarget } from "../canvas/canvas-kind.ts";
import { snapBoxes } from "../canvas/canvas-drag.ts";
import { enableMenuEntries, showMenuEntries } from "../canvas/canvas-menus.ts";
import type { CanvasEdge, CanvasItem, Point } from "../canvas/canvas-model.ts";
import { newId, readJson } from "../canvas/canvas-model.ts";
import { snap } from "../canvas/geometry.ts";
import { assignLanes } from "../canvas/lanes.ts";
import { arrange } from "./layout.ts";
import type { DocumentEdge, DocumentNode, GraphDocument, NodeType, Pin } from "./model.ts";
import { AnyType, createNode, duplicate, edgeInto, findPin, readDocument, resolveOutputType, slice } from "./model.ts";
import { LogNodeAttribute, NodesLog } from "./nodes-log.ts";
import { NodesPickerBinding } from "./nodes-picker-binding.ts";
import { NodesRunPanel } from "./nodes-run-panel.ts";
import { NodesImageUpload } from "./nodes-upload.ts";
import { NodesWiring } from "./nodes-wiring.ts";
import { HeadAttribute, PinAttribute, PinDirectionAttribute, renderNode, ValueAttribute } from "./node-view.ts";

// A node's editor — the framework's own component, its open list among it — whose pointer, wheel and keys are its own.
const EditorSelector = ".ui-graph__editor";
// The panels a node canvas stands over its sheet: the log, the run line and the run panel.
const PanelSelector = "[data-ui-graph-log], [data-ui-graph-run], .ui-graph__run-panel";
const CatalogAttribute = "data-ui-graph-catalog";
// The kind every catalogue carries (`RerouteNode` on the server), which a wire's menu puts on the wire.
const RerouteKey = "graph.reroute";
// Half a reroute's box at its least, so the one a menu puts down is centred on where the menu was opened.
const RerouteHalfWidth = 30;
const RerouteHalfHeight = 12;

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
    private readonly runPanel: NodesRunPanel;

    private clipboard: { nodes: DocumentNode[]; edges: DocumentEdge[] } | null = null;

    public constructor(services: CanvasServices<GraphDocument>) {
        const catalog = readCatalog(services.root.getAttribute(CatalogAttribute));

        this.services = services;
        this.seriesColors = readSeriesColorCount(services.root);

        for (const type of catalog)
            this.types.set(type.key, type);

        this.pickerBinding = new NodesPickerBinding(services, catalog);
        this.wiring = new NodesWiring(services, {
            pinPoint: (nodeId, pinName, direction) => this.pinPoint(nodeId, pinName, direction),
            pinColor: type => this.pinColor(type),
            dropOnNothing: wire => this.pickerBinding.openFor(wire)
        }, this.types);
        this.log = new NodesLog(services, this.types);
        this.upload = new NodesImageUpload(services);
        this.runPanel = new NodesRunPanel(services);

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
            feedTitle: (nodeId, pinName) => this.feedTitle(nodeId, pinName, new Set()),
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

    /** The caption of the output that feeds an input, looking through reroutes to the output the wire first left. */
    private feedTitle(nodeId: string, pinName: string, seen: Set<string>): string | null {
        const edge = edgeInto(this.document, nodeId, pinName);

        if (edge === undefined || seen.has(edge.fromNode))
            return null;

        seen.add(nodeId);

        const from = this.document.nodes.find(candidate => candidate.id === edge.fromNode);
        const type = from === undefined ? undefined : this.types.get(from.type);
        const through = type?.compact === true ? type.inputs[0] : undefined;

        return through !== undefined ? this.feedTitle(edge.fromNode, through.name, seen) : findPin(type, edge.fromPin, true)?.title ?? null;
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

    /**
     * The value effect: one pin's value, from the server — an edit like any other, undone and saved like one, unless the server
     * already holds it (a node's state as a run left it), when it is no edit at all.
     */
    public setPinValue(nodeId: string, pinName: string, value: unknown, committed: boolean): void {
        const write = (document: GraphDocument): void => {
            const node = document.nodes.find(candidate => candidate.id === nodeId);

            if (node !== undefined)
                node.values[pinName] = value;
        };

        if (!this.document.nodes.some(candidate => candidate.id === nodeId))
            return;

        if (committed) {
            // In place when the pin's own field shows it and nothing hangs on it: a run writes state after every run of a Run all.
            const inPlace = this.showCommitted(nodeId, pinName, value);

            this.services.documentState.committed(document => write(document), !inPlace);
            return;
        }

        write(this.document);
        this.services.documentState.edited();
    }

    /** Writes a committed value into the field already drawn for it; false when there is none, or another pin's showing hangs on it. */
    private showCommitted(nodeId: string, pinName: string, value: unknown): boolean {
        const node = this.document.nodes.find(candidate => candidate.id === nodeId);
        const type = node === undefined ? undefined : this.types.get(node.type);
        const field = this.services.nodeElements.get(nodeId)?.querySelector<HTMLElement>(`[${ValueAttribute}="${CSS.escape(pinName)}"] > *`);

        if (type === undefined || field === null || field === undefined || type.inputs.some(pin => pin.visibleWhen === pinName))
            return false;

        this.services.context.properties.set(field, "Value", value ?? type.inputs.find(pin => pin.name === pinName)?.defaultValue ?? null);

        return true;
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

    /**
     * The running effect: a run of the sheet has begun or ended. Begun, the save it was asked with has landed — the server runs what
     * it took — though the command answers only at the run's end, so the canvas counts it saved now and its other saves go on.
     */
    public setRunning(running: boolean): void {
        if (running)
            this.services.documentState.settle();

        this.runPanel.setRunning(running);
        this.log.setRunning(running);
    }

    public saveCompleted(_success: boolean, reason: string): void {
        this.runPanel.saveCompleted(reason);
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

        // The pasted copy becomes the clipboard, so pasting again steps further rather than landing on the same spot — a copy of it,
        // not the nodes now on the sheet, or an edit to them would ride along into the next paste.
        this.clipboard = slice(this.document, new Set(copy.nodes.map(node => node.id)));

        return copy.nodes.map(node => node.id);
    }

    public remove(itemIds: ReadonlySet<string>, edgeIds: ReadonlySet<string>): void {
        const document = this.document;

        document.nodes = document.nodes.filter(node => !itemIds.has(node.id));
        document.edges = document.edges.filter(edge => !edgeIds.has(edge.id) && !itemIds.has(edge.fromNode) && !itemIds.has(edge.toNode));
    }

    public arrange(sizes: ReadonlyMap<string, { width: number; height: number }>, only: ReadonlySet<string> | undefined): Map<string, Point> {
        const settings = this.services.settings;

        return arrange(this.document, { sizes, only, pinOffset: (nodeId, pinName, direction) => this.pinOffset(nodeId, pinName, direction), gridSize: settings.snapping ? settings.gridSize : 0 });
    }

    /** How far below its node's top a pin's middle stands, in canvas units, off the page as the node is drawn now — folded, its pins sit on its head. */
    private pinOffset(nodeId: string, pinName: string, direction: "in" | "out"): number | null {
        const element = this.services.nodeElements.get(nodeId);
        const pin = this.pinPoint(nodeId, pinName, direction);

        // Whole pixels: read back through the zoom, the offset carries float dust, which would land in the document as a place.
        return element === undefined || pin === null ? null : Math.round(pin.y - (this.services.centerOf(element).y - element.offsetHeight / 2));
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
        return true;
    }

    public runCommand(key: string, target: MenuTarget | null): boolean {
        switch (key) {
            case "graph:add-node":
                this.pickerBinding.open();
                return true;

            case "graph:add-reroute":
                if (target === null || target.kind === "edge")
                    this.addReroute(target?.id ?? null);

                return true;

            case "graph:reset-state":
                if (target?.kind === "node")
                    this.resetState(target.id);

                return true;

            case "graph:delete-edge":
                if (target?.kind === "edge" && !this.services.settings.readOnly) {
                    this.document.edges = this.document.edges.filter(edge => edge.id !== target.id);
                    this.services.documentState.edited();
                }

                return true;

            default:
                return false;
        }
    }

    /** A reroute where the menu was opened: on an edge, taking the edge through it; on the empty sheet, standing unwired. */
    private addReroute(edgeId: string | null): void {
        const edge = edgeId === null ? null : this.document.edges.find(candidate => candidate.id === edgeId);
        const type = this.types.get(RerouteKey);
        const input = type?.inputs[0];
        const output = type?.outputs[0];

        if (this.services.settings.readOnly || edge === undefined || type === undefined || input === undefined || output === undefined)
            return;

        const settings = this.services.settings;
        const at = this.services.pointerScene();
        const node = createNode(type, snap(at.x - RerouteHalfWidth, settings.gridSize, settings.snapping), snap(at.y - RerouteHalfHeight, settings.gridSize, settings.snapping));

        this.document.nodes.push(node);

        if (edge !== null) {
            this.document.edges = [
                ...this.document.edges.filter(candidate => candidate.id !== edge.id),
                { id: newId("e"), fromNode: edge.fromNode, fromPin: edge.fromPin, toNode: node.id, toPin: input.name, points: [] },
                { id: newId("e"), fromNode: node.id, fromPin: output.name, toNode: edge.toNode, toPin: edge.toPin, points: [] }
            ];
        }

        this.services.selection.selectOnly(node.id);
        this.services.documentState.edited();
    }

    public syncMenus(editable: boolean, target: MenuTarget | null): void {
        for (const key of ["graph:add-node", "graph:add-reroute", "graph:delete-edge", "graph:reset-state"])
            enableMenuEntries(this.services.root, key, editable);

        // Reset stands only in the menu of a node whose kind keeps a state.
        showMenuEntries(this.services.root, "graph:reset-state", target?.kind === "node" && this.statePins(target.id).length > 0);
    }

    /** Every state value of the node back to its kind's default, as one edit of the viewer's. */
    private resetState(nodeId: string): void {
        const node = this.document.nodes.find(candidate => candidate.id === nodeId);
        const pins = this.statePins(nodeId);

        if (this.services.settings.readOnly || node === undefined || pins.length === 0)
            return;

        for (const pin of pins)
            node.values[pin.name] = pin.defaultValue ?? null;

        this.services.documentState.edited();
    }

    private statePins(nodeId: string): Pin[] {
        const node = this.document.nodes.find(candidate => candidate.id === nodeId);

        return node === undefined ? [] : (this.types.get(node.type)?.inputs.filter(pin => pin.state === true) ?? []);
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
