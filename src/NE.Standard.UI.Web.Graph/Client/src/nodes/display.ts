// What a display pin draws, by the JSON value's shape alone: a picture's address as the picture, a list of records as a
// table, any other list as lines, an object as its fields, everything else as text.

import { readSize } from "../canvas/canvas-model.ts";

// Matches an address, not a picture — a stored picture's key has no extension, so a string's shape is all we can go on; one
// that fails to draw falls back to its own text.
const AddressPattern = /^(https?:\/\/|data:image\/|blob:|\/)/i;

/** How a display draws what it is given: the word for nothing, and how a number is written. */
export type DisplayOptions = {
    readonly empty: string;
    /** The page's own culture and the pin's format; without a format, the number as it is. */
    readonly number: (value: number) => string;
};

/** The element a value is shown as. */
export function renderDisplayValue(value: unknown, options: DisplayOptions): HTMLElement {
    if (value === null || value === undefined || value === "")
        return line(options.empty, "ui-graph__display-empty");

    if (typeof value === "string")
        return looksLikePicture(value) ? picture(value) : line(value, "ui-graph__display-text");

    if (typeof value === "number")
        return line(options.number(value), "ui-graph__display-number");

    if (typeof value === "bigint")
        return line(String(value), "ui-graph__display-number");

    if (typeof value === "boolean")
        return line(value ? "✓" : "✕", "ui-graph__display-number");

    if (Array.isArray(value))
        return value.length === 0 ? line(options.empty, "ui-graph__display-empty") : list(value, options);

    if (typeof value === "object")
        return record(value as Record<string, unknown>, options);

    return line(String(value), "ui-graph__display-text");
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

/** A list of records is a table of its own columns; a list of anything else is one line each. */
function list(values: readonly unknown[], options: DisplayOptions): HTMLElement {
    const columns = sharedColumns(values);

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

    for (const entry of values) {
        const row = document.createElement("tr");
        const fields = entry as Record<string, unknown>;

        for (const column of columns) {
            const cell = document.createElement("td");

            cell.textContent = text(fields[column], options);
            row.append(cell);
        }

        table.append(row);
    }

    return table;
}

/** The columns every entry shares, or null when the entries are not all plain records. */
function sharedColumns(values: readonly unknown[]): string[] | null {
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
        row.append(line(text(field, options), "ui-graph__display-value"));
        box.append(row);
    }

    return box.childElementCount === 0 ? line(options.empty, "ui-graph__display-empty") : box;
}

function text(value: unknown, options: DisplayOptions): string {
    if (value === null || value === undefined)
        return "";

    if (typeof value === "number")
        return options.number(value);

    if (typeof value === "object")
        return JSON.stringify(value);

    return String(value);
}
