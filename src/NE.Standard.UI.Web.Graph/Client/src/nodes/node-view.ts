// One node's DOM: head, pin-only inputs beside outputs, then a row per value with the editor its pin's type asks for — a framework
// component cloned from the canvas's template. The node's own marks (chevron, pin) are framework `ne-` glyphs, written as a
// renderer writes an icon value.

import type { ClientStrings, ComponentStates, DomNames, Icons, TemporalFormatting, Tooltips, Urls } from "ne-standard-ui";
import { CollapsedAttribute, CoreNames, FoldAttribute, hoverTooltip, NodeAttribute, PinToggleAttribute, ResizeAttribute } from "../canvas/canvas-dom.ts";
import { joinList, MoreKey, renderDisplayValue } from "./display.ts";
import type { DisplayOptions } from "./display.ts";
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
/** The menu the right button opens on a pin's row — `UIGraphMenus.Pin` on the server — over the node's own. */
export const PinMenuName = "graph-pin-menu";
/** On every part a right press opens a pin's menu from: the pin's name, and whether it is an input or an output. */
export const PinMenuAttribute = "data-ui-graph-pin-menu";
export const PinMenuDirectionAttribute = "data-ui-graph-pin-menu-dir";
const MultipleAttribute = "data-ui-graph-pin-many";
const OptionalAttribute = "data-ui-graph-pin-optional";

// The built-in pin types by the words a person reads them in; an enum's or an application's class's name comes with the catalogue.
const TypeWords: Readonly<Record<string, string>> = {
    any: "ui.graph.type-any",
    array: "ui.graph.type-list",
    text: "ui.graph.type-text",
    number: "ui.graph.type-number",
    boolean: "ui.graph.type-boolean",
    image: "ui.graph.type-image",
    date: "ui.graph.type-date",
    time: "ui.graph.type-time",
    datetime: "ui.graph.type-datetime"
};
const ArrayPrefix = "array:";
const EnumPrefix = "enum:";
// `GraphStrings.DisplayField` on the server: a record's field on a display's one line, its name and its value.
const DisplayFieldKey = "ui.graph.display-field";

