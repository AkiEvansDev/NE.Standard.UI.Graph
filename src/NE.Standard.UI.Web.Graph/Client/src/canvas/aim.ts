// Tracks the one element under a dragged pointer that a drop would land on, so the mark can move without scanning the layer.
// Unmarking a detached element (from a redrawn layer) is harmless.

const aimed = new WeakMap<Element, Element | null>();

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
