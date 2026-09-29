// The node canvas's document and catalogue off the wire, plus small answers the engine and tests need: which pins may join,
// what a new node starts with, and how a copy is renamed.

import type { CanvasEdge, CanvasGroup, CanvasItem } from "../canvas/canvas-model.ts";
import { newId, readDocumentKey, readGroup, readPoints, readSize } from "../canvas/canvas-model.ts";

type PinEditor = "None" | "Text" | "Number" | "Boolean" | "Image" | "Date" | "Time" | "DateTime" | "Choice" | "List" | "Display";

export type Pin = {
    readonly name: string;
    readonly title: string;
    readonly type: string;
    readonly editor: PinEditor;
    readonly defaultValue?: unknown;
    readonly min?: number | null;
    readonly max?: number | null;
    readonly step?: number | null;
    readonly maxLines?: number | null;
    readonly maxLength?: number | null;
    readonly typeOf?: string | null;
    /** False for a value that can only be filled in on the node: no pin is drawn and no edge may reach it. */
    readonly hasPin?: boolean;
    /** How tall the editor stands, in rem. */
    readonly height?: number | null;
    /** A picture editor drawn as one large surface the viewer presses, rather than a thumbnail with its address beside it. */
    readonly large?: boolean;
    /** The node cannot run without it: a run stops on the node rather than handing it nothing. */
    readonly required?: boolean;
    /** The pin takes several connections at once; its `type` is the element's, since one edge carries one element. */
    readonly multiple?: boolean;
    /** The line the pin says about itself when the pointer rests on it. */
    readonly description?: string | null;
    /** How a person reads the pin's type when it is an enum or an application's class: the catalogue's name for it. */
    readonly typeTitle?: string | null;
    /** The input pin this one is shown beside; unset, the pin is always drawn. */
    readonly visibleWhen?: string | null;
    /** The values of `visibleWhen`'s pin that show this one; empty, any value but an empty one. */
    readonly visibleValues?: readonly string[];
    /** What the value is measured in, written after the editor inside its box. */
    readonly unit?: string | null;
    /** How a number the canvas writes itself is formatted — a display pin's answer, by the page's culture. */
    readonly format?: string | null;
    /** The node itself changes the value as it runs; the node offers to put it back to its default. */
    readonly state?: boolean;
    /** A state drawn nowhere on the node, which the node's menu resets. */
    readonly hidden?: boolean;
};

export type NodeType = {
    readonly key: string;
    readonly title: string;
    readonly category?: string | null;
    /** The one line the picker shows under the title. */
    readonly description?: string | null;
    readonly icon?: string | null;
    readonly color?: string | null;
    /** The least width the node stands at, in rem; the viewer may drag it wider. */
    readonly minWidth?: number | null;
    /** Whether the node draws a progress line while it runs; a kind that does not say so draws none. */
    readonly showProgress?: boolean;
    /** Whether the viewer may drag the node's corner; unset, they may. */
    readonly resizable?: boolean;
    /** Whether the picker leaves the kind out, though a saved document still reads and draws it. */
    readonly hidden?: boolean;
    /** Whether the node is a small box with its pins on its two ends and no head or editors — a reroute. */
    readonly compact?: boolean;
    readonly inputs: readonly Pin[];
    readonly outputs: readonly Pin[];
};

export type DocumentNode = CanvasItem & {
    type: string;
    values: Record<string, unknown>;
};

export type DocumentEdge = CanvasEdge & {
    fromNode: string;
    fromPin: string;
    toNode: string;
    toPin: string;
};

/** An input set out as a parameter of the sheet: the node it is on and the pin's name. `UINodeParameter` on the server. */
export type DocumentParameter = {
    readonly node: string;
    readonly pin: string;
};

export type GraphDocument = {
    nodes: DocumentNode[];
    edges: DocumentEdge[];
    groups: CanvasGroup[];
    key: string | null;
    /** The inputs set out in the parameters panel, in the order they were added. */
    parameters: DocumentParameter[];
};

export const AnyType = "any";
const ArrayType = "array";
const ArrayPrefix = "array:";
const TextType = "text";
const ImageType = "image";

export function emptyDocument(): GraphDocument {
    return { nodes: [], edges: [], groups: [], key: null, parameters: [] };
}

/** A document as it came off the wire, with every part present and every number a number. */
export function readDocument(value: unknown): GraphDocument {
    const source = value as Partial<GraphDocument> | null | undefined;

    if (source === null || source === undefined || typeof source !== "object")
        return emptyDocument();

    return {
        nodes: (source.nodes ?? []).map(readNode),
        edges: (source.edges ?? []).map(readEdge),
        groups: (source.groups ?? []).map(readGroup),
        key: readDocumentKey(source),
        parameters: (source.parameters ?? []).map(parameter => ({ node: String(parameter.node), pin: String(parameter.pin) }))
    };
}

