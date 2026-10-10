// The plan panel over the sheet's trailing side: the request (targets, period, objective) in the core's own fields, and the
// answer in three tables (brought in, resource balance, craft runs). Markup and fields are the renderer's; rows are written here.

import { cloneTemplate, CoreNames } from "../canvas/canvas-dom.ts";
import type { CanvasServices } from "../canvas/canvas-kind.ts";
import { focusAfterRemoval, SidePanelFold } from "../canvas/side-panel.ts";
import type { Craft, ProductionDocument, Resource } from "./model.ts";
import { broughtIn } from "./plan.ts";
import type { PlanObjective, PlanPeriod, PlanRequest } from "./plan.ts";
import { rateSuffix } from "./plan-view.ts";
import type { PlanReading } from "./plan-view.ts";
import { formatTime, numberWriter, parsePositive } from "./craft-view.ts";
import type { NumberWriter } from "./craft-view.ts";

const PanelSelector = "[data-ui-graph-plan]";
const TargetsSelector = "[data-ui-graph-plan-targets]";
const AddSelector = "[data-ui-graph-plan-add]";
const RemoveAttribute = "data-ui-graph-plan-remove";
const MessageSelector = "[data-ui-graph-plan-message]";
const TotalsSelector = "[data-ui-graph-plan-totals]";
const RateAttribute = "data-ui-graph-plan-rate";
const StoreKey = "plan";
// Why a plan asked for came to nothing, in the words the panel says it by.
const FailureWords = { infeasible: "ui.graph.plan-infeasible", unsettled: "ui.graph.plan-unsettled" } as const;

export type PlanPanelHost = {
    request(): PlanRequest;
    /** The plan as it was last solved, or nothing while there is none to read. */
    reading(): PlanReading | null;
    /** Why a plan asked for came to nothing, when it did. */
    failure(): "infeasible" | "unsettled" | null;
    resource(id: string): Resource | undefined;
    craft(id: string): Craft | undefined;
    /** Another request: written into the document as the viewer's edit. */
    change(next: PlanRequest): void;
    /** A target's amount, as the chip over its node sets it too: a number above zero is the target, nothing takes it off. */
    target(resource: string, amount: number | null): void;
    /** The picker of resources to plan for. */
    pick(): void;
    /** A row pressed: the item it names is chosen and brought into view. */
    show(id: string): void;
};

export class PlanPanel {
    private readonly services: CanvasServices<ProductionDocument>;
    private readonly number: NumberWriter;
    private readonly host: PlanPanelHost;
    private readonly panel: HTMLElement | null;
    private readonly period: HTMLElement | null;
    private readonly objective: HTMLElement | null;
    private readonly fold: SidePanelFold;
    private drawnKey = "";
    // What the target rows were last drawn for (which targets, names, whether changeable) and each row's amount field by resource: an
    // amount alone is written into its field, so the field or button the keyboard is on stays.
    private targetsKey = "";
    private readonly amounts = new Map<string, HTMLElement>();

    public constructor(services: CanvasServices<ProductionDocument>, host: PlanPanelHost) {
        this.services = services;
        this.host = host;
        this.number = numberWriter(services.context.numbers, services.root);
        this.panel = services.root.querySelector<HTMLElement>(PanelSelector);
        this.period = this.field("[data-ui-graph-plan-period]");
        this.objective = this.field("[data-ui-graph-plan-objective]");

        this.period?.addEventListener("change", () => this.choose());
        this.objective?.addEventListener("change", () => this.choose());
        this.fold = new SidePanelFold(services.context.store, services.root, this.panel, StoreKey);
    }

    /** The core's component inside one of the panel's boxes: the region's own root. */
    private field(selector: string): HTMLElement | null {
        return this.panel?.querySelector<HTMLElement>(`${selector} > *`) ?? null;
    }

