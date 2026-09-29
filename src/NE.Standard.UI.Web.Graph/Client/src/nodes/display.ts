// What a display pin draws, by the JSON value's shape alone: a picture's address as the picture, a list of records as a table, any
// other list as lines, an object as its fields, the rest as text. What the server cut from a long value arrives as a word
// (`ui.graph.more`, with a count) written in the page's language.

import { readSize } from "../canvas/canvas-model.ts";

// Matches an address, not a picture — a stored picture's key has no extension, so a string's shape is all we can go on; one
// that fails to draw falls back to its own text.
const AddressPattern = /^(https?:\/\/|data:image\/|blob:|\/)/i;

/** How a display draws what it is given: the word for nothing, and how a number and a moment are written. */
export type DisplayOptions = {
    readonly empty: string;
    /** The page's own culture and the pin's format; without a format, the number as it is. */
    readonly number: (value: number) => string;
    /** A text that names a moment — a date the wire wrote — as the page writes one; null for any other text. */
    readonly moment: (text: string) => string | null;
    /** How much the server left out of a long list or text, in the page's words. */
    readonly more: (count: number) => string;
    /** A list's entries on one line, joined as the page's language joins a list. */
    readonly list: (entries: readonly string[]) => string;
    /** One field of a record on one line, its name and its value, in the page's words. */
    readonly field: (key: string, value: string) => string;
};

// `UIGraphWords.More` on the server: the phrase `UINodeDisplayValue` puts where it cut a list or a text short.
export const MoreKey = "ui.graph.more";

// Language-neutral marks, so a boolean reads the same in every page and at every depth of what a display is given.
const Yes = "✓";
const No = "✕";

/** The element a value is shown as. */
export function renderDisplayValue(value: unknown, options: DisplayOptions): HTMLElement {
    if (value === null || value === undefined || value === "")
        return line(options.empty, "ui-graph__display-empty");

    if (typeof value === "string")
        return looksLikePicture(value) ? picture(value) : line(options.moment(value) ?? value, "ui-graph__display-text");

    if (typeof value === "number")
        return line(options.number(value), "ui-graph__display-number");

    if (typeof value === "bigint")
        return line(String(value), "ui-graph__display-number");

    if (typeof value === "boolean")
        return line(value ? Yes : No, "ui-graph__display-number");

    if (Array.isArray(value))
        return value.length === 0 ? line(options.empty, "ui-graph__display-empty") : list(value, options);

    const left = leftOut(value);

    if (left !== null)
        return line(options.more(left), "ui-graph__display-empty");

    if (typeof value === "object")
        return record(value as Record<string, unknown>, options);

    return line(String(value), "ui-graph__display-text");
}

/** The count of a cut-short marker — the server's phrase of the display's own word and nothing else — or null for any other value. */
function leftOut(value: unknown): number | null {
    if (value === null || typeof value !== "object" || Array.isArray(value))
        return null;

    const phrase = value as { readonly key?: unknown; readonly args?: { readonly count?: unknown } };

    return phrase.key === MoreKey && Object.keys(value).length === 2 && typeof phrase.args?.count === "number" ? phrase.args.count : null;
}

function looksLikePicture(value: string): boolean {
    return AddressPattern.test(value.trim());
}

function line(text: string, className: string): HTMLElement {
    const element = document.createElement("div");

    element.className = className;
    element.textContent = text;

    return element;
}

function picture(address: string): HTMLElement {
    const image = document.createElement("img");

    image.className = "ui-graph__display-image";
    image.src = address;
    image.alt = "";
    // Not every address is a picture, and nothing on the client can tell which are: one that does not draw becomes its own text.
    image.addEventListener("error", () => image.replaceWith(line(address, "ui-graph__display-text")), { once: true });

    return image;
}

