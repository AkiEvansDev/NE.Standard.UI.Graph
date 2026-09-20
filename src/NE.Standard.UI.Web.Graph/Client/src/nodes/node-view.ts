// One node's DOM: head, pin-only inputs beside outputs, then a row per value with the editor its pin's type asks for. Every
// editor is a framework component cloned from the canvas's template, given the value and read back on change; the node's own
// marks (chevron, pin) are framework `ne-` glyphs, written as a renderer writes an icon value.

import type { Icons, Tooltips } from "ne-standard-ui";
import { FoldAttribute, NodeAttribute, PinToggleAttribute, ResizeAttribute } from "../canvas/canvas-dom.ts";
import { renderDisplayValue } from "./display.ts";
import type { DocumentNode, NodeType, Pin } from "./model.ts";
import { asText, isPinVisible } from "./model.ts";

export const PinAttribute = "data-ui-graph-pin";
export const PinDirectionAttribute = "data-ui-graph-pin-dir";
export const PinTypeAttribute = "data-ui-graph-pin-type";
export const NodeStateAttribute = "data-ui-graph-state";
export const HeadAttribute = "data-ui-graph-head";
export const ValueAttribute = "data-ui-graph-value";
export const DisplayAttribute = "data-ui-graph-display";
export const UploadAttribute = "data-ui-graph-uploading";
export const MultipleAttribute = "data-ui-graph-pin-many";
export const OptionalAttribute = "data-ui-graph-pin-optional";

export type Words = {
    text(key: string): string;
    format(key: string, values: Readonly<Record<string, string | number>>): string;
};

export type NodeViewOptions = {
    readonly words: Words;
    readonly icons: Icons;
    readonly readOnly: boolean;
    /** The colour a pin of each type wears; a type the table does not name takes the canvas's default. */
    readonly pinColor: (type: string) => string;
    /** The type an output pin resolves to right now — an `object` output follows what is connected to the input it names. */
    readonly outputType: (nodeId: string, pinName: string) => string;
    readonly isConnected: (nodeId: string, pinName: string, direction: "in" | "out") => boolean;
    readonly onValueChanged: (nodeId: string, pinName: string, value: unknown) => void;
    /** Asks the canvas to choose a file for a picture pin and send it; the pin shows nothing until the server answers. */
    readonly onPickImage: (nodeId: string, pinName: string) => void;
    /** Tells the canvas a picture field of a pin has sent its file: the selection it landed as, and the file's own name. */
    readonly onImageUploaded: (nodeId: string, pinName: string, selectionId: string, fileName: string) => void;
    /** The page's one tooltip, for the line a pin says about itself. */
    readonly tooltips: Tooltips;
    /** A number as the page writes one: the pin's format against the page's own culture. */
    readonly number: (value: number, format: string | null | undefined) => string;
    /** A fresh copy of the framework's component the canvas carries a template of under the region's name; null when it carries none. */
    readonly cloneEditor: (region: string) => HTMLElement | null;
    /** A property of such a copy, set the way a push sets it. */
    readonly setProperty: (component: Element, propertyName: string, value: unknown) => void;
    /** Such a copy's value, read the way the framework reads it. */
    readonly readValue: (component: Element) => unknown;
};

// The names the canvas's templates are carried under: UIGraphRegions on the server.
const EditorPrefix = "graph-editor:";
const ListRemoveRegion = "graph-list-remove";
// The parts of the framework's picture field the canvas reads: the input its selection lands on, and the file's name.
const PictureSelectionClass = "ui-image-input__selection";
const PictureTextClass = "ui-image-input__text";
const ListAddRegion = "graph-list-add";
// On a list's add button, for the row to stand it beside the list's caption.
const ListAddAttribute = "data-ui-graph-list-add";

