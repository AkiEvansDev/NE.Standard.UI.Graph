// A craft's pill: its name and run length, ingredients entering and products leaving. Only a craft with several or shared products
// is drawn so; one that alone makes a resource collapses onto its edges. Resources use the graph's card; amounts are edge labels.

import type { NumberFormatting, Tooltips } from "ne-standard-ui";
import { hoverTooltip, ItemTitleSelector, NodeAttribute } from "../canvas/canvas-dom.ts";
import type { CanvasItem } from "../canvas/canvas-model.ts";
import type { DraftConflict } from "../graph/draft.ts";
import { EntryAttribute, HandleAttribute } from "../graph/link-drag.ts";
import type { Craft, CraftAmount, Resource } from "./model.ts";

export type CraftViewOptions = {
    readonly tooltips: Tooltips;
    /** What a craft with no name of its own is called. */
    readonly word: string;
    /** Whether the craft wears the handle a product is pulled out of. */
    readonly connectable: boolean;
    readonly conflict: DraftConflict | null;
    /** What stands after the name in place of one run's length: under a plan, the craft's runs and what they come to. */
    readonly note?: string | null;
    /** A resource by its key, for the words the craft's tooltip says. */
    readonly resource: (id: string) => Resource | undefined;
    readonly number: NumberWriter;
};

const TitleClass = ItemTitleSelector.slice(1);

/** How the production views write a number: in the culture the page carries, to three decimals at most. */
export type NumberWriter = (value: number) => string;

/** The framework's own formatting for the canvas's culture, so a plan's table and the page's number fields write one number alike. */
export function numberWriter(numbers: NumberFormatting, root: Element): NumberWriter {
    const culture = numbers.readCulture(root);

    return value => numbers.format(Math.round(value * 1000) / 1000, null, culture);
}

export function renderCraft(placement: CanvasItem, craft: Craft, options: CraftViewOptions): HTMLElement {
    const root = document.createElement("div");
    const name = document.createElement("span");
    const time = document.createElement("span");

    root.className = "ui-graph__node ui-graph__craft";
    root.setAttribute(NodeAttribute, craft.id);
    root.style.setProperty("--ui-graph-node-x", String(placement.x));
    root.style.setProperty("--ui-graph-node-y", String(placement.y));

    if (craft.color !== null)
        root.style.setProperty("--ui-graph-node-color", craft.color);

    if (options.conflict !== null)
        root.setAttribute("data-ui-graph-conflict", options.conflict);

    if (placement.pinned === true)
        root.setAttribute("data-ui-graph-pinned", "");

    // The name a rename lays its field over: emptied, the craft is called what every unnamed one is.
    name.className = `${TitleClass} ui-graph__craft-name`;
    name.textContent = craft.title ?? options.word;
    time.className = "ui-graph__craft-time";
    time.textContent = options.note ?? formatTime(craft.time, options.number);
    root.append(name, time);

    if (options.connectable) {
        const handle = document.createElement("span");
        const entry = document.createElement("span");

        handle.className = "ui-graph__handle";
        handle.setAttribute(HandleAttribute, "");
        entry.className = "ui-graph__entry";
        entry.setAttribute(EntryAttribute, "");
        root.append(entry, handle);
    }

    const words = craft.tooltip ?? describe(craft, options.resource, options.number);

    hoverTooltip(root, words, options.tooltips);

    return root;
}

/** What one run does, as the tooltip says it: what it takes and what it gives, resource by resource. */
function describe(craft: Craft, resource: (id: string) => Resource | undefined, number: NumberWriter): string {
    const side = (amounts: readonly CraftAmount[]): string => amounts.map(amount => `${formatAmount(amount.amount, resource(amount.resource)?.unit ?? null, number)} ${resource(amount.resource)?.title ?? amount.resource}`).join(" + ");

    return `${side(craft.ingredients) || "—"} → ${side(craft.products) || "—"}`;
}

/** A run's length in seconds, with the SI symbol, which needs no translation. */
export function formatTime(seconds: number, number: NumberWriter): string {
    return `${number(seconds)} s`;
}

/** An amount of one run, as a count of it: a multiplication sign the way a recipe is read, and the resource's unit when it has one. */
export function formatAmount(amount: number, unit: string | null, number: NumberWriter): string {
    return unit === null ? `×${number(amount)}` : `×${number(amount)} ${unit}`;
}

/** What a resource says on itself: what one run of the craft that makes it gives of it, and how long that run lasts. */
export function formatOutput(amount: number, unit: string | null, seconds: number, number: NumberWriter): string {
    return `${formatAmount(amount, unit, number)} · ${formatTime(seconds, number)}`;
}

/**
 * A number the viewer typed, a leading × dropped; null unless positive. A comma is the decimal point where the page's culture writes
 * one so, else a thousands mark; a point is always the decimal point, as the server writes it.
 */
export function parsePositive(value: string, decimalSeparator: string): number | null {
    const bare = value.trim().replace("×", "").trim();
    const read = Number(decimalSeparator === "," ? bare.replace(",", ".") : bare.replaceAll(",", ""));

    return Number.isFinite(read) && read > 0 ? read : null;
}
