// Applies a bound collection's changes (reset, insert, remove, move) by key to the list a layered canvas keeps, in the server's order.

import type { CollectionChange } from "ne-standard-ui";

/** Applies one change of the bound collection to the list the canvas keeps, reading each item that arrives with `read`. */
export function applyCollectionChange<T extends { readonly id: string }>(list: T[], change: CollectionChange, read: (value: unknown) => T | null): void {
    switch (change.action) {
        case "Reset":
            list.length = 0;
            return;

        case "Move":
            for (const move of change.moves)
                moveItem(list, move.key, move.newIndex);

            return;

        default:
            for (const item of change.items)
                applyItem(list, change.action, item.key ?? item.oldKey, item.oldKey ?? item.key, item.index, item.item, read);
    }
}

function applyItem<T extends { readonly id: string }>(list: T[], action: string, key: string | null, oldKey: string | null, index: number | null, value: unknown, read: (value: unknown) => T | null): void {
    const at = list.findIndex(item => item.id === (action === "Replace" ? oldKey : key));

    if (action === "Remove") {
        if (at >= 0)
            list.splice(at, 1);

        return;
    }

    const item = read(value);

    if (item === null)
        return;

    if (at >= 0)
        list[at] = item;
    else if (index !== null && index >= 0 && index <= list.length)
        list.splice(index, 0, item);
    else
        list.push(item);
}

function moveItem<T extends { readonly id: string }>(list: T[], key: string | null, newIndex: number | null): void {
    const at = list.findIndex(item => item.id === key);

    if (at < 0 || newIndex === null)
        return;

    const [item] = list.splice(at, 1);

    list.splice(Math.min(newIndex, list.length), 0, item);
}
