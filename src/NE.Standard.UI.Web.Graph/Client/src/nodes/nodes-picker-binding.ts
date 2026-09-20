// The wiring between the canvas and its node picker: owns and opens the dialog, and drops the chosen kind as a node
// wherever the pointer last stood; the native `<dialog>` itself is `canvas/picker.ts`'s own.

import type { CanvasServices } from "../canvas/canvas-kind.ts";
import { Picker } from "../canvas/picker.ts";
import { snap } from "../canvas/geometry.ts";
import { createNode } from "./model.ts";
import type { GraphDocument, NodeType } from "./model.ts";

export class NodesPickerBinding {
    private readonly services: CanvasServices<GraphDocument>;
    private readonly picker: Picker<NodeType> | null;

    public constructor(services: CanvasServices<GraphDocument>, catalog: readonly NodeType[]) {
        const context = services.context;

        this.services = services;
        // The picker offers what the picker may offer: a hidden kind is still drawn and run, it is just no longer added by hand.
        const offered = catalog.filter(type => type.hidden !== true);

        this.picker = Picker.create(services.root, () => offered, context.strings, context.dom, context.icons, context.roving, type => this.addNode(type));
    }

    public open(): void {
        this.picker?.open();
    }

    public close(): void {
        this.picker?.close();
    }

    private addNode(type: NodeType): void {
        const settings = this.services.settings;

        if (settings.readOnly)
            return;

        const pointer = this.services.pointerScene();
        const node = createNode(type, snap(pointer.x, settings.gridSize, settings.snapping), snap(pointer.y, settings.gridSize, settings.snapping));

        this.services.documentState.document.nodes.push(node);
        this.services.selection.selectOnly(node.id);
        this.services.documentState.edited();
    }
}
