// The parameters panel under the run panel: the inputs set out as the sheet's parameters (`GraphDocument.parameters`), each with its
// node's own field bound to the same value, so an edit in either shows in the other. The markup is the renderer's; rows are written here.

import { CoreNames } from "../canvas/canvas-dom.ts";
import type { CanvasServices } from "../canvas/canvas-kind.ts";
import { SidePanelFold } from "../canvas/side-panel.ts";
import type { DocumentNode, DocumentParameter, GraphDocument, NodeType, Pin } from "./model.ts";
import { dropParameter, findPin, isParameterAllowed } from "./model.ts";
import { captionInField } from "./node-view.ts";

const PanelSelector = "[data-ui-graph-parameters-panel]";
const ListSelector = "[data-ui-graph-parameters-list]";
// On the root of a canvas that sets its parameters out (`NodesComponent.ShowParameters`).
const ShownAttribute = "data-ui-graph-parameters";
const NodeAttribute = "data-ui-graph-parameter-node";
const PinAttribute = "data-ui-graph-parameter-pin";
const RemoveAttribute = "data-ui-graph-parameter-remove";
const EditorPrefix = "graph-editor:";
const RemoveRegion = "graph-list-remove";
const StoreKey = "parameters";
// `GraphStrings.ShowNode` on the server: what a parameter's name does when pressed.
const ShowNodeKey = "ui.graph.show-node";
const RowClass = "ui-graph__parameter";
const NameClass = "ui-graph__parameter-name";
const NodeNameClass = "ui-graph__parameter-node";
const PinNameClass = "ui-graph__parameter-pin";
const FieldClass = "ui-graph__parameter-field";
// What the keyboard can stand on inside a field the panel clones: the field itself, or its own control.
const FocusableSelector = "input, select, textarea, button, [tabindex]";

/** What the panel asks of the node canvas it stands on. */
export type NodesParametersHost = {
    readonly types: ReadonlyMap<string, NodeType>;
    /** A value typed into a parameter's field: the same edit the node's own field makes. */
    setValue(nodeId: string, pinName: string, value: unknown): void;
    /** A field's value as the document keeps it, read the way the node reads its own. */
    readValue(pin: Pin, field: Element): unknown;
    /** A parameter's name pressed: its node is chosen and brought into view. */
    show(nodeId: string): void;
    /** A fresh copy of a framework component the canvas carries a template of: a field, as the node's own is drawn from. */
    cloneEditor(region: string): HTMLElement | null;
};

/** One parameter as the panel draws it: the input it names, found on the sheet. */
type Found = {
    readonly parameter: DocumentParameter;
    readonly node: DocumentNode;
    readonly type: NodeType;
    readonly pin: Pin;
};

/** Which part of which row held the focus when the rows were drawn again: its node and pin, and the name, field or remove. */
type FocusedPart = { readonly row: string; readonly part: string };

export class NodesParameters {
    private readonly services: CanvasServices<GraphDocument>;
    private readonly host: NodesParametersHost;
    private readonly panel: HTMLElement | null;
    private readonly list: HTMLElement | null;
    private readonly fold: SidePanelFold;
    // What the rows were last drawn for: they are drawn again only when it changes, so a field being typed into is not replaced
    // under the caret; a value alone is written into the field already there.
    private drawnKey = "";
    private readonly fields = new Map<string, { field: HTMLElement; found: Found }>();
    private readonly rows = new Map<string, HTMLElement>();

    public constructor(services: CanvasServices<GraphDocument>, host: NodesParametersHost) {
        this.services = services;
        this.host = host;
        this.panel = services.root.querySelector<HTMLElement>(PanelSelector);
        this.list = this.panel?.querySelector<HTMLElement>(ListSelector) ?? null;
        this.fold = new SidePanelFold(services.context.store, services.root, this.panel, StoreKey);
    }

    /** Whether the canvas sets parameters out at all; read each time, since a bound `ShowParameters` moves without a render. */
    public get shown(): boolean {
        return this.services.root.hasAttribute(ShownAttribute);
    }

    private get document(): GraphDocument {
        return this.services.documentState.document;
    }