/** Draws one node. The element carries everything the engine needs to find it again: the node's id, and a mark per pin. */
export function renderNode(node: DocumentNode, type: NodeType | undefined, options: NodeViewOptions): HTMLElement {
    const root = document.createElement("div");

    root.className = "ui-graph__node";
    root.setAttribute(NodeAttribute, node.id);
    root.style.setProperty("--ui-graph-node-x", String(node.x));
    root.style.setProperty("--ui-graph-node-y", String(node.y));

    if (type?.minWidth !== null && type?.minWidth !== undefined)
        root.style.setProperty("--ui-graph-node-min-width", `${type.minWidth}rem`);

    // A dragged size is a floor, not a fixed box — min-width is still the kind's, and contents may grow it taller. Folded, the
    // node is its head alone; the dragged size is kept, held back until it reopens.
    if (node.collapsed !== true && node.width !== null && node.width !== undefined && node.width > 0)
        root.style.setProperty("--ui-graph-node-w", String(node.width));

    if (node.collapsed !== true && node.height !== null && node.height !== undefined && node.height > 0)
        root.style.setProperty("--ui-graph-node-h", String(node.height));

    const color = node.color ?? type?.color ?? null;

    if (color !== null && color.length > 0)
        root.style.setProperty("--ui-graph-node-color", color);

    if (node.pinned === true)
        root.setAttribute("data-ui-graph-pinned", "");

    const head = renderHead(node, type, options);

    root.append(head);

    // Only a kind that says it has progress worth showing carries the line; every other node's run is told by its frame alone.
    if (type?.showProgress === true)
        root.append(renderProgress());

    // Folded: no body at all, and every pin gathered on the head's two edges, where the edges that reach them converge.
    if (node.collapsed === true) {
        root.setAttribute("data-ui-graph-collapsed", "");
        head.append(renderPorts(node, type, options));

        return root;
    }

    const body = document.createElement("div");

    body.className = "ui-graph__node-body";

    if (type === undefined) {
        const unknown = document.createElement("div");

        unknown.className = "ui-graph__node-unknown";
        unknown.textContent = node.type;
        body.append(unknown);
    }
    else {
        // A pin with no editor is just a name and a dot, so it can share a line with an output without the node widening for it.
        const shown = type.inputs.filter(pin => isPinVisible(pin, node.values));
        const bare = shown.filter(pin => pin.editor === "None");

        for (let index = 0; index < Math.max(bare.length, type.outputs.length); index++)
            body.append(renderPortRow(node, bare[index], type.outputs[index], options));

        for (const pin of shown) {
            if (pin.editor !== "None")
                body.append(renderInput(node, pin, options));
        }
    }

    root.append(body);

    if (!options.readOnly && type?.resizable !== false)
        root.append(resizeGrip());

    return root;
}

/** A folded node's pins, inside its head: the inputs at one edge and the outputs at the other, each side's stacked as one. */
function renderPorts(node: DocumentNode, type: NodeType | undefined, options: NodeViewOptions): HTMLElement {
    const ports = document.createElement("div");

    ports.className = "ui-graph__node-ports";

    if (type === undefined)
        return ports;

    for (const pin of type.inputs) {
        if (pin.hasPin !== false && isPinVisible(pin, node.values))
            ports.append(renderPin(node, pin, pin.type, "in", options));
    }

    for (const pin of type.outputs)
        ports.append(renderPin(node, pin, options.outputType(node.id, pin.name), "out", options));

    return ports;
}

/** The corner the viewer drags to set the node's own width and height. */
function resizeGrip(): HTMLElement {
    const grip = document.createElement("div");

    grip.className = "ui-graph__node-resize";
    grip.setAttribute(ResizeAttribute, "");

    return grip;
}

function renderHead(node: DocumentNode, type: NodeType | undefined, options: NodeViewOptions): HTMLElement {
    const head = document.createElement("div");

    head.className = "ui-graph__node-head";
    head.setAttribute(HeadAttribute, "");

    const fold = document.createElement("button");
    const folded = node.collapsed === true;

    fold.type = "button";
    fold.className = "ui-graph__node-fold";
    fold.setAttribute(FoldAttribute, "");
    fold.title = options.words.text(folded ? "ui.graph.expand" : "ui.graph.collapse");
    fold.setAttribute("aria-label", fold.title);
    fold.setAttribute("aria-expanded", String(!folded));
    fold.append(glyph(options, folded ? "ne-chevron-right" : "ne-chevron-down"));
    head.append(fold);

    const icon = type?.icon ?? null;

    if (icon !== null && icon.length > 0)
        head.append(glyph(options, icon, "ui-graph__node-icon"));

    const title = document.createElement("span");

    title.className = "ui-graph__node-title";
    title.textContent = node.title ?? type?.title ?? node.type;
    head.append(title);

    const pin = document.createElement("button");

    pin.type = "button";
    pin.className = "ui-graph__node-pinned";
    pin.setAttribute(PinToggleAttribute, "");
    pin.title = options.words.text(node.pinned === true ? "ui.graph.unpin" : "ui.graph.pin");
    pin.setAttribute("aria-label", pin.title);
    pin.append(glyph(options, node.pinned === true ? "ne-pin" : "ne-pin-outlined"));
    head.append(pin);

    return head;
}

