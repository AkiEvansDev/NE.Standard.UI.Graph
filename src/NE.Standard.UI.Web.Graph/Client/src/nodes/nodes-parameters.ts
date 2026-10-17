// The sheet's parameters in the column a `NodesParametersComponent` aimed at the canvas stands beside it: the inputs set out as the
// sheet's parameters (`GraphDocument.parameters`), each with its node's own field bound to the same value, so an edit in either
// shows in the other. The column's markup is its renderer's, found on the page by the canvas's id; rows are written here.

import type { CanvasServices } from "../canvas/canvas-kind.ts";
import { focusablePart } from "../canvas/side-panel.ts";
import type { DocumentNode, DocumentParameter, GraphDocument, NodeType, Pin } from "./model.ts";
import { dropParameter, findPin, isParameterAllowed } from "./model.ts";
import { captionInField } from "./node-view.ts";

/** On a parameters column (`NodesParametersComponentRenderer.TargetAttribute`): the id of the canvas whose parameters it shows. */
export const ParametersTargetAttribute = "data-ui-graph-parameters-for";
const ListSelector = "[data-ui-graph-parameters-list]";
const NodeAttribute = "data-ui-graph-parameter-node";
const PinAttribute = "data-ui-graph-parameter-pin";
const RemoveAttribute = "data-ui-graph-parameter-remove";
const EditorPrefix = "graph-editor:";
const RemoveRegion = "graph-list-remove";
// `GraphStrings.ShowNode` on the server: what a parameter's name does when pressed.
const ShowNodeKey = "ui.graph.show-node";
const RowClass = "ui-graph__parameter";
const NameClass = "ui-graph__parameter-name";
const NodeNameClass = "ui-graph__parameter-node";
const PinNameClass = "ui-graph__parameter-pin";
const FieldClass = "ui-graph__parameter-field";
// What the keyboard can stand on inside a field the panel clones: the field itself, or its own control.

/** What the column asks of the node canvas it shows the parameters of. */
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
    // What the rows were last drawn for, and into which list: they are drawn again only when either changes, so a field being typed
    // into is not replaced under the caret; a value alone is written into the field already there.
    private drawnKey = "";
    private drawnList: HTMLElement | null = null;
    private readonly fields = new Map<string, { field: HTMLElement; found: Found }>();
    private readonly rows = new Map<string, HTMLElement>();
    // The columns this canvas listens on: a column drawn again is a new element, and needs its listener anew.
    private readonly heard = new WeakSet<HTMLElement>();

    public constructor(services: CanvasServices<GraphDocument>, host: NodesParametersHost) {
        this.services = services;
        this.host = host;
    }

    /**
     * The column aimed at this canvas, looked up each time: it may be drawn before the canvas or after it, or drawn again, and the
     * canvas's root may be drawn again under the same id.
     */
    private get panel(): HTMLElement | null {
        const id = this.services.root.getAttribute(this.services.context.names.componentId);

        return id === null ? null : this.services.context.root.querySelector<HTMLElement>(`[${ParametersTargetAttribute}="${CSS.escape(id)}"]`);
    }

    /** Whether a column on the page shows this canvas's parameters; only then does a pin's menu offer to set one out. */
    public get shown(): boolean {
        return this.panel !== null;
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

    /**
     * A press in the column: a parameter's remove, a parameter's name. A canvas whose root left the page lets its column go to the
     * canvas drawn in its place, which listens on it too.
     */
    private press(panel: HTMLElement, target: Element): void {
        if (!this.services.root.isConnected)
            return;

        const removed = target.closest<HTMLElement>(`[${RemoveAttribute}]`);

        if (removed !== null) {
            this.remove(panel, removed);
            return;
        }

        const named = target.closest<HTMLElement>(`[${NodeAttribute}]`)?.getAttribute(NodeAttribute);

        if (named !== null && named !== undefined)
            this.host.show(named);
    }

    /**
     * Takes a parameter back, handing the focus on its remove to the next row's remove, else the column itself (a holder of the
     * keyboard), rather than dropping it to the page with the row.
     */
    private remove(panel: HTMLElement, button: HTMLElement): void {
        const list = panel.querySelector<HTMLElement>(ListSelector);
        const row = button.closest<HTMLElement>(`.${RowClass}`);
        const at = row === null || list === null ? -1 : [...list.children].indexOf(row);
        const focused = button.contains(document.activeElement);

        this.toggle(button.getAttribute(NodeAttribute) ?? "", button.getAttribute(PinAttribute) ?? "");

        if (!focused || list === null || list.contains(document.activeElement))
            return;

        const next = focusablePart(list.children[at]?.querySelector<HTMLElement>(`[${RemoveAttribute}]`) ?? null, this.services.context.focus);

        (next ?? panel).focus({ preventScroll: true });
    }

    /**
     * Redraws the rows only when which parameters show changed, or the column was drawn anew (the focus kept on its part of a row);
     * otherwise gives each field not under the caret its value. No column aimed at the canvas, nothing is drawn.
     */
    public draw(): void {
        const panel = this.panel;
        const list = panel?.querySelector<HTMLElement>(ListSelector) ?? null;

        if (panel === null || list === null)
            return;

        this.listen(panel);

        const found = this.find();
        const readOnly = this.services.settings.readOnly;
        const key = JSON.stringify([readOnly, found.map(entry => [entry.parameter.node, entry.parameter.pin, entry.node.title ?? null])]);

        if (key === this.drawnKey && list === this.drawnList) {
            for (const entry of found)
                this.showValue(entry.node.id, entry.pin.name, entry.node.values[entry.pin.name]);

            return;
        }

        const focused = this.focusedPart(list);

        this.drawnKey = key;
        this.drawnList = list;
        this.fields.clear();
        this.rows.clear();
        list.replaceChildren(...found.map(entry => this.row(entry, readOnly)));
        this.restoreFocus(focused);
    }

    /** Hears the column's presses, once per column element. */
    private listen(panel: HTMLElement): void {
        if (this.heard.has(panel))
            return;

        this.heard.add(panel);
        panel.addEventListener("click", event => {
            if (event.target instanceof Element)
                this.press(panel, event.target);
        });
    }

    /** Where in the rows the focus stands, if it does: the row's input and the part of the row. */
    private focusedPart(list: HTMLElement): FocusedPart | null {
        const active = document.activeElement;

        if (active === null || !list.contains(active))
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

        focusablePart(row.querySelector<HTMLElement>(focused.part === RemoveAttribute ? `[${RemoveAttribute}]` : `.${focused.part}`), this.services.context.focus)?.focus({ preventScroll: true });
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