    private choose(): void {
        const values = this.services.context.values;
        const period = this.period === null ? null : values.read(this.period);
        const objective = this.objective === null ? null : values.read(this.objective);
        const request = this.host.request();

        this.host.change({
            ...request,
            period: period === "Minute" || period === "Hour" ? period : "Once" satisfies PlanPeriod,
            objective: objective === "LeastTime" || objective === "LeastCost" ? objective : "LeastRaw" satisfies PlanObjective
        });
    }

    public contains(target: Element): boolean {
        return this.panel !== null && this.panel.contains(target);
    }

    /** A click on the panel's own parts: its fold, the button that adds a target, a target's remove, a row that names an item. */
    public press(target: Element): boolean {
        if (this.panel === null || !this.panel.contains(target))
            return false;

        if (this.fold.press(target))
            return true;

        if (!this.services.settings.readOnly && this.edit(target))
            return true;

        // A row only chooses its item and brings it into view, which a plan that may not be changed allows as well.
        const shown = target.closest<HTMLElement>("[data-ui-graph-plan-item]")?.getAttribute("data-ui-graph-plan-item");

        if (shown !== null && shown !== undefined)
            this.host.show(shown);

        return true;
    }

    /** A press that changes the request — the button that adds a target, or a target's remove; false for any other. */
    private edit(target: Element): boolean {
        if (target.closest(AddSelector) !== null) {
            this.host.pick();
            return true;
        }

        const button = target.closest<HTMLElement>(`[${RemoveAttribute}]`);
        const removed = button?.getAttribute(RemoveAttribute);

        if (button === null || removed === null || removed === undefined)
            return false;

        this.removeTarget(removed, button);

        return true;
    }

    /**
     * A target taken off; the focus its row held — its remove, or the next stop of its field just emptied, which the field's change
     * meets in passing — goes to the next target's remove, else to the panel's switch, rather than to the page.
     */
    private removeTarget(resource: string, part: HTMLElement): void {
        const at = this.host.request().targets.findIndex(entry => entry.resource === resource);
        const active = document.activeElement;
        const held = active === null || active === document.body || (part.closest(`${TargetsSelector} > *`) ?? part).contains(active);

        this.host.target(resource, null);

        if (!held)
            return;

        // The rows are drawn again with the canvas's next draw: the focus is handed on once the row has gone, if it went with it.
        requestAnimationFrame(() => {
            const list = this.panel?.querySelector<HTMLElement>(TargetsSelector) ?? null;

            if (this.panel === null || (document.activeElement !== null && document.activeElement !== document.body))
                return;

            focusAfterRemoval(list?.children[at]?.querySelector<HTMLElement>(`[${RemoveAttribute}]`) ?? null, this.panel.querySelector<HTMLElement>(`[${CoreNames.collapseToggle}]`), this.services.context.focus);
        });
    }

    /** The panel as the request and the plan stand now, when either changed; the targets' rows only when which targets there are did. */
    public draw(key: string): void {
        if (this.panel === null || key === this.drawnKey)
            return;

        this.drawnKey = key;

        const request = this.host.request();
        const reading = this.host.reading();
        const readOnly = this.services.settings.readOnly;
        const properties = this.services.context.properties;

        if (this.period !== null) {
            properties.set(this.period, "Value", request.period);
            properties.set(this.period, "IsReadOnly", readOnly);
        }

        if (this.objective !== null) {
            properties.set(this.objective, "Value", request.objective);
            properties.set(this.objective, "IsReadOnly", readOnly);
        }

        const add = this.field(AddSelector);

        if (add !== null)
            properties.set(add, "Enabled", !readOnly);

        this.panel.toggleAttribute(RateAttribute, request.period !== "Once");

        // The period stands after a table's caption, once: not after every number in it.
        for (const head of this.panel.querySelectorAll<HTMLElement>("[data-ui-graph-plan-counted]"))
            head.setAttribute("data-ui-graph-plan-counted", rateSuffix(request.period, this.services.context.strings));

        this.drawTargets(request, readOnly);
        this.drawMessage(request, reading);
        this.drawTables(reading);
    }