    public has(nodeId: string, pinName: string): boolean {
        return this.document.parameters.some(parameter => parameter.node === nodeId && parameter.pin === pinName);
    }

    /** Whether an input may be set out: the canvas sets parameters out, and the input is one that may be (`isParameterAllowed`). */
    public allows(nodeId: string, pinName: string): boolean {
        return this.shown && isParameterAllowed(this.document, this.host.types, nodeId, pinName);
    }

    /** An input set out as a parameter, or taken back: the viewer's edit, undone like any other. */
    public toggle(nodeId: string, pinName: string): void {
        if (this.services.settings.readOnly)
            return;

        if (!dropParameter(this.document, nodeId, pinName)) {
            if (!this.allows(nodeId, pinName))
                return;

            this.document.parameters = [...this.document.parameters, { node: nodeId, pin: pinName }];
        }

        // Nothing on a node shows it, so only the wires and the panel are drawn again.
        this.services.documentState.edited(false);
        this.draw();
    }

    /** Takes back every parameter on the given nodes: they are leaving the sheet. */
    public forget(nodeIds: ReadonlySet<string>): void {
        const document = this.document;

        document.parameters = document.parameters.filter(parameter => !nodeIds.has(parameter.node));
    }

    public contains(target: Element): boolean {
        return this.panel !== null && this.panel.contains(target);
    }

    /** A click on the panel's own parts: its fold, a parameter's remove, a parameter's name. */
    public press(target: Element): boolean {
        if (this.panel === null || !this.panel.contains(target))
            return false;

        if (this.fold.press(target))
            return true;

        const removed = target.closest<HTMLElement>(`[${RemoveAttribute}]`);

        if (removed !== null) {
            this.remove(removed);
            return true;
        }

        const named = target.closest<HTMLElement>(`[${NodeAttribute}]`)?.getAttribute(NodeAttribute);

        if (named !== null && named !== undefined)
            this.host.show(named);

        return true;
    }

    /** Takes a parameter back, handing the focus on its remove to the next row's remove, else the panel's switch, rather than dropping it with the row. */
    private remove(button: HTMLElement): void {
        const row = button.closest<HTMLElement>(`.${RowClass}`);
        const at = row === null || this.list === null ? -1 : [...this.list.children].indexOf(row);
        const focused = button.contains(document.activeElement);

        this.toggle(button.getAttribute(NodeAttribute) ?? "", button.getAttribute(PinAttribute) ?? "");

        if (!focused || this.list === null || this.list.contains(document.activeElement))
            return;

        const next = this.list.children[at]?.querySelector<HTMLElement>(`[${RemoveAttribute}]`) ?? this.panel?.querySelector<HTMLElement>(`[${CoreNames.collapseToggle}]`);

        focusable(next ?? null)?.focus({ preventScroll: true });
    }

    /** Redraws the rows only when which parameters show changed (the focus kept on its part of a row); otherwise gives each field not under the caret its value. */
    public draw(): void {
        if (this.list === null)
            return;

        const found = this.find();
        const readOnly = this.services.settings.readOnly;
        const key = JSON.stringify([readOnly, found.map(entry => [entry.parameter.node, entry.parameter.pin, entry.node.title ?? null])]);

        if (key === this.drawnKey) {
            for (const entry of found)
                this.showValue(entry.node.id, entry.pin.name, entry.node.values[entry.pin.name]);

            return;
        }

        const focused = this.focusedPart();

        this.drawnKey = key;
        this.fields.clear();
        this.rows.clear();
        this.list.replaceChildren(...found.map(entry => this.row(entry, readOnly)));
        this.restoreFocus(focused);
    }

    /** Where in the rows the focus stands, if it does: the row's input and the part of the row. */
    private focusedPart(): FocusedPart | null {
        const active = document.activeElement;

        if (active === null || this.list === null || !this.list.contains(active))
            return null;

        for (const [key, row] of this.rows) {
            if (row.contains(active))
                return { row: key, part: active.closest(`.${NameClass}`) !== null ? NameClass : active.closest(`[${RemoveAttribute}]`) !== null ? RemoveAttribute : FieldClass };
        }

        return null;
    }

