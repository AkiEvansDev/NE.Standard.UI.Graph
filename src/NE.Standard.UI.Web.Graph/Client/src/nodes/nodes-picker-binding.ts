// The canvas's side of its node picker (the dialog is `canvas/picker.ts`'s): opens it and drops the chosen kind as a node where the
// pointer last stood — or where a pulled wire was let go, wired to the new node's first input that takes it.

import type { CanvasServices } from "../canvas/canvas-kind.ts";
import { newId } from "../canvas/canvas-model.ts";
import type { Point } from "../canvas/canvas-model.ts";
import { Picker } from "../canvas/picker.ts";
import { snap } from "../canvas/geometry.ts";
import { canConnect, createNode, isPinVisible } from "./model.ts";
import type { DocumentNode, GraphDocument, NodeType } from "./model.ts";

/** A wire let go on the empty sheet: the output it comes from, the type it carries, and where it was dropped. */
export type LooseWire = { readonly fromNode: string; readonly fromPin: string; readonly fromType: string; readonly at: Point };

export class NodesPickerBinding {
    private readonly services: CanvasServices<GraphDocument>;
    private readonly picker: Picker<NodeType> | null;

    // The wire the picker was opened for; the next plain opening forgets it.
    private loose: LooseWire | null = null;

    public constructor(services: CanvasServices<GraphDocument>, catalog: readonly NodeType[]) {
        const context = services.context;

        this.services = services;
        // The picker offers what the picker may offer: a hidden kind is still drawn and run, it is just no longer added by hand.
        const offered = catalog.filter(type => type.hidden !== true);

        this.picker = Picker.create(services.root, () => offered, context.strings, context.dom, context.icons, context.roving, context.focus, type => this.addNode(type));
    }

    public open(): void {
        this.loose = null;
        this.picker?.open();
    }

    /** The picker for a wire let go on nothing: the kind chosen stands where it was dropped and takes the wire if it can. */
    public openFor(wire: LooseWire): void {
        this.picker?.open();
        this.loose = wire;
    }

    public close(): void {
        this.picker?.close();
    }

    private addNode(type: NodeType): void {
        const settings = this.services.settings;
        const wire = this.loose;

        this.loose = null;

        if (settings.readOnly)
            return;

        const at = wire?.at ?? this.services.pointerScene();
        const node = createNode(type, snap(at.x, settings.gridSize, settings.snapping), snap(at.y, settings.gridSize, settings.snapping));
        const document = this.services.documentState.document;

        document.nodes.push(node);

        if (wire !== null && document.nodes.some(candidate => candidate.id === wire.fromNode))
            this.wire(document, wire, node, type);

        this.services.selection.selectOnly(node.id);
        this.services.documentState.edited();
    }

    /** The wire into the first input of the new node that takes its type and draws a pin; a kind with none stands unwired. */
    private wire(document: GraphDocument, wire: LooseWire, node: DocumentNode, type: NodeType): void {
        const input = type.inputs.find(pin => pin.hasPin !== false && isPinVisible(pin, node, type) && canConnect(wire.fromType, pin.type));

        if (input !== undefined)
            document.edges.push({ id: newId("e"), fromNode: wire.fromNode, fromPin: wire.fromPin, toNode: node.id, toPin: input.name, points: [] });
    }
}
