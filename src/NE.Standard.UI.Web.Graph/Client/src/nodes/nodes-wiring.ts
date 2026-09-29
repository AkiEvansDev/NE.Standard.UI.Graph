// Pins joined and pulled apart: starting a connection, showing which pins would take it, and finishing it on a drop — on a pin,
// or on the empty sheet, where the host offers a node to take it. Edits the document only; the canvas redraws.

import { beginConnecting, endConnecting, markAimed } from "../canvas/aim.ts";
import type { CanvasServices, KindDrag } from "../canvas/canvas-kind.ts";
import { DropAttribute, NodeAttribute } from "../canvas/canvas-dom.ts";
import { newId } from "../canvas/canvas-model.ts";
import type { Point } from "../canvas/canvas-model.ts";
import { AnyType, canConnect, dropParameter, edgesInto, findPin, resolveOutputType } from "./model.ts";
import type { DocumentEdge, GraphDocument, NodeType, Pin } from "./model.ts";
import { PinAttribute, PinDirectionAttribute, PinTypeAttribute } from "./node-view.ts";
import type { LooseWire } from "./nodes-picker-binding.ts";

const RowSelector = ".ui-graph__row";
const AimClass = "ui-graph__pin--aimed";

/** What a connection being pulled carries: the output it comes from, its type, and the edge it was pulled off, if any. */
type Connection = { readonly fromNode: string; readonly fromPin: string; readonly fromType: string; readonly detached: DocumentEdge | null };

/** What the wiring reaches on the kind: a pin's place, the colour a type wears, and what becomes of a wire let go on nothing. */
export type WiringHost = {
    pinPoint(nodeId: string, pinName: string, direction: "in" | "out"): Point | null;
    pinColor(type: string): string;
    dropOnNothing(wire: LooseWire): void;
};

export class NodesWiring {
    private readonly services: CanvasServices<GraphDocument>;
    private readonly host: WiringHost;
    private readonly types: ReadonlyMap<string, NodeType>;

    // Where the pulled end last stood on the sheet: a drop on nothing is where the new node goes.
    private pulledTo: Point | null = null;

    public constructor(services: CanvasServices<GraphDocument>, host: WiringHost, types: ReadonlyMap<string, NodeType>) {
        this.services = services;
        this.host = host;
        this.types = types;
    }

    private get document(): GraphDocument {
        return this.services.documentState.document;
    }

    /** A press on a pin: a connection pulled out of an output, or an edge pulled off an input; nothing for an input nothing feeds. */
    public beginConnect(pin: HTMLElement): KindDrag | null {
        const connection = this.connectionFrom(pin);

        if (connection === null)
            return null;

        this.offerDropTargets(connection.fromNode, connection.fromType);
        this.pulledTo = null;

        return {
            kind: "kind",
            move: (scene, event) => this.trackConnect(connection, scene, event),
            finish: event => this.finishConnection(event, connection),
            cancel: () => this.cancelConnection(connection),
            end: () => this.clearDropTargets()
        };
    }

    private connectionFrom(pin: HTMLElement): Connection | null {
        const nodeId = pin.closest<HTMLElement>(`[${NodeAttribute}]`)?.getAttribute(NodeAttribute);

        if (nodeId === null || nodeId === undefined)
            return null;

        const name = pin.getAttribute(PinAttribute)!;
        const direction = pin.getAttribute(PinDirectionAttribute);

        if (direction === "out")
            return { fromNode: nodeId, fromPin: name, fromType: pin.getAttribute(PinTypeAttribute) ?? "any", detached: null };

        // Pulling a connected input detaches its edge and carries the far end, like a patch cable; a multi-input pin gives up the
        // last edge that reached it (the one drawn on top).
        const existing = edgesInto(this.document, nodeId, name).at(-1);

        if (existing === undefined)
            return null;

        this.document.edges = this.document.edges.filter(edge => edge.id !== existing.id);

        const connection: Connection = {
            fromNode: existing.fromNode,
            fromPin: existing.fromPin,
            fromType: resolveOutputType(this.document, this.types, existing.fromNode, existing.fromPin),
            detached: existing
        };

        this.services.draw();

        return connection;
    }

    /** Dims every pin (and its row) that wouldn't take the pulled connection, so the viewer aims at what's left rather than at whatever's under the pointer. */
    private offerDropTargets(fromNode: string, fromType: string): void {
        beginConnecting(this.services.root);

        for (const pin of this.services.nodeLayer.querySelectorAll<HTMLElement>(`[${PinAttribute}]`)) {
            const takes = pin.getAttribute(PinDirectionAttribute) === "in"
                && pin.closest<HTMLElement>(`[${NodeAttribute}]`)?.getAttribute(NodeAttribute) !== fromNode
                && canConnect(fromType, pin.getAttribute(PinTypeAttribute) ?? AnyType);

            pin.setAttribute(DropAttribute, takes ? "yes" : "no");
        }

        // After the pins, off what they were told: a row with no input pin at all takes nothing either, and dims with the rest.
        for (const row of this.services.nodeLayer.querySelectorAll<HTMLElement>(RowSelector)) {
            const pin = row.querySelector<HTMLElement>(`[${PinAttribute}][${PinDirectionAttribute}="in"]`);

            row.setAttribute(DropAttribute, pin?.getAttribute(DropAttribute) === "yes" ? "yes" : "no");
        }
    }