    private restoreFocus(focused: FocusedPart | null): void {
        const row = focused === null ? undefined : this.rows.get(focused.row);

        if (focused === null || row === undefined)
            return;

        focusable(row.querySelector<HTMLElement>(focused.part === RemoveAttribute ? `[${RemoveAttribute}]` : `.${focused.part}`))?.focus({ preventScroll: true });
    }

    /** Writes a value into the parameter's field, unless the viewer is typing into it. */
    public showValue(nodeId: string, pinName: string, value: unknown): void {
        const drawn = this.fields.get(`${nodeId}\n${pinName}`);

        if (drawn === undefined || drawn.field.contains(document.activeElement))
            return;

        this.services.context.properties.set(drawn.field, "Value", this.shownValue(drawn.found, value));
    }

    /**
     * The parameters that may stand on the sheet as it is, in the panel's order; one whose node is gone or whose input is wired or
     * hidden is passed over, but kept in the document for when it shows again.
     */
    private find(): Found[] {
        const found: Found[] = [];

        for (const parameter of this.document.parameters) {
            const node = this.document.nodes.find(candidate => candidate.id === parameter.node);
            const type = node === undefined ? undefined : this.host.types.get(node.type);
            const pin = findPin(type, parameter.pin, false);

            if (node !== undefined && type !== undefined && pin !== undefined && isParameterAllowed(this.document, this.host.types, node.id, pin.name))
                found.push({ parameter, node, type, pin });
        }

        return found;
    }

    /** What a parameter is called: its node's name, and the input's own caption under it. */
    private nameOf(entry: Found): string {
        return entry.node.title ?? entry.type.title;
    }

    /** The value a field shows: the node's own, or the kind's default where it holds none. */
    private shownValue(entry: Found, value: unknown): unknown {
        return value ?? entry.pin.defaultValue ?? null;
    }

    /**
     * One parameter: its node's name — over the input's caption where the field does not wear its own, as on the node — the node's
     * own field, and the button that takes it back.
     */
    private row(entry: Found, readOnly: boolean): HTMLElement {
        const context = this.services.context;
        const row = document.createElement("div");
        const name = document.createElement("button");
        const node = document.createElement("span");
        const pin = document.createElement("span");
        const field = this.host.cloneEditor(`${EditorPrefix}${entry.node.type}:${entry.pin.name}`);
        const remove = this.host.cloneEditor(RemoveRegion);

        row.className = RowClass;
        name.className = NameClass;
        name.type = "button";
        context.strings.write(name, context.names.tooltip, ShowNodeKey);
        name.setAttribute(NodeAttribute, entry.node.id);
        node.className = NodeNameClass;
        node.textContent = this.nameOf(entry);
        name.append(node);

        if (!captionInField(entry.pin)) {
            pin.className = PinNameClass;
            pin.textContent = entry.pin.title;
            name.append(pin);
        }
        row.append(name);
        this.rows.set(`${entry.node.id}\n${entry.pin.name}`, row);

        if (field !== null) {
            const properties = context.properties;

            field.classList.add(FieldClass);
            properties.set(field, "Value", this.shownValue(entry, entry.node.values[entry.pin.name]));

            if (readOnly)
                properties.set(field, "IsReadOnly", true);
            else
                field.addEventListener("change", () => this.host.setValue(entry.node.id, entry.pin.name, this.host.readValue(entry.pin, field)));

            this.fields.set(`${entry.node.id}\n${entry.pin.name}`, { field, found: entry });
            row.append(field);
        }

        if (remove !== null) {
            remove.setAttribute(RemoveAttribute, "");
            remove.setAttribute(NodeAttribute, entry.node.id);
            remove.setAttribute(PinAttribute, entry.pin.name);
            context.properties.set(remove, "Enabled", !readOnly);
            row.append(remove);
        }

        return row;
    }
}

/** What the keyboard stands on for a part of a row: the part itself, or the first control of a framework component's own. */
function focusable(part: HTMLElement | null): HTMLElement | null {
    return part === null || part.matches(FocusableSelector) ? part : part.querySelector<HTMLElement>(FocusableSelector);
}
