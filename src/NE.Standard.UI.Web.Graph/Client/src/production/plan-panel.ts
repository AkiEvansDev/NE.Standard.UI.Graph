// The plan panel over the sheet's trailing side: the request (targets, period, objective) in the core's own fields, and the
// answer in three tables (brought in, resource balance, craft runs). Markup and fields are the renderer's; rows are written here.

import type { CanvasServices } from "../canvas/canvas-kind.ts";
import type { Craft, ProductionDocument, Resource } from "./model.ts";
import { broughtIn } from "./plan.ts";
import type { PlanObjective, PlanPeriod, PlanRequest } from "./plan.ts";
import { rateSuffix } from "./plan-view.ts";
import type { PlanReading } from "./plan-view.ts";
import { formatTime, numberWriter } from "./craft-view.ts";
import type { NumberWriter } from "./craft-view.ts";

const PanelSelector = "[data-ui-graph-plan]";
// The framework's own fold: its engine slides the panel and writes the attribute, as it does for the corner menu.
const ToggleSelector = "[data-ui-collapse-toggle]";
const CollapsedAttribute = "data-ui-collapsed";
const TargetsSelector = "[data-ui-graph-plan-targets]";
const AddSelector = "[data-ui-graph-plan-add]";
const RemoveAttribute = "data-ui-graph-plan-remove";
const MessageSelector = "[data-ui-graph-plan-message]";
const TotalsSelector = "[data-ui-graph-plan-totals]";
const RateAttribute = "data-ui-graph-plan-rate";
const StoreKey = "plan";

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
    private drawnKey = "";

    public constructor(services: CanvasServices<ProductionDocument>, host: PlanPanelHost) {
        this.services = services;
        this.host = host;
        this.number = numberWriter(services.context.numbers, services.root);
        this.panel = services.root.querySelector<HTMLElement>(PanelSelector);
        this.period = this.field("[data-ui-graph-plan-period]");
        this.objective = this.field("[data-ui-graph-plan-objective]");

        this.period?.addEventListener("change", () => this.choose());
        this.objective?.addEventListener("change", () => this.choose());

        // The panel is no component of its own, so the fold is kept under the canvas's name rather than by the framework's engine.
        if (this.panel !== null && services.context.store.read(services.root, StoreKey) === "folded") {
            this.panel.setAttribute(CollapsedAttribute, "");
            this.panel.querySelector(ToggleSelector)?.setAttribute("aria-expanded", "false");
        }
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

        // The framework's engine has folded it already, on the way down to the button; what is left is to remember it.
        if (target.closest(ToggleSelector) !== null) {
            this.services.context.store.write(this.services.root, StoreKey, this.panel.hasAttribute(CollapsedAttribute) ? "folded" : null);
            return true;
        }

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

        const removed = target.closest<HTMLElement>(`[${RemoveAttribute}]`)?.getAttribute(RemoveAttribute);

        if (removed === null || removed === undefined)
            return false;

        const request = this.host.request();

        this.host.change({ ...request, targets: request.targets.filter(entry => entry.resource !== removed) });
        return true;
    }

    /** The panel as the request and the plan stand now; drawn again only when either changed, so a field being typed into is not replaced under the caret. */
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

    private drawTargets(request: PlanRequest, readOnly: boolean): void {
        const list = this.panel!.querySelector<HTMLElement>(TargetsSelector);

        if (list === null)
            return;

        list.replaceChildren();

        for (const target of request.targets) {
            const resource = this.host.resource(target.resource);
            const row = document.createElement("div");
            const name = this.nameOf(target.resource, resource?.title ?? target.resource, resource?.image ?? resource?.icon ?? null);
            const amount = this.clone("graph-plan-amount");
            const remove = this.clone("graph-plan-remove");

            row.className = "ui-graph__plan-target";
            row.append(name);

            if (amount !== null) {
                this.services.context.properties.set(amount, "Value", target.amount);
                this.services.context.properties.set(amount, "IsReadOnly", readOnly);
                amount.addEventListener("change", () => this.setAmount(target.resource, this.services.context.values.read(amount)));
                row.append(amount);
            }

            if (remove !== null) {
                remove.setAttribute(RemoveAttribute, target.resource);
                this.services.context.properties.set(remove, "Enabled", !readOnly);
                row.append(remove);
            }

            list.append(row);
        }
    }

    /** A fresh copy of a framework component the canvas carries a template of. */
    private clone(region: string): HTMLElement | null {
        const template = this.services.root.querySelector<HTMLTemplateElement>(`template[data-ui-graph-editor="${CSS.escape(region)}"]`);
        const copy = template?.content.firstElementChild?.cloneNode(true);

        return copy instanceof HTMLElement ? copy : null;
    }

    /** An amount typed over a target: a number above zero is the new target, anything else leaves the old one standing. */
    private setAmount(resource: string, value: unknown): void {
        const amount = typeof value === "number" ? value : Number(String(value ?? "").replace(",", "."));
        const request = this.host.request();

        if (!Number.isFinite(amount) || amount <= 0) {
            // The field is put back to what the plan still says.
            this.drawnKey = "";
            this.services.draw();
            return;
        }

        this.host.change({ ...request, targets: request.targets.map(entry => (entry.resource === resource ? { ...entry, amount } : entry)) });
    }

    private drawMessage(request: PlanRequest, reading: PlanReading | null): void {
        const words = this.services.context.strings;
        const message = this.panel!.querySelector<HTMLElement>(MessageSelector);
        const totals = this.panel!.querySelector<HTMLElement>(TotalsSelector);

        if (message !== null) {
            message.hidden = reading !== null;
            const failure = request.targets.length > 0 ? this.host.failure() : null;

            message.toggleAttribute("data-ui-graph-plan-failed", failure !== null);
            message.textContent = reading !== null ? "" : words.text(failure === null ? "ui.graph.plan-empty" : `ui.graph.plan-${failure}`);
        }

        if (totals === null)
            return;

        totals.hidden = reading === null;

        if (reading !== null) {
            totals.textContent = words.text("ui.graph.plan-totals")
                .replace("{time}", formatTime(reading.plan.time, this.number))
                .replace("{raw}", this.number(reading.plan.raw))
                .replace("{cost}", this.number(reading.plan.cost));
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

            crafts.push(row(entry.craft, name, this.number(entry.runs), formatTime(entry.time, this.number), entry.workers === null ? "—" : String(entry.workers)));
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

    /** An item named as the sheet names it: its picture or its icon, and its title. */
    private nameOf(id: string, title: string, icon: string | null): HTMLElement {
        const name = document.createElement("span");
        const text = document.createElement("span");

        name.className = "ui-graph__plan-name";
        name.setAttribute("data-ui-graph-plan-item", id);
        // A name too long for its column ends in an ellipsis; the whole of it is what the pointer reads.
        name.title = title;

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