/** An icon value on a box of its own, the way `IconValueRenderer` writes one: a pack's glyph, or one of the framework's `ne-` marks. */
function glyph(options: NodeViewOptions, icon: string, className?: string): HTMLElement {
    const mark = document.createElement("span");

    if (className !== undefined)
        mark.className = className;

    mark.setAttribute("aria-hidden", "true");
    options.icons.apply(mark, icon);

    return mark;
}

/** The progress line: under the head, full node width, hidden once the node stops running; its own element, not part of the status line, since this has no room around it by design. */
function renderProgress(): HTMLElement {
    const bar = document.createElement("div");

    bar.className = "ui-graph__node-progress";
    bar.hidden = true;
    bar.append(document.createElement("i"));

    return bar;
}

/** One line at the top of a node: a pin-only input on the left, an output on the right, either of them possibly missing. */
function renderPortRow(node: DocumentNode, input: Pin | undefined, output: Pin | undefined, options: NodeViewOptions): HTMLElement {
    const row = document.createElement("div");

    row.className = "ui-graph__row";

    if (input !== undefined) {
        row.append(renderPin(node, input, input.type, "in", options));
        row.append(caption(input, "ui-graph__row-label"));
    }

    if (output !== undefined) {
        row.append(label(output.title, "ui-graph__row-label ui-graph__row-label--out"));
        row.append(renderPin(node, output, options.outputType(node.id, output.name), "out", options));
    }

    return row;
}

function label(text: string, className: string): HTMLElement {
    const element = document.createElement("span");

    element.className = className;
    element.textContent = text;

    return element;
}

/**
 * A pin's caption. A required value wears no mark here: its pin says it (renderPin), and a run that reaches the node without it
 * stops there and says so itself.
 */
function caption(pin: Pin, className: string): HTMLElement {
    return label(pin.title, className);
}

/** One value on a node: most fields wear their caption inside their own box, on one line; a picture, list or multi-line text take the caption above, and a boolean beside it. */
function renderInput(node: DocumentNode, pin: Pin, options: NodeViewOptions): HTMLElement {
    const row = document.createElement("div");
    const connected = pin.hasPin !== false && options.isConnected(node.id, pin.name, "in");
    const tall = isTall(pin);

    row.className = tall ? "ui-graph__row ui-graph__row--tall" : "ui-graph__row";

    // Only a large picture or a display row takes the node's dragged height; every other row keeps its own, and spare height gathers below.
    if ((pin.editor === "Image" && pin.large === true) || pin.editor === "Display")
        row.classList.add("ui-graph__row--grow");

    if (pin.hasPin !== false)
        row.append(renderPin(node, pin, pin.type, "in", options));

    const editor = renderEditor(node, pin, options);
    const add = editor.querySelector<HTMLElement>(`[${ListAddAttribute}]`);

    // A list's add button stands at the end of its caption's line, where it reads as the caption's own action.
    if (add !== null) {
        const head = document.createElement("div");

        head.className = "ui-graph__row-head";
        head.append(caption(pin, "ui-graph__row-label"));
        head.append(add);
        row.append(head);
    }
    else if (tall || pin.editor === "Boolean") {
        row.append(caption(pin, "ui-graph__row-label"));
    }

    if (pin.height !== null && pin.height !== undefined && pin.height > 0)
        editor.style.setProperty("--ui-graph-editor-height", `${pin.height}rem`);

    // A connected edge makes the editor read-only, showing what it carries — except a list, where wired rows come first but typed rows beside them stay open.
    if (connected && pin.editor !== "List") {
        row.classList.add("ui-graph__row--connected");
        editor.setAttribute("inert", "");
    }

    row.append(editor);

    return row;
}

/** Whether the editor is one that cannot share a line with its caption. */
function isTall(pin: Pin): boolean {
    return (pin.editor === "Image" && pin.large === true) || pin.editor === "List" || pin.editor === "Display" || (pin.editor === "Text" && (pin.maxLines ?? 1) > 1);
}

