// A connection pulled across the sheet — a wire from a pin, a link from a node's handle — and its marks: the root, the parts it
// would land on or be refused by, and the drop target under the pointer, tracked so the mark moves without scanning the layer.
// Unmarking a detached element (a redrawn layer's) is harmless.

import { ConnectingClass, DropAttribute } from "./canvas-dom.ts";

const aimed = new WeakMap<Element, Element | null>();

/** A connection begins: the stylesheet steps back what would refuse it and holds the crosshair over whatever it crosses. */
export function beginConnecting(root: Element): void {
    root.classList.add(ConnectingClass);
}

/** The connection ended: the root no longer says so, and every drop mark in the layer goes, `clear` taking each part's own marks too. */
export function endConnecting(root: Element, layer: ParentNode, clear?: (marked: Element) => void): void {
    root.classList.remove(ConnectingClass);

    for (const marked of layer.querySelectorAll(`[${DropAttribute}]`)) {
        marked.removeAttribute(DropAttribute);
        clear?.(marked);
    }
}

/** Marks `target` as what the pointer aims at in `layer`, and unmarks what it aimed at before; null aims at nothing. */
export function markAimed(layer: Element, target: Element | null, mark: (element: Element, on: boolean) => void): void {
    const previous = aimed.get(layer) ?? null;

    if (previous === target)
        return;

    if (previous !== null)
        mark(previous, false);

    if (target !== null)
        mark(target, true);

    aimed.set(layer, target);
}