    /** The pin under the pointer, filled while the drop would land on it. */
    private aimAt(event: PointerEvent): void {
        const under = document.elementFromPoint(event.clientX, event.clientY);
        const pin = under?.closest<HTMLElement>(`[${PinAttribute}][${DropAttribute}="yes"]`) ?? null;

        markAimed(this.services.nodeLayer, pin, (element, on) => element.classList.toggle(AimClass, on));
    }

    private clearDropTargets(): void {
        endConnecting(this.services.root, this.services.nodeLayer, marked => marked.classList.remove(AimClass));
    }

    private trackConnect(connection: Connection, scene: Point, event: PointerEvent): void {
        const from = this.host.pinPoint(connection.fromNode, connection.fromPin, "out");

        if (from !== null)
            this.services.drawPending(from, scene, this.host.pinColor(connection.fromType));

        this.pulledTo = scene;

        this.aimAt(event);
    }

    /** An edge pulled off an input goes back where it was; a new wire simply never was. */
    private cancelConnection(connection: Connection): void {
        if (connection.detached === null)
            return;

        this.document.edges.push(connection.detached);
        this.services.draw();
    }

    private finishConnection(event: PointerEvent, connection: Connection): void {
        // Uses the point, not the event's target: the viewport captures the pointer, so every drag event is addressed to it regardless of what's underneath.
        const under = document.elementFromPoint(event.clientX, event.clientY);
        const target = under?.closest<HTMLElement>(`[${PinAttribute}][${PinDirectionAttribute}="in"]`) ?? null;
        const toNode = target?.closest<HTMLElement>(`[${NodeAttribute}]`)?.getAttribute(NodeAttribute) ?? null;
        const toPin = target?.getAttribute(PinAttribute) ?? null;

        if (toNode === null || toPin === null) {
            // Dropped on nothing: an edge pulled off an input stays off, which is how a connection is removed; a new wire asks
            // which node to take it, unless it was let go on a node, which is no place for another.
            if (connection.detached !== null)
                this.services.documentState.edited();
            else if (this.pulledTo !== null && under?.closest(`[${NodeAttribute}]`) === null)
                this.host.dropOnNothing({ fromNode: connection.fromNode, fromPin: connection.fromPin, fromType: connection.fromType, at: this.pulledTo });

            return;
        }

        const toType = target?.getAttribute(PinTypeAttribute) ?? "any";

        // Let go where it was taken from — a press on a wired input, a wire pulled and brought back: the same edge, reroutes and all,
        // and no edit.
        if (connection.detached !== null && connection.detached.toNode === toNode && connection.detached.toPin === toPin) {
            this.cancelConnection(connection);
            return;
        }

        if (toNode === connection.fromNode || !canConnect(connection.fromType, toType)) {
            if (connection.detached !== null) {
                this.document.edges.push(connection.detached);
                this.services.draw();
            }

            return;
        }

        const many = this.inputPin(toNode, toPin)?.multiple === true;

        // An input takes one edge and a second replaces it; a pin that takes several keeps them all, but not the same one twice.
        if (many) {
            if (this.document.edges.some(edge => edge.toNode === toNode && edge.toPin === toPin && edge.fromNode === connection.fromNode && edge.fromPin === connection.fromPin)) {
                if (connection.detached !== null)
                    this.document.edges.push(connection.detached);

                this.services.draw();
                return;
            }
        }
        else {
            this.document.edges = this.document.edges.filter(edge => !(edge.toNode === toNode && edge.toPin === toPin));
        }

        this.document.edges.push({ id: newId("e"), fromNode: connection.fromNode, fromPin: connection.fromPin, toNode, toPin, points: [] });
        // A wired input's value is the wire's, so it is a parameter of the sheet no more: dropped in the same step, which an undo
        // brings back with the wire.
        dropParameter(this.document, toNode, toPin);

        this.services.documentState.edited();
    }

    /** One input pin of a node as its kind declares it. */
    private inputPin(nodeId: string, pinName: string): Pin | undefined {
        const node = this.document.nodes.find(candidate => candidate.id === nodeId);

        return findPin(node === undefined ? undefined : this.types.get(node.type), pinName, false);
    }
}