    /** The page's words changed: the panel is drawn afresh, its target rows too, for the request and plan it last showed. */
    public wordsChanged(): void {
        const key = this.drawnKey;

        this.drawnKey = "";
        this.targetsKey = "";
        this.draw(key);
    }

    /**
     * The targets' rows, drawn again only when which targets there are, their names or whether they may be changed moved; otherwise
     * each amount is written into its field in place, unless the viewer is in it.
     */
    private drawTargets(request: PlanRequest, readOnly: boolean): void {
        const list = this.panel!.querySelector<HTMLElement>(TargetsSelector);

        if (list === null)
            return;

        const key = JSON.stringify([readOnly, request.targets.map(target => {
            const resource = this.host.resource(target.resource);

            return [target.resource, resource?.title, resource?.image ?? resource?.icon];
        })]);

        if (key === this.targetsKey) {
            for (const target of request.targets)
                this.showAmount(target.resource, target.amount);

            return;
        }

        this.targetsKey = key;
        this.amounts.clear();
        list.replaceChildren(...request.targets.map(target => this.targetRow(target.resource, target.amount, readOnly)));
    }

    /** Writes an amount into its target's field, unless the viewer is typing into it. */
    private showAmount(resource: string, value: number): void {
        const field = this.amounts.get(resource);

        if (field !== undefined && !field.contains(document.activeElement))
            this.services.context.properties.set(field, "Value", value);
    }

    /** One target: its name, the core's number field over its amount, and the button that takes it off. */
    private targetRow(id: string, value: number, readOnly: boolean): HTMLElement {
        const resource = this.host.resource(id);
        const row = document.createElement("div");
        const name = this.nameOf(id, resource?.title ?? id, resource?.image ?? resource?.icon ?? null);
        const amount = cloneTemplate(this.services.root, "graph-plan-amount");
        const remove = cloneTemplate(this.services.root, "graph-plan-remove");
        const properties = this.services.context.properties;

        row.className = "ui-graph__plan-target";
        row.append(name);

        if (amount !== null) {
            properties.set(amount, "Value", value);
            properties.set(amount, "IsReadOnly", readOnly);
            amount.addEventListener("change", () => this.setAmount(id, amount, this.services.context.values.read(amount)));
            this.amounts.set(id, amount);
            row.append(amount);
        }

        if (remove !== null) {
            remove.setAttribute(RemoveAttribute, id);
            properties.set(remove, "Enabled", !readOnly);
            row.append(remove);
        }

        return row;
    }

    /**
     * An amount typed over a target, read as the chip over its node reads one: a number above zero is the new target, an emptied field
     * takes the target off, anything else leaves the old one standing.
     */
    private setAmount(resource: string, field: HTMLElement, value: unknown): void {
        if (typeof value !== "number" && String(value ?? "").trim().length === 0) {
            this.removeTarget(resource, field);
            return;
        }

        const decimalSeparator = this.services.context.numbers.readCulture(this.services.root).decimalSeparator;
        const amount = typeof value === "number" ? value > 0 ? value : null : parsePositive(String(value), decimalSeparator);

        if (amount === null) {
            // The field is put back to what the plan still says.
            const standing = this.host.request().targets.find(entry => entry.resource === resource);

            if (standing !== undefined)
                this.services.context.properties.set(field, "Value", standing.amount);

            return;
        }

        this.host.target(resource, amount);
    }

    private drawMessage(request: PlanRequest, reading: PlanReading | null): void {
        const words = this.services.context.strings;
        const message = this.panel!.querySelector<HTMLElement>(MessageSelector);
        const totals = this.panel!.querySelector<HTMLElement>(TotalsSelector);

        if (message !== null) {
            message.hidden = reading !== null;
            const failure = request.targets.length > 0 ? this.host.failure() : null;

            message.toggleAttribute("data-ui-graph-plan-failed", failure !== null);
            message.textContent = reading !== null ? "" : words.text(failure === null ? "ui.graph.plan-empty" : FailureWords[failure]);
        }

        if (totals === null)
            return;

        totals.hidden = reading === null;

        if (reading !== null) {
            totals.textContent = words.format("ui.graph.plan-totals", {
                time: formatTime(reading.plan.time, this.number),
                raw: this.number(reading.plan.raw),
                cost: this.number(reading.plan.cost)
            });
        }
    }