function renderPin(node: DocumentNode, pin: Pin, type: string, direction: "in" | "out", options: NodeViewOptions): HTMLElement {
    const mark = document.createElement("span");

    mark.className = "ui-graph__pin";
    mark.setAttribute(PinAttribute, pin.name);
    mark.setAttribute(PinDirectionAttribute, direction);
    mark.setAttribute(PinTypeAttribute, type);
    mark.style.setProperty("--ui-graph-pin-color", options.pinColor(type));

    // A pin that takes several connections is drawn as a pin that takes several, so nothing has to be tried to find out.
    if (pin.multiple === true)
        mark.setAttribute(MultipleAttribute, "");

    // A pin already carrying an edge is filled, so what is wired reads off the node without following the line.
    if (options.isConnected(node.id, pin.name, direction))
        mark.classList.add("ui-graph__pin--filled");

    // A pin the node can run without wears a dark dot at its centre; every output is optional, since nothing has to read it.
    if (direction === "out" || pin.required !== true)
        mark.setAttribute(OptionalAttribute, "");

    // The page's own tooltip, not the browser's: it shows at once and carries the type plus the pin's line — the only way a
    // folded node (its captions gone) can say it.
    const description = pin.description ?? "";
    const words = `${pin.title} (${typeName(type, pin.multiple === true, options)})${description.length > 0 ? `\n${description}` : ""}`;

    mark.addEventListener("pointerenter", () => options.tooltips.show(mark, words));
    mark.addEventListener("pointerleave", () => options.tooltips.hide());

    return mark;
}

/** A pin type as a person reads it: an array as its element with brackets, an enum by its own name, a pin taking several said so. */
function typeName(type: string, many: boolean, options: NodeViewOptions): string {
    const read = (id: string): string => id.startsWith("array:") ? `${read(id.slice("array:".length))}[]` : id.startsWith("enum:") ? id.slice("enum:".length) : id;

    return many ? options.words.format("ui.graph.pin-many", { type: read(type) }) : read(type);
}

function renderEditor(node: DocumentNode, pin: Pin, options: NodeViewOptions): HTMLElement {
    const value = node.values[pin.name];

    switch (pin.editor) {
        case "Image":
            return imageEditor(node, pin, value, options);
        case "List":
            return listEditor(node, pin, value, options);
        case "Display":
            return displayEditor(pin, options);
        default:
            return fieldEditor(node, pin, value, options);
    }
}

/** A pin's field: a framework component cloned from the canvas's template, shaped server-side by the pin's attributes, given the node's value and read back on change. */
function fieldEditor(node: DocumentNode, pin: Pin, value: unknown, options: NodeViewOptions): HTMLElement {
    const box = editorBox(pin, pin.editor === "Boolean" ? "ui-graph__editor--check" : null);
    const field = options.cloneEditor(`${EditorPrefix}${node.type}:${pin.name}`);

    if (field === null)
        return box;

    box.append(field);
    bindField(field, value ?? null, options, () => options.onValueChanged(node.id, pin.name, readPinValue(pin, options.readValue(field))));

    return box;
}

function editorBox(pin: Pin, modifier: string | null): HTMLElement {
    const box = document.createElement("div");

    box.className = modifier === null ? "ui-graph__editor" : `ui-graph__editor ${modifier}`;
    box.setAttribute(ValueAttribute, pin.name);

    return box;
}

/** Gives a cloned field its value, and either seals it on a read-only sheet or reads it back on every change. */
function bindField(field: HTMLElement, value: unknown, options: NodeViewOptions, onChange: () => void): void {
    options.setProperty(field, "Value", value);

    if (options.readOnly)
        options.setProperty(field, "IsReadOnly", true);
    else
        field.addEventListener("change", onChange);
}

/** A field's value as the document keeps it: a number as a number, and an emptied field as nothing. */
function readPinValue(pin: Pin, value: unknown): unknown {
    return readValueAs(pin.editor === "Number", value);
}

function readValueAs(number: boolean, value: unknown): unknown {
    if (value === undefined || value === "")
        return null;

    if (number && typeof value === "string") {
        const number = Number(value);

        return Number.isFinite(number) ? number : null;
    }

    return value;
}