/** A list of records is a table of its own columns, its cut-short marker a last row; a list of anything else is one line each. */
function list(values: readonly unknown[], options: DisplayOptions): HTMLElement {
    const { entries, more } = splitMore(values);
    const columns = sharedColumns(entries);

    if (columns === null) {
        const box = document.createElement("div");

        box.className = "ui-graph__display-list";

        for (const entry of values)
            box.append(renderDisplayValue(entry, options));

        return box;
    }

    const table = document.createElement("table");
    const head = document.createElement("tr");

    table.className = "ui-graph__display-table";

    for (const column of columns) {
        const cell = document.createElement("th");

        cell.textContent = column;
        head.append(cell);
    }

    table.append(head);

    for (const entry of entries) {
        const row = document.createElement("tr");
        const fields = entry as Record<string, unknown>;

        for (const column of columns) {
            const cell = document.createElement("td");

            cell.textContent = displayText(fields[column], options);
            row.append(cell);
        }

        table.append(row);
    }

    if (more !== null) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");

        cell.colSpan = columns.length;
        cell.className = "ui-graph__display-empty";
        cell.textContent = options.more(more);
        row.append(cell);
        table.append(row);
    }

    return table;
}

/** A list's entries apart from the server's cut-short marker at its end, and that marker's count: never a record of the table. */
export function splitMore(values: readonly unknown[]): { readonly entries: readonly unknown[]; readonly more: number | null } {
    const more = values.length === 0 ? null : leftOut(values.at(-1));

    return more === null ? { entries: values, more: null } : { entries: values.slice(0, -1), more };
}

/** The columns every entry shares, or null when the entries are not all plain records. */
export function sharedColumns(values: readonly unknown[]): string[] | null {
    const columns: string[] = [];

    for (const entry of values) {
        if (entry === null || typeof entry !== "object" || Array.isArray(entry))
            return null;

        for (const key of Object.keys(entry)) {
            if (!columns.includes(key))
                columns.push(key);
        }
    }

    return columns.length === 0 ? null : columns;
}

/** An object's fields, with a picture field drawn as one; an object with a picture plus `width`/`height` is drawn at that size, without repeating those two fields below. */
function record(value: Record<string, unknown>, options: DisplayOptions): HTMLElement {
    const box = document.createElement("div");
    const addressKey = Object.keys(value).find(key => typeof value[key] === "string" && looksLikePicture(value[key]));
    const width = readSize(value["width"]);
    const height = readSize(value["height"]);
    const sized = addressKey !== undefined && width !== null;

    box.className = "ui-graph__display-record";

    if (sized) {
        const image = picture(value[addressKey] as string);

        image.classList.add("ui-graph__display-image--sized");
        image.style.width = `${width}px`;

        if (height !== null)
            image.style.height = `${height}px`;

        box.append(image);
    }

    for (const [key, field] of Object.entries(value)) {
        if (sized && (key === addressKey || key === "width" || key === "height"))
            continue;

        if (typeof field === "string" && looksLikePicture(field)) {
            box.append(picture(field));
            continue;
        }

        const row = document.createElement("div");

        row.className = "ui-graph__display-field";
        row.append(line(key, "ui-graph__display-key"));
        row.append(line(displayText(field, options), "ui-graph__display-value"));
        box.append(row);
    }

    return box.childElementCount === 0 ? line(options.empty, "ui-graph__display-empty") : box;
}

/** A value on one line — a cell's, a field's — with a list's entries and a record's fields written the same way at any depth. */
export function displayText(value: unknown, options: DisplayOptions): string {
    if (value === null || value === undefined)
        return "";

    if (typeof value === "number")
        return options.number(value);

    if (typeof value === "boolean")
        return value ? Yes : No;

    if (typeof value === "string")
        return options.moment(value) ?? value;

    if (Array.isArray(value))
        return options.list(value.map(entry => displayText(entry, options)));

    const left = leftOut(value);

    if (left !== null)
        return options.more(left);

    if (typeof value === "object")
        return options.list(Object.entries(value).map(([key, field]) => options.field(key, displayText(field, options))));

    return String(value);
}

// One formatter a language: a display draws many cells, and a formatter is costly to make.
const ListFormats = new Map<string, Intl.ListFormat>();

/** Entries joined as the language writes a short list — `a, b, c`, `a、b、c`; an unknown language, as English does. */
export function joinList(entries: readonly string[], language: string): string {
    let format = ListFormats.get(language);

    if (format === undefined) {
        try {
            format = new Intl.ListFormat(language.length === 0 ? undefined : language, { type: "conjunction", style: "narrow" });
        }
        catch {
            format = new Intl.ListFormat("en", { type: "conjunction", style: "narrow" });
        }

        ListFormats.set(language, format);
    }

    return format.format(entries);
}