    private drawTables(reading: PlanReading | null): void {
        const words = this.services.context.strings;
        const raw: HTMLElement[] = [];
        const resources: HTMLElement[] = [];
        const crafts: HTMLElement[] = [];

        for (const entry of reading?.plan.resources ?? []) {
            const resource = this.host.resource(entry.resource);
            const unit = resource?.unit === null || resource?.unit === undefined ? "" : ` ${resource.unit}`;
            const name = this.nameOf(entry.resource, resource?.title ?? entry.resource, resource?.image ?? resource?.icon ?? null);

            if (entry.source) {
                raw.push(row(entry.resource, name, `${this.number(broughtIn(entry))}${unit}`));
                continue;
            }

            resources.push(row(entry.resource, name, `${this.number(entry.produced)}${unit}`, `${this.number(entry.consumed)}${unit}`, entry.surplus > 0 ? `${this.number(entry.surplus)}${unit}` : "—"));
        }

        for (const entry of reading?.plan.crafts ?? []) {
            const craft = this.host.craft(entry.craft);
            // A recipe with no look of its own wears what it makes, as the resources' rows above wear theirs.
            const made = craft?.products[0] === undefined ? undefined : this.host.resource(craft.products[0].resource);
            const name = this.nameOf(entry.craft, craft?.title ?? words.text("ui.graph.recipe"), craft?.icon ?? made?.image ?? made?.icon ?? null);

            crafts.push(row(entry.craft, name, this.number(entry.runs), formatTime(entry.time, this.number), entry.workers === null ? "—" : this.number(entry.workers)));
        }

        this.fill("raw", raw);
        this.fill("resources", resources);
        this.fill("crafts", crafts);
    }

    private fill(name: string, rows: readonly HTMLElement[]): void {
        const section = this.panel!.querySelector<HTMLElement>(`[data-ui-graph-plan-section="${name}"]`);
        const body = this.panel!.querySelector<HTMLElement>(`[data-ui-graph-plan-rows="${name}"]`);

        if (section === null || body === null)
            return;

        section.hidden = rows.length === 0;
        body.replaceChildren(...rows);
    }

    /** An item named as the sheet names it — its picture or its icon, and its title — as a button, so a row is reached by the keyboard too. */
    private nameOf(id: string, title: string, icon: string | null): HTMLElement {
        const name = document.createElement("button");
        const text = document.createElement("span");

        name.type = "button";
        name.className = "ui-graph__plan-name";
        name.setAttribute("data-ui-graph-plan-item", id);
        // A name too long for its column ends in an ellipsis; the whole of it is what the pointer reads, in the page's tooltip.
        name.setAttribute(this.services.context.names.tooltip, title);

        if (icon !== null) {
            const box = document.createElement("span");

            box.className = "ui-graph__plan-icon";
            box.setAttribute("aria-hidden", "true");
            this.services.context.icons.apply(box, icon);
            name.append(box);
        }

        text.textContent = title;
        name.append(text);

        return name;
    }
}

/** One row of a table: the item's name, then its numbers. */
function row(id: string, name: HTMLElement, ...cells: string[]): HTMLElement {
    const line = document.createElement("tr");
    const head = document.createElement("th");

    head.scope = "row";
    head.append(name);
    line.setAttribute("data-ui-graph-plan-item", id);
    line.append(head);

    for (const text of cells) {
        const cell = document.createElement("td");

        cell.textContent = text;
        line.append(cell);
    }

    return line;
}