/** A pin that shows rather than takes: an empty panel until a run fills it via the addressed display effect; nothing here is saved. */
function displayEditor(pin: Pin, options: NodeViewOptions): HTMLElement {
    const box = document.createElement("div");

    box.className = "ui-graph__editor ui-graph__editor--display";
    box.setAttribute(ValueAttribute, pin.name);
    box.setAttribute(DisplayAttribute, "");
    box.append(renderDisplayValue(null, { empty: options.words.text("ui.graph.no-value"), number: value => options.number(value, pin.format) }));

    return box;
}

/** A picture pin: large, the framework's picture field shows the file at once and sends it, with the server answering where it's kept; otherwise the address on one line with a send button. */
function imageEditor(node: DocumentNode, pin: Pin, value: unknown, options: NodeViewOptions): HTMLElement {
    const large = pin.large === true;
    const box = editorBox(pin, large ? "ui-graph__editor--picture" : null);
    const address = asText(value);
    const field = options.cloneEditor(`${EditorPrefix}${node.type}:${pin.name}`);

    if (field === null)
        return box;

    box.append(field);

    if (large) {
        // The field's selection input changes once the file has landed; its name is what the field wrote while it was on its way.
        bindField(field, address.length === 0 ? null : address, options, () => {
            const selection = field.querySelector<HTMLInputElement>(`input.${PictureSelectionClass}`);

            if (selection === null || selection.value.length === 0)
                return;

            const name = field.querySelector(`.${PictureTextClass}`)?.textContent ?? "";

            options.onImageUploaded(node.id, pin.name, selection.value, name);
        });

        return box;
    }

    bindField(field, address.length === 0 ? null : address, options, () => {
        const next = asText(options.readValue(field));

        options.onValueChanged(node.id, pin.name, next.length === 0 ? null : next);
    });

    // The file goes to the server first, which answers with where it's kept; the button is the field's own trailing action, drawn by the template.
    const pick = field.querySelector<HTMLElement>(".ui-text-input__action > *");

    if (pick !== null) {
        disableOnReadOnly(pick, options);

        pick.addEventListener("click", event => {
            // Inside the field's label: a press on the button is not a press on the field.
            event.preventDefault();
            options.onPickImage(node.id, pin.name);
        });
    }

    return box;
}

/** A cloned button on a read-only sheet takes no press. */
function disableOnReadOnly(button: HTMLElement, options: NodeViewOptions): void {
    if (options.readOnly)
        options.setProperty(button, "Enabled", false);
}

/** A list of simple values: a row per value with the element's field and a remove cross; the add button stands beside the list's caption (renderInput). A number list is typed as numbers. */
function listEditor(node: DocumentNode, pin: Pin, value: unknown, options: NodeViewOptions): HTMLElement {
    const box = editorBox(pin, "ui-graph__editor--list");
    const values: unknown[] = Array.isArray(value) ? [...value] : [];
    const numbers = pin.type === "array:number" || pin.type === "number";

    const rows = document.createElement("div");

    rows.className = "ui-graph__list-rows";
    box.append(rows);

    const publish = (): void => options.onValueChanged(node.id, pin.name, [...values]);

    const draw = (): void => {
        rows.replaceChildren();
        rows.hidden = values.length === 0;

        values.forEach((entry, index) => {
            const row = document.createElement("div");
            const field = options.cloneEditor(`${EditorPrefix}${node.type}:${pin.name}`);
            const remove = options.cloneEditor(ListRemoveRegion);

            row.className = "ui-graph__list-row";

            if (field !== null) {
                bindField(field, entry ?? null, options, () => {
                    values[index] = readValueAs(numbers, options.readValue(field));
                    publish();
                });

                row.append(field);
            }

            if (remove !== null) {
                disableOnReadOnly(remove, options);

                remove.addEventListener("click", () => {
                    values.splice(index, 1);
                    draw();
                    publish();
                });

                row.append(remove);
            }

            rows.append(row);
        });
    };

    draw();

    const add = options.cloneEditor(ListAddRegion);

    if (add !== null) {
        add.setAttribute(ListAddAttribute, "");
        disableOnReadOnly(add, options);

        add.addEventListener("click", () => {
            values.push(null);
            draw();
            publish();
        });

        box.append(add);
    }

    return box;
}