function readNode(node: DocumentNode): DocumentNode {
    return {
        id: String(node.id),
        type: String(node.type),
        x: Number(node.x) || 0,
        y: Number(node.y) || 0,
        title: node.title ?? null,
        color: node.color ?? null,
        pinned: node.pinned === true,
        collapsed: node.collapsed === true,
        values: { ...node.values },
        width: readSize(node.width),
        height: readSize(node.height)
    };
}

function readEdge(edge: DocumentEdge): DocumentEdge {
    return {
        id: String(edge.id),
        fromNode: String(edge.fromNode),
        fromPin: String(edge.fromPin),
        toNode: String(edge.toNode),
        toPin: String(edge.toPin),
        points: readPoints(edge.points)
    };
}

function isArrayType(type: string): boolean {
    return type === ArrayType || type.startsWith(ArrayPrefix);
}

/** A picture is an address: it goes into a text pin and a text goes into it. */
function isTextLike(type: string): boolean {
    return type === TextType || type === ImageType;
}

/** Whether an edge may run from an output of `from` into an input of `to` — the same rule the server's UINodePinTypes states. */
export function canConnect(from: string, to: string): boolean {
    if (from.length === 0 || to.length === 0)
        return false;

    if (from === to || from === AnyType || to === AnyType)
        return true;

    if (isTextLike(from) && isTextLike(to))
        return true;

    return isArrayType(from) && isArrayType(to) && (from === ArrayType || to === ArrayType);
}

/** A node of the given kind, at the given place, with every editable pin on its default. */
export function createNode(type: NodeType, x: number, y: number): DocumentNode {
    const values: Record<string, unknown> = {};

    for (const pin of type.inputs) {
        if (pin.editor !== "None" && pin.defaultValue !== undefined && pin.defaultValue !== null)
            values[pin.name] = pin.defaultValue;
    }

    return { id: newId("n"), type: type.key, x, y, title: null, color: null, pinned: false, values };
}

/** Whether a kind's input can be a parameter of the sheet: one with a field of its own — not a picture, a list, a display or a hidden state. */
function canBeParameter(pin: Pin): boolean {
    return pin.hidden !== true && pin.editor !== "None" && pin.editor !== "Image" && pin.editor !== "List" && pin.editor !== "Display";
}

/**
 * Whether an input may be a sheet parameter: one of a node on the sheet, with a field of its own, fed by no edge (a wired input's
 * value is the wire's) and shown by its node — the server's `UINodeCatalog.CanBeParameter` rule.
 */
export function isParameterAllowed(document: GraphDocument, types: ReadonlyMap<string, NodeType>, nodeId: string, pinName: string): boolean {
    const node = document.nodes.find(candidate => candidate.id === nodeId);
    const type = node === undefined ? undefined : types.get(node.type);
    const pin = findPin(type, pinName, false);

    return node !== undefined && type !== undefined && pin !== undefined && canBeParameter(pin) && edgeInto(document, nodeId, pinName) === undefined && isPinVisible(pin, node, type);
}

/** Takes one input out of the sheet's parameters; whether it was one. */
export function dropParameter(document: GraphDocument, nodeId: string, pinName: string): boolean {
    const kept = document.parameters.filter(parameter => parameter.node !== nodeId || parameter.pin !== pinName);
    const dropped = kept.length !== document.parameters.length;

    document.parameters = kept;

    return dropped;
}

/** Whether a pin has anything to reset: an edge on it, or — an input with a value of its own — a value other than its kind's default. */
export function canResetPin(document: GraphDocument, types: ReadonlyMap<string, NodeType>, nodeId: string, pinName: string, direction: "in" | "out"): boolean {
    const node = document.nodes.find(candidate => candidate.id === nodeId);
    const pin = findPin(node === undefined ? undefined : types.get(node.type), pinName, direction === "out");

    if (node === undefined || pin === undefined)
        return false;

    if (document.edges.some(edge => isEdgeOn(edge, nodeId, pinName, direction)))
        return true;

    return direction === "in" && holdsValue(pin) && JSON.stringify(node.values[pinName] ?? pin.defaultValue ?? null) !== JSON.stringify(pin.defaultValue ?? null);
}

/** A pin back to where a new node's stands: every edge on it let go and, for an input with a value of its own, the kind's default. */
export function resetPin(document: GraphDocument, types: ReadonlyMap<string, NodeType>, nodeId: string, pinName: string, direction: "in" | "out"): void {
    const node = document.nodes.find(candidate => candidate.id === nodeId);
    const pin = findPin(node === undefined ? undefined : types.get(node.type), pinName, direction === "out");

    if (node === undefined || pin === undefined)
        return;

    document.edges = document.edges.filter(edge => !isEdgeOn(edge, nodeId, pinName, direction));

    if (direction === "in" && holdsValue(pin))
        node.values[pinName] = pin.defaultValue ?? null;
}

function isEdgeOn(edge: DocumentEdge, nodeId: string, pinName: string, direction: "in" | "out"): boolean {
    return direction === "in" ? edge.toNode === nodeId && edge.toPin === pinName : edge.fromNode === nodeId && edge.fromPin === pinName;
}

