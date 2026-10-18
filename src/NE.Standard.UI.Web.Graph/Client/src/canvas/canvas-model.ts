// What every canvas document has in common (a placed item, a frame around several, an edge with reroute points), and the readers
// a document off the wire is normalised through.

export type Point = { x: number; y: number };

/** One thing placed on the sheet: dragged, pinned, folded, renamed and coloured by the canvas itself. */
export type CanvasItem = {
    id: string;
    x: number;
    y: number;
    title?: string | null;
    color?: string | null;
    pinned?: boolean;
    /** Folded to its head. */
    collapsed?: boolean;
    /** What the viewer dragged the item to, in canvas units; unset, the item's own size. */
    width?: number | null;
    height?: number | null;
};

/** An edge as the canvas handles it: chosen by its id and bent through the points the viewer dropped on it. */
export type CanvasEdge = {
    id: string;
    points: Point[];
};

export type CanvasGroup = {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    title?: string | null;
    color?: string | null;
    /** A pinned frame is not dragged, and so carries none of its items anywhere. */
    pinned?: boolean;
};

/** The part of a document the canvas owns outright; a kind's document adds its items and edges beside the groups. */
export type CanvasDocument = {
    groups: CanvasGroup[];
};

/** What the application calls a document, off the wire: kept as it came and sent back with every save. */
export function readDocumentKey(source: { readonly key?: unknown }): string | null {
    return typeof source.key === "string" ? source.key : null;
}

/** JSON off an attribute: nothing for an empty or an unreadable one, since neither is a document or a catalogue. */
export function readJson(value: string | null): unknown {
    if (value === null || value.length === 0)
        return null;

    try {
        return JSON.parse(value);
    }
    catch {
        return null;
    }
}

/** A size off the wire, or null: a zero or a nonsense number is no size at all — an item's dragged box, a display picture's own. */
export function readSize(value: unknown): number | null {
    const read = Number(value);

    return Number.isFinite(read) && read > 0 ? read : null;
}

/** A drafted kind's placed item off the wire: where the viewer put it and whether it is pinned; the rest is its collection's. */
export function readPlacement(item: CanvasItem): CanvasItem {
    return { id: String(item.id), x: Number(item.x) || 0, y: Number(item.y) || 0, pinned: item.pinned === true };
}

export function readCanvasEdge(edge: CanvasEdge): CanvasEdge {
    return { id: String(edge.id), points: readPoints(edge.points) };
}

/** A draft entry's marks off the wire: whether the viewer added it, and the server's item as JSON when first changed. */
export function readDraftMarks(entry: unknown): { created: boolean; baseline: string | null } {
    const source = entry as { created?: unknown; baseline?: unknown };

    return { created: source.created === true, baseline: typeof source.baseline === "string" ? source.baseline : null };
}

/** A text off the wire, or null for anything else and for an empty one. */
export function readText(value: unknown): string | null {
    return typeof value === "string" && value.length > 0 ? value : null;
}

export function readPoints(points: readonly Point[] | null | undefined): Point[] {
    return (points ?? []).map(point => ({ x: Number(point.x) || 0, y: Number(point.y) || 0 }));
}

export function readGroup(group: CanvasGroup): CanvasGroup {
    return {
        id: String(group.id),
        x: Number(group.x) || 0,
        y: Number(group.y) || 0,
        width: Number(group.width) || 0,
        height: Number(group.height) || 0,
        title: group.title ?? null,
        color: group.color ?? null,
        pinned: group.pinned === true
    };
}

/** An id nothing else in the document carries. */
export function newId(prefix: string): string {
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}