export type NodeViewOptions = {
    /** The canvas's own words; the catalogue's text — kinds, pins — is the application's, shown as written. */
    readonly words: ClientStrings;
    readonly names: DomNames;
    readonly states: ComponentStates;
    /** How a person reads an enum's or an application's class's pin type, by its id: the catalogue's name for it. */
    readonly typeTitles: ReadonlyMap<string, string>;
    readonly icons: Icons;
    readonly readOnly: boolean;
    /** The colour a pin of each type wears; a type the table does not name takes the canvas's default. */
    readonly pinColor: (type: string) => string;
    /** The type an output pin resolves to right now — an `object` output follows what is connected to the input it names. */
    readonly outputType: (nodeId: string, pinName: string) => string;
    readonly isConnected: (nodeId: string, pinName: string, direction: "in" | "out") => boolean;
    /** The caption of the output an input is fed from, or null while nothing feeds it. */
    readonly feedTitle: (nodeId: string, pinName: string) => string | null;
    readonly onValueChanged: (nodeId: string, pinName: string, value: unknown) => void;
    /** Asks the canvas to choose a file for a picture pin and send it; the pin shows nothing until the server answers. */
    readonly onPickImage: (nodeId: string, pinName: string) => void;
    /** Tells the canvas a picture field of a pin has sent its file: the selection it landed as, and the file's own name. */
    readonly onImageUploaded: (nodeId: string, pinName: string, selectionId: string, fileName: string) => void;
    /** The page's one tooltip, for the line a pin says about itself. */
    readonly tooltips: Tooltips;
    /** A number as the page writes one: the pin's format against the page's own culture. */
    readonly number: (value: number, format: string | null | undefined) => string;
    /** A moment as the page writes one, for a display's dates. */
    readonly date: (value: Date, format: string | null) => string;
    readonly temporal: TemporalFormatting;
    /** The framework's rule for an address a display may draw a picture from. */
    readonly urls: Urls;
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
const ListAddRegion = "graph-list-add";
const StateResetRegion = "graph-state-reset";
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

    if (type?.compact === true)
        return renderCompact(root, node, type, options);

    const head = renderHead(node, type, options);

    root.append(head);

    // Only a kind that says it has progress worth showing carries the line; every other node's run is told by its frame alone.
    // The head holds it, so it is placed against the head's edge rather than standing in the node's flow.
    if (type?.showProgress === true)
        head.append(renderProgress());

    // Folded: no body at all, and every pin gathered on the head's two edges, where the edges that reach them converge.
    if (node.collapsed === true) {
        root.setAttribute(CollapsedAttribute, "");
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
        const shown = type.inputs.filter(pin => isPinVisible(pin, node, type));
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

/**
 * A reroute: a small box with its pins on its two ends, named after the output that feeds it and wearing that output's colour, so a
 * wire led round a corner reads as the same wire.
 */
function renderCompact(root: HTMLElement, node: DocumentNode, type: NodeType, options: NodeViewOptions): HTMLElement {
    const input = type.inputs[0];
    const output = type.outputs[0];

    root.classList.add("ui-graph__node--compact");

    if ((node.color ?? null) === null && output !== undefined)
        root.style.setProperty("--ui-graph-node-color", options.pinColor(options.outputType(node.id, output.name)));

    const name = document.createElement("span");

    name.className = "ui-graph__node-reroute";
    name.textContent = node.title ?? (input === undefined ? null : options.feedTitle(node.id, input.name)) ?? type.title;

    const ports = document.createElement("div");

    ports.className = "ui-graph__node-ports";

    // Both ends in the colour of what passes through, the way in as much as the way out; each opens its own pin's menu.
    if (input !== undefined && output !== undefined)
        ports.append(opensPinMenu(renderPin(node, input, options.outputType(node.id, output.name), "in", options), input, "in", options));

    if (output !== undefined)
        ports.append(opensPinMenu(renderPin(node, output, options.outputType(node.id, output.name), "out", options), output, "out", options));

    root.append(name, ports);

    return root;
}

/**
 * A folded node's pins, inside its head: the inputs at one edge and the outputs at the other, each side's stacked as one. With no
 * rows to press, each mark opens its own pin's menu.
 */
function renderPorts(node: DocumentNode, type: NodeType | undefined, options: NodeViewOptions): HTMLElement {
    const ports = document.createElement("div");

    ports.className = "ui-graph__node-ports";

    if (type === undefined)
        return ports;

    for (const pin of type.inputs) {
        if (pin.hasPin !== false && isPinVisible(pin, node, type))
            ports.append(opensPinMenu(renderPin(node, pin, pin.type, "in", options), pin, "in", options));
    }

    for (const pin of type.outputs)
        ports.append(opensPinMenu(renderPin(node, pin, options.outputType(node.id, pin.name), "out", options), pin, "out", options));

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
    headMark(fold, folded ? "ui.graph.expand" : "ui.graph.collapse", options);
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
    headMark(pin, node.pinned === true ? "ui.graph.unpin" : "ui.graph.pin", options);
    pin.append(glyph(options, node.pinned === true ? "ne-pin" : "ne-pin-outlined"));
    head.append(pin);

    return head;
}

/**
 * A head mark's word, as its name and the page's tooltip; on a read-only sheet it is still drawn, as the node's state, disabled the
 * framework's way, so it keeps its place for the keyboard.
 */
function headMark(mark: HTMLElement, key: string, options: NodeViewOptions): void {
    options.words.write(mark, "aria-label", key);
    options.words.write(mark, options.names.tooltip, key);

    if (options.readOnly)
        options.states.setDisabled(mark, true);
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

    // Two pins share the line, so each opens its own menu from its own half: its mark and its caption.
    if (input !== undefined) {
        row.append(opensPinMenu(renderPin(node, input, input.type, "in", options), input, "in", options));
        row.append(opensPinMenu(caption(input, "ui-graph__row-label"), input, "in", options));
    }

    if (output !== undefined) {
        row.append(opensPinMenu(label(output.title, "ui-graph__row-label ui-graph__row-label--out"), output, "out", options));
        row.append(opensPinMenu(renderPin(node, output, options.outputType(node.id, output.name), "out", options), output, "out", options));
    }

    return row;
}

/** Makes a part open the pin's menu on a right press, rather than its node's. */
function opensPinMenu(element: HTMLElement, pin: Pin, direction: "in" | "out", options: NodeViewOptions): HTMLElement {
    element.setAttribute(options.names.contextMenuUse, PinMenuName);
    element.setAttribute(PinMenuAttribute, pin.name);
    element.setAttribute(PinMenuDirectionAttribute, direction);

    return element;
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
    // The whole row is the input's: a right press anywhere on it — its pin, its caption, its field — opens the pin's menu.
    opensPinMenu(row, pin, "in", options);

    // Only a large picture, a display or a multi-line text takes the node's dragged height; every other row keeps its own, and spare height gathers below.
    if ((pin.editor === "Image" && pin.large === true) || pin.editor === "Display" || (pin.editor === "Text" && (pin.maxLines ?? 1) > 1))
        row.classList.add("ui-graph__row--grow");

    if (pin.hasPin !== false)
        row.append(renderPin(node, pin, pin.type, "in", options));

    // A wired input shows what the wire carries, read-only as the family draws one — still readable, never inert — except a list,
    // where wired rows come first but typed rows beside them stay open.
    const sealed = connected && pin.editor !== "List";
    const editor = renderEditor(node, pin, sealed, options);
    const add = editor.querySelector<HTMLElement>(`[${ListAddAttribute}]`);

    // A list's add button stands at the end of its caption's line, where it reads as the caption's own action.
    if (add !== null) {
        const head = document.createElement("div");

        head.className = "ui-graph__row-head";
        head.append(caption(pin, "ui-graph__row-label"));
        head.append(add);
        row.append(head);
    }
    else if (!captionInField(pin)) {
        row.append(caption(pin, "ui-graph__row-label"));
    }

    if (pin.height !== null && pin.height !== undefined && pin.height > 0)
        editor.style.setProperty("--ui-graph-editor-height", `${pin.height}rem`);

    if (sealed)
        row.classList.add("ui-graph__row--connected");

    row.append(editor);

    if (pin.state === true) {
        const reset = stateReset(node, pin, editor, options);

        if (reset !== null)
            row.append(reset);
    }

    return row;
}

/** A state value's way back to where it started: the kind's default, put in as the viewer's own edit, so it undoes like one. */
function stateReset(node: DocumentNode, pin: Pin, editor: HTMLElement, options: NodeViewOptions): HTMLElement | null {
    const reset = options.cloneEditor(StateResetRegion);

    if (reset === null)
        return null;

    disableOnReadOnly(reset, options.readOnly, options);
    reset.addEventListener("click", () => {
        const value = pin.defaultValue ?? null;
        const field = editor.firstElementChild;

        // The field shows it at once: an edit redraws only the wires, since a field the viewer typed into already shows its value.
        if (field !== null)
            options.setProperty(field, "Value", value);

        options.onValueChanged(node.id, pin.name, value);
    });

    return reset;
}

/** Whether the pin's field wears its caption inside its own box; a tall one and a boolean's box take it beside them instead. */
export function captionInField(pin: Pin): boolean {
    return !isTall(pin) && pin.editor !== "Boolean";
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

    // The page's own tooltip, not the browser's: the type plus the pin's line — the only way a folded node (its captions gone) can
    // say it.
    const words = options.words;
    const description = pin.description ?? "";
    const named = words.format("ui.graph.pin-type", { name: pin.title, type: typeName(type, pin.multiple === true, options) });

    hoverTooltip(mark, description.length > 0 ? `${named}\n${description}` : named, options.tooltips);

    return mark;
}

/** A pin type as a person reads it: a built-in one in the page's words, a list of its element, an enum or a class by the catalogue's name for it, a pin taking several said so. */
function typeName(type: string, many: boolean, options: NodeViewOptions): string {
    const words = options.words;
    const read = (id: string): string => {
        if (id.startsWith(ArrayPrefix))
            return words.format("ui.graph.type-list-of", { type: read(id.slice(ArrayPrefix.length)) });

        const key = TypeWords[id];

        if (key !== undefined)
            return words.text(key);

        const title = options.typeTitles.get(id);

        return title === undefined ? (id.startsWith(EnumPrefix) ? id.slice(EnumPrefix.length) : id) : title;
    };

    return many ? words.format("ui.graph.pin-many", { type: read(type) }) : read(type);
}

function renderEditor(node: DocumentNode, pin: Pin, sealed: boolean, options: NodeViewOptions): HTMLElement {
    // An unheld value (a node an application wrote, a field emptied) shows the kind's default, which a run takes for it, rather than
    // standing empty — but not on a wired input, whose value the wire brings.
    const wired = options.isConnected(node.id, pin.name, "in");
    const value = node.values[pin.name] ?? (wired ? null : pin.defaultValue);

    switch (pin.editor) {
        case "Image":
            return imageEditor(node, pin, value, sealed || options.readOnly, options);
        case "List":
            return listEditor(node, pin, value, options);
        case "Display":
            return displayEditor(pin, options);
        default:
            return fieldEditor(node, pin, value, sealed || options.readOnly, options);
    }
}

/** A pin's field: a framework component cloned from the canvas's template, shaped server-side by the pin's attributes, given the node's value and read back on change. */
function fieldEditor(node: DocumentNode, pin: Pin, value: unknown, readOnly: boolean, options: NodeViewOptions): HTMLElement {
    const box = editorBox(pin, pin.editor === "Boolean" ? "ui-graph__editor--check" : null);
    const field = options.cloneEditor(`${EditorPrefix}${node.type}:${pin.name}`);

    if (field === null)
        return box;

    box.append(field);
    bindField(field, value ?? null, readOnly, options, () => options.onValueChanged(node.id, pin.name, readPinValue(pin, options.readValue(field))));

    return box;
}

function editorBox(pin: Pin, modifier: string | null): HTMLElement {
    const box = document.createElement("div");

    box.className = modifier === null ? "ui-graph__editor" : `ui-graph__editor ${modifier}`;
    box.setAttribute(ValueAttribute, pin.name);

    return box;
}

/** Gives a cloned field its value, and either seals it — a read-only sheet, a wired input — or reads it back on every change. */
function bindField(field: HTMLElement, value: unknown, readOnly: boolean, options: NodeViewOptions, onChange: () => void): void {
    options.setProperty(field, "Value", value);

    if (readOnly)
        options.setProperty(field, "IsReadOnly", true);
    else
        field.addEventListener("change", onChange);
}

/**
 * A field's value as the document keeps it: a number as a number, an emptied field as nothing — but an emptied text as an empty text,
 * since nothing would run as the kind's default while the field shows empty.
 */
export function readPinValue(pin: Pin, value: unknown): unknown {
    return pin.editor === "Text" && value === "" ? "" : readValueAs(pin.editor === "Number", value);
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
    box.append(renderDisplayValue(null, displayOptions(pin, options)));

    return box;
}

/** How a display pin writes what it is given: the page's word for nothing, a number by the pin's format, a moment as the page writes one. */
export function displayOptions(pin: Pin | undefined, options: Pick<NodeViewOptions, "words" | "number" | "date" | "temporal" | "urls">): DisplayOptions {
    return {
        empty: options.words.text("ui.graph.no-value"),
        more: count => options.words.format(MoreKey, { count }),
        list: entries => joinList(entries, document.documentElement.lang),
        field: (key, value) => options.words.format(DisplayFieldKey, { key, value }),
        number: value => options.number(value, pin?.format),
        isImageSource: address => options.urls.isImageSource(address),
        moment: text => {
            const written = options.temporal.parse(text);

            return written === null ? null : options.date(options.temporal.toDate(written), text.length <= 10 ? "yyyy-MM-dd" : null);
        }
    };
}

/** A picture pin: large, the framework's picture field shows the file at once and sends it, with the server answering where it's kept; otherwise the address on one line with a send button. */
function imageEditor(node: DocumentNode, pin: Pin, value: unknown, readOnly: boolean, options: NodeViewOptions): HTMLElement {
    const large = pin.large === true;
    const box = editorBox(pin, large ? "ui-graph__editor--picture" : null);
    const address = asText(value);
    const field = options.cloneEditor(`${EditorPrefix}${node.type}:${pin.name}`);

    if (field === null)
        return box;

    box.append(field);

    if (large) {
        // The field's selection input changes once the file has landed; its name is what the field wrote while it was on its way.
        bindField(field, address.length === 0 ? null : address, readOnly, options, () => {
            const selection = field.querySelector<HTMLInputElement>(`input.${CoreNames.pictureSelectionClass}`);

            if (selection === null || selection.value.length === 0)
                return;

            const name = field.querySelector(`.${CoreNames.pictureTextClass}`)?.textContent ?? "";

            options.onImageUploaded(node.id, pin.name, selection.value, name);
        });

        return box;
    }

    bindField(field, address.length === 0 ? null : address, readOnly, options, () => {
        const next = asText(options.readValue(field));

        options.onValueChanged(node.id, pin.name, next.length === 0 ? null : next);
    });

    // The file goes to the server first, which answers with where it's kept; the button is the field's own trailing action, drawn by the template.
    const pick = field.querySelector<HTMLElement>(`.${CoreNames.textInputActionClass} > *`);

    if (pick !== null) {
        disableOnReadOnly(pick, readOnly, options);

        pick.addEventListener("click", event => {
            // Inside the field's label: a press on the button is not a press on the field.
            event.preventDefault();
            options.onPickImage(node.id, pin.name);
        });
    }

    return box;
}

/** A cloned button on a read-only sheet, or of a wired input, takes no press. */
function disableOnReadOnly(button: HTMLElement, readOnly: boolean, options: NodeViewOptions): void {
    if (readOnly)
        options.setProperty(button, "Enabled", false);
}

/** A list of simple values: a row per value with the element's field and a remove cross; the add button stands beside the list's caption (renderInput). A number list is typed as numbers. */
function listEditor(node: DocumentNode, pin: Pin, value: unknown, options: NodeViewOptions): HTMLElement {
    const box = editorBox(pin, "ui-graph__editor--list");
    const values: unknown[] = Array.isArray(value) ? [...(value as unknown[])] : [];
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
                bindField(field, entry ?? null, options.readOnly, options, () => {
                    values[index] = readValueAs(numbers, options.readValue(field));
                    publish();
                });

                row.append(field);
            }

            if (remove !== null) {
                disableOnReadOnly(remove, options.readOnly, options);

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
        disableOnReadOnly(add, options.readOnly, options);

        add.addEventListener("click", () => {
            values.push(null);
            draw();
            publish();
        });

        box.append(add);
    }

    return box;
}