/** Whether an input keeps a value in the document: every one with an editor, save a display, which shows what a run fed it. */
function holdsValue(pin: Pin): boolean {
    return pin.editor !== "None" && pin.editor !== "Display";
}

/** The input pin an edge already feeds, if any: an input takes one edge, so a new one replaces it. */
export function edgeInto(document: GraphDocument, nodeId: string, pinName: string): DocumentEdge | undefined {
    return document.edges.find(edge => edge.toNode === nodeId && edge.toPin === pinName);
}

/** Every edge feeding one input pin, in the document's own order — which is the order a pin that takes several is fed in. */
export function edgesInto(document: GraphDocument, nodeId: string, pinName: string): DocumentEdge[] {
    return document.edges.filter(edge => edge.toNode === nodeId && edge.toPin === pinName);
}

/**
 * Whether a pin is drawn: one shown beside another appears only while that one holds a named (or any non-empty) value — its field's,
 * or the kind's default. A hidden pin is still saved and fed.
 */
export function isPinVisible(pin: Pin, node: { readonly values: Record<string, unknown> }, type: NodeType): boolean {
    if (pin.hidden === true)
        return false;

    const beside = pin.visibleWhen ?? "";

    if (beside.length === 0)
        return true;

    const value = pinValue(node.values, type, beside);
    const named = pin.visibleValues ?? [];

    if (named.length > 0)
        return named.some(candidate => candidate === asText(value));

    return value !== null && value !== undefined && value !== false && asText(value).length > 0;
}

/** What one input holds as its field shows it: the node's value, or the kind's default where the node holds none. */
function pinValue(values: Record<string, unknown>, type: NodeType, pinName: string): unknown {
    return values[pinName] ?? type.inputs.find(pin => pin.name === pinName)?.defaultValue;
}

/** A value as the rule above compares it and as an editor shows it: nothing for nothing, the text of anything else. */
export function asText(value: unknown): string {
    return value === null || value === undefined ? "" : String(value);
}

/** The pin one name stands for on a kind. */
export function findPin(type: NodeType | undefined, name: string, outputs: boolean): Pin | undefined {
    return (outputs ? type?.outputs : type?.inputs)?.find(pin => pin.name === name);
}

/** The type an output pin resolves to: its own, or — via `typeOf` — the type feeding the input it follows, chained; a loop resolves to the universal type rather than hanging. */
export function resolveOutputType(document: GraphDocument, types: ReadonlyMap<string, NodeType>, nodeId: string, pinName: string, seen = new Set<string>()): string {
    const step = `${nodeId}:${pinName}`;

    if (seen.has(step))
        return AnyType;

    seen.add(step);

    const node = document.nodes.find(candidate => candidate.id === nodeId);
    const type = node === undefined ? undefined : types.get(node.type);
    const pin = findPin(type, pinName, true);

    if (pin === undefined)
        return AnyType;

    if (pin.typeOf === null || pin.typeOf === undefined || pin.typeOf.length === 0)
        return pin.type;

    const feeding = edgeInto(document, nodeId, pin.typeOf);

    if (feeding === undefined)
        return findPin(type, pin.typeOf, false)?.type ?? AnyType;

    // An `object` input carries whatever is connected to it, and a universal array its element type: either way the output
    // takes the type that reached the input it follows.
    return resolveOutputType(document, types, feeding.fromNode, feeding.fromPin, seen);
}

/** Everything the given nodes carry with them: the nodes themselves and the edges that run between two of them. */
export function slice(document: GraphDocument, nodeIds: ReadonlySet<string>): { nodes: DocumentNode[]; edges: DocumentEdge[] } {
    const nodes = document.nodes.filter(node => nodeIds.has(node.id));
    const edges = document.edges.filter(edge => nodeIds.has(edge.fromNode) && nodeIds.has(edge.toNode));

    return { nodes: nodes.map(node => ({ ...node, values: { ...node.values } })), edges: edges.map(edge => ({ ...edge, points: [...edge.points] })) };
}

/** A copy of a slice with fresh ids, moved by the given offset — what a paste drops onto the canvas. */
export function duplicate(cut: { nodes: DocumentNode[]; edges: DocumentEdge[] }, offsetX: number, offsetY: number): { nodes: DocumentNode[]; edges: DocumentEdge[] } {
    const renamed = new Map<string, string>();
    const nodes = cut.nodes.map(node => {
        const id = newId("n");

        renamed.set(node.id, id);

        return { ...node, id, x: node.x + offsetX, y: node.y + offsetY, values: { ...node.values } };
    });

    const edges = cut.edges.map(edge => ({
        ...edge,
        id: newId("e"),
        fromNode: renamed.get(edge.fromNode) ?? edge.fromNode,
        toNode: renamed.get(edge.toNode) ?? edge.toNode,
        points: edge.points.map(point => ({ x: point.x + offsetX, y: point.y + offsetY }))
    }));

    return { nodes, edges };
}
