// The production graph as a kind of canvas: resources as nodes, crafts as junctions (a sole maker collapsed onto its edges), edges
// per ingredient or product labelled with amounts, laid out in layers. Planning, the same sheet draws the plan — running crafts,
// totals for run numbers, targets marked — beside its panel (`plan-panel.ts`).

import type { CanvasKind, CanvasKindDefinition, CanvasServices, EdgeEnds, MenuTarget } from "../canvas/canvas-kind.ts";
import { checkMenuEntries, enableMenuEntries, showMenuEntries } from "../canvas/canvas-menus.ts";
import type { CanvasEdge, CanvasItem } from "../canvas/canvas-model.ts";
import { EditStructureAttribute, ModeAttribute, NodeShapeAttribute } from "../canvas/canvas-settings.ts";
import { Picker } from "../canvas/picker.ts";
import type { PickerEntry } from "../canvas/picker.ts";
import { renderCard } from "../graph/card-view.ts";
import { DraftedCollection } from "../graph/drafted-collection.ts";
import { DraftedLayeredKind } from "../graph/drafted-layered-kind.ts";
import { CaptionRoom, circleBox } from "../graph/layered-kind.ts";
import { LayeredSheet } from "../graph/layered-sheet.ts";
import { openChipField } from "../graph/link-drag.ts";
import type { GraphNodeShape } from "../graph/model.ts";
import { readShape } from "../graph/model.ts";
import { formatAmount, formatOutput, numberWriter, parsePositive, renderCraft } from "./craft-view.ts";
import type { NumberWriter } from "./craft-view.ts";
import { ProductionEditing } from "./production-editing.ts";
import type { CraftDraft, ProductionDocument, ProductionEdge, ProductionEntry, Resource, ResourceDraft, ResourceOutput } from "./model.ts";
import { drawProduction, ProductionDraftModel, readProductionDocument } from "./model.ts";
import { solvePlan } from "./plan.ts";
import type { PlanRequest } from "./plan.ts";
import { PlanPanel } from "./plan-panel.ts";
import { craftNote, edgeFlow, formatFlow, planEntries, readPlan, resourceChip } from "./plan-view.ts";
import type { PlanReading } from "./plan-view.ts";

const NodeGap = 32;
// A craft's layer stands between two resource layers, both sides carrying an amount label; the gap gives those labels room clear of both.
const LayerGap = 84;

// The kind's own menu entries, which the core's menus know nothing of.
const AddCommand = "graph:add-node";
const AmountCommand = "graph:amount";
const OutputCommand = "graph:output";
const TimeCommand = "graph:craft-time";
const DeleteEdgeCommand = "graph:delete-edge";
const TargetCommand = "graph:target";
const BoughtCommand = "graph:bought";
const TargetAttribute = "data-ui-graph-target";

export const ProductionKindDefinition: CanvasKindDefinition<ProductionDocument> = {
    name: "production",
    readDocument: readProductionDocument,
    create: services => new ProductionKind(services)
};

export class ProductionKind extends DraftedLayeredKind<ProductionDocument, ProductionEntry, ResourceDraft | CraftDraft, ProductionEdge> implements CanvasKind {
    // The page's culture, read once: every number the sheet writes, and how a typed one is read back.
    private readonly number: NumberWriter;
    private readonly decimalSeparator: string;
    protected readonly collection: DraftedCollection<ProductionDocument, ProductionEntry, ResourceDraft | CraftDraft>;
    protected readonly editing: ProductionEditing;
    protected readonly sheet: LayeredSheet;
    private readonly panel: PlanPanel;
    private readonly picker: Picker<PickerEntry> | null;

    // The crafts drawn as a mark on one edge: they are not items of the sheet, so they take no layer of their own.
    private collapsed = new Set<string>();
    private drawn: ProductionEntry[] = [];
    // What a resource with one sole maker says on itself (the run's amount and length), and the edge whose label it replaces, so
    // the number isn't repeated a finger's width apart.
    private outputs = new Map<string, ResourceOutput>();
    private quiet = new Set<string>();
    // The plan as it was last solved, while the graph plans and the targets can be reached; otherwise the catalogue is drawn as it is.
    private reading: PlanReading | null = null;
    private failure: "infeasible" | "unsettled" | null = null;

    public constructor(services: CanvasServices<ProductionDocument>) {
        super(services);
        this.number = numberWriter(services.context.numbers, services.root);
        this.decimalSeparator = services.context.numbers.readCulture(services.root).decimalSeparator;
        this.collection = new DraftedCollection(services, ProductionDraftModel, (id, at) => this.sheet.placeAt(id, at));
        this.editing = new ProductionEditing(services, this.collection, {
            collapsed: (id: string) => this.collapsed.has(id),
            craftEdge: (id: string) => this.links.find(link => link.craft === id)?.id,
            edge: id => this.linkById.get(id)
        });
        this.sheet = new LayeredSheet(services, {
            nodeIds: () => this.drawn.map(entry => entry.id),
            links: () => this.links,
            // A plan is a sheet made for what was asked: another set of nodes is another sheet, laid out whole and shown whole.
            layoutKey: () => (this.reading === null ? this.shape : `${this.shape}|${this.drawn.map(entry => entry.id).join(",")}`),
            // A circle wears its name outside its own box; the layout needs that room, or a layer's names would be written over the
            // next layer's circles.
            nodeBox: (_id, width, height, widest) => (this.shape === "icon" ? circleBox(width, height, widest) : { width, height }),
            // A resource's card is long enough to set its edges apart along, as a layered graph's; a craft's pill and a circle meet
            // their edges at the middle.
            spreadsEnds: id => this.shape === "card" && this.collection.item(id)?.kind !== "craft",
            footRoom: id => (this.shape === "icon" && this.collection.item(id)?.kind !== "craft" ? CaptionRoom : 0)
        }, { nodeGap: NodeGap, layerGap: LayerGap });
        this.panel = new PlanPanel(services, {
            request: () => this.document.plan,
            reading: () => this.reading,
            failure: () => this.failure,
            resource: id => this.resource(id),
            craft: id => {
                const entry = this.collection.item(id);

                return entry?.kind === "craft" ? entry : undefined;
            },
            change: next => this.changePlan(next),
            target: (resource, amount) => this.setTarget(resource, amount),
            pick: () => this.picker?.open(),
            show: id => this.show(id)
        });
        this.picker = Picker.create(services.root, () => this.targetChoices(), services.context.strings, services.context.dom, services.context.icons, services.context.roving, services.context.focus, services.context.shortcuts, entry => this.setTarget(entry.key, 1));
        this.refresh();
    }

    /** What the picker offers: every resource that is not a target yet, by the name and the picture the sheet wears. */
    private targetChoices(): PickerEntry[] {
        const targets = new Set(this.document.plan.targets.map(target => target.resource));

        return this.collection.items.flatMap(entry => (entry.kind === "resource" && !targets.has(entry.id) ? [{ key: entry.id, title: entry.title ?? entry.id, category: entry.category, icon: entry.image ?? entry.icon }] : []));
    }

    /** Whether the graph is put to planning rather than to its catalogue. */
    private get planning(): boolean {
        return this.services.root.getAttribute(ModeAttribute) === "plan";
    }

    /** Whether the graph lets its catalogue be changed, beside the places of its entries; a plan is read off the catalogue, never written to it. */
    protected get editable(): boolean {
        return !this.planning && !this.services.settings.readOnly && this.services.root.hasAttribute(EditStructureAttribute);
    }

    private get document(): ProductionDocument {
        return this.services.documentState.document;
    }

    private get shape(): GraphNodeShape {
        return readShape(this.services.root.getAttribute(NodeShapeAttribute)) ?? "icon";
    }

    /** The entries and edges drawn, the crafts drawn as marks, and the drafted entries the server moved — only when either side changed. */
    protected refresh(): void {
        const planning = this.planning;

        if (!this.collection.refresh(`${planning}|${this.services.settings.readOnly}`))
            return;

        const entries = this.collection.items;
        const plan = planning ? solvePlan(entries, this.document.plan) : null;

        this.reading = plan?.status === "Solved" ? readPlan(plan, this.document.plan.period) : null;
        this.failure = plan?.status === "Infeasible" ? "infeasible" : plan?.status === "Unsettled" ? "unsettled" : null;

        // A plan draws what takes part in it, and a plan with nothing solved draws nothing: the whole catalogue there read as a plan.
        const shown = this.reading !== null ? planEntries(entries, this.reading) : planning ? [] : entries;
        const drawing = drawProduction(shown);

        this.links = drawing.edges;
        this.collapsed = drawing.collapsed;
        this.outputs = drawing.outputs;
        this.quiet = drawing.quiet;
        this.drawn = shown.filter(entry => !this.collapsed.has(entry.id));
        this.linkById = new Map(this.links.map(link => [link.id, link]));
        this.sheet.structureChanged();
        this.panel.draw(this.collection.key);
    }

    private resource(id: string): Resource | undefined {
        const entry = this.collection.item(id);

        return entry?.kind === "resource" ? entry : undefined;
    }

    // --- the sheet -------------------------------------------------------------------------------------------------------------

    public renderItem(item: CanvasItem): HTMLElement {
        const entry = this.collection.item(item.id);
        const conflict = this.collection.conflict(item.id);

        const words = this.services.context.strings;

        if (entry?.kind === "craft") {
            const planned = this.reading?.crafts.get(entry.id);

            return renderCraft(item, entry, {
                tooltips: this.services.context.tooltips,
                word: words.text("ui.graph.recipe"),
                connectable: this.editable,
                conflict,
                note: planned === undefined ? null : craftNote(planned, words, this.number),
                resource: id => this.resource(id),
                number: this.number
            });
        }

        const resource = entry ?? { id: item.id, title: null, icon: null, color: null, tooltip: null, image: null, category: null, unit: null };

        const output = this.outputs.get(resource.id);
        const planned = this.reading?.resources.get(resource.id);

        // A resource is the graph's own node: its category is the card's subtitle, and its badge is what one run of its maker
        // gives — or, under a plan, how much the plan makes plus its maker's runs.
        const badge = planned !== undefined && this.reading !== null
            ? resourceChip(planned, resource.unit ?? null, output !== undefined && this.collapsed.has(output.craft) ? this.reading.crafts.get(output.craft) : undefined, words, this.number)
            : output === undefined ? null : formatOutput(output.amount, resource.unit ?? null, output.time, this.number);

        const card = renderCard(item, {
            id: resource.id,
            title: resource.title,
            subtitle: resource.category,
            icon: resource.icon,
            image: resource.image,
            shape: null,
            color: resource.color,
            badge,
            tooltip: resource.tooltip,
            links: []
        }, {
            icons: this.services.context.icons,
            tooltips: this.services.context.tooltips,
            urls: this.services.context.urls,
            shape: this.shape,
            connectable: this.editable,
            conflict
        });

        if (this.planning && this.document.plan.targets.some(target => target.resource === resource.id))
            card.setAttribute(TargetAttribute, "");

        return card;
    }

    public wordsChanged(): void {
        this.panel.wordsChanged();
    }

    /** An edge labelled with its amount past where edges leaving one resource have parted (two amounts would overlap beside it); the arrow tells a craft's inputs from its outputs. */
    public edgeEnds(edge: CanvasEdge): EdgeEnds | null {
        const link = this.linkById.get(edge.id);
        const ends = link === undefined ? null : this.sheet.ends(link);

        if (link === undefined || ends === null)
            return null;

        return {
            ...ends,
            arrow: true,
            // A craft drawn on its own edges is marked there, since it has no item of its own to mark.
            conflict: link.role === "recipe" && this.collection.conflict(link.craft) !== null,
            // What the run gives is said by the resource's own chip, so its edge says nothing: the same number twice, a finger's
            // width apart, is what read as noise.
            label: this.quiet.has(link.id) ? null : this.amountOf(link)
        };
    }

    /** What an edge says: one run's amount, or under a plan the craft's total flow, unless the resource's chip already states it; a drawn product edge always states its amount. */
    private amountOf(link: ProductionEdge): string | null {
        const unit = this.resource(link.resource)?.unit ?? null;
        const planned = this.reading?.crafts.get(link.craft);

        if (planned === undefined || this.reading === null)
            return formatAmount(link.amount, unit, this.number);

        return link.role === "product" ? formatFlow(planned.runs * link.amount, unit, this.number) : edgeFlow(planned.runs * link.amount, this.reading.resources.get(link.resource), unit, this.number);
    }

    // --- presses ---------------------------------------------------------------------------------------------------------------

    public isPanel(target: Element): boolean {
        return this.panel.contains(target);
    }

    public chrome(target: Element): boolean {
        return this.panel.press(target);
    }

    public escape(): void {
        this.picker?.close();
    }

    // --- the plan: what is asked of it, written into the document as any other edit is -----------------------------------------------

    private changePlan(next: PlanRequest): void {
        if (this.services.settings.readOnly)
            return;

        this.document.plan = next;
        this.services.documentState.edited();
    }

    /** A resource made a target, or its amount changed; no amount takes it off the targets. */
    private setTarget(resource: string, amount: number | null): void {
        const plan = this.document.plan;
        const others = plan.targets.filter(target => target.resource !== resource);

        if (amount === null)
            this.changePlan({ ...plan, targets: others });
        else if (others.length === plan.targets.length)
            this.changePlan({ ...plan, targets: [...plan.targets, { resource, amount }] });
        else
            this.changePlan({ ...plan, targets: plan.targets.map(target => (target.resource === resource ? { resource, amount } : target)) });
    }

    /** The field over a resource's own node: how much of it the plan has to reach; left empty, it is a target no more. */
    private editTarget(id: string): void {
        const rect = this.services.nodeRect(id);

        if (rect === null || this.resource(id) === undefined)
            return;

        const current = this.document.plan.targets.find(target => target.resource === id);

        openChipField(this.services, { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }, current === undefined ? "" : this.number(current.amount), value => {
            const amount = parsePositive(value, this.decimalSeparator);

            if (value.trim().length === 0)
                this.setTarget(id, null);
            else if (amount !== null)
                this.setTarget(id, amount);
        });
    }

    /** A row of the panel pressed: the item it names is chosen, and brought to the middle of the sheet when it is drawn. */
    private show(id: string): void {
        // A recipe drawn on its edges has no node of its own: its edges are what is chosen, and the resource they run into is shown.
        const recipe = this.collapsed.has(id) ? this.links.filter(link => link.craft === id) : [];
        const rect = this.services.nodeRect(recipe[0]?.product ?? id);

        if (rect === null)
            return;

        this.services.selection.clearSets();

        if (recipe.length === 0)
            this.services.selection.selectOnly(id);

        for (const link of recipe)
            this.services.selection.toggleEdge(link.id, true);

        // The keyboard stays where it was — on the row's name, a button — as a log line's or a parameter's name keeps it.
        this.services.view.centerOnRect(rect, 0, 0);
        this.services.draw();
    }

    // --- editing: the catalogue into the draft, when the graph allows it ----------------------------------------------------------

    /** Copies of the resources as the viewer's own; a recipe is its edges, so a copy of one without them would be nothing. */
    public duplicate(itemIds: ReadonlySet<string>): readonly string[] | null {
        const resources = [...itemIds].filter(id => this.canDuplicate(id));
        // A resource carries no edge of its own — its links are its recipes' amounts — so a copy has nothing to shape.
        const copies = resources.length === 0 ? [] : this.collection.duplicate(resources, this.services.settings.gridSize * 2, () => {});

        return copies.length === 0 ? null : copies;
    }

    public canDuplicate(id: string): boolean {
        return this.editable && this.resource(id) !== undefined;
    }

    /** A resource's edges are its recipes' amounts: each taken out as Delete takes one, a recipe left with nothing going with it. */
    public disconnect(itemIds: ReadonlySet<string>): boolean {
        const resources = new Set([...itemIds].filter(id => this.canDisconnect(id)));
        const edges = this.links.filter(link => resources.has(link.from) || resources.has(link.to));

        this.editing.removeEdges(new Set(edges.map(edge => edge.id)));

        return edges.length > 0;
    }

    /** On a resource with an edge; a recipe's edges are what it is, so Delete takes it rather than leaving it empty. */
    public canDisconnect(id: string): boolean {
        return this.editable && this.resource(id) !== undefined && this.links.some(link => link.from === id || link.to === id);
    }

    public remove(itemIds: ReadonlySet<string>, edgeIds: ReadonlySet<string>): boolean {
        if (!this.editable)
            return false;

        this.editing.removeEdges(edgeIds);
        this.editing.removeEntries(itemIds);

        return true;
    }

    public runCommand(key: string, target: MenuTarget | null): boolean {
        const own = key === AddCommand || key === AmountCommand || key === OutputCommand || key === TimeCommand || key === DeleteEdgeCommand;

        if (key === "graph:link-ingredient" || key === "graph:link-recipe") {
            if (this.editable)
                this.editing.answerLink(key === "graph:link-ingredient");

            return true;
        }

        if (this.collection.answerConflict(key, this.conflictOf(target)))
            return true;

        if (key === BoughtCommand) {
            if (this.planning && target?.kind === "node" && this.isMade(target.id)) {
                const plan = this.document.plan;
                const bought = plan.bought ?? [];

                this.changePlan({ ...plan, bought: bought.includes(target.id) ? bought.filter(id => id !== target.id) : [...bought, target.id] });
            }

            return true;
        }

        // A target is the plan's, not the catalogue's: it is named whether or not the structure may be edited.
        if (key === TargetCommand) {
            if (this.planning && target?.kind === "node")
                this.editTarget(target.id);

            return true;
        }

        if (!own || !this.editable)
            return own;

        switch (key) {
            case AddCommand:
                this.editing.addResource();
                break;

            case AmountCommand:
                if (target?.kind === "edge")
                    this.editing.editAmount(target.id);

                break;

            case OutputCommand:
                if (target?.kind === "edge")
                    this.editing.editOutput(target.id);

                break;

            // An edge pressed here belongs to a craft drawn on its edges: that craft's run is the one being timed.
            case TimeCommand:
                if (target !== null)
                    this.editing.editTime(target.kind === "node" ? target.id : this.linkById.get(target.id)?.craft ?? "");

                break;

            default:
                if (target?.kind === "edge") {
                    this.editing.removeEdges(new Set([target.id]));
                    this.services.documentState.edited();
                }

                break;
        }

        return true;
    }

    /** Whether anything in the catalogue makes the resource: one the plan may bring in rather than make. */
    private isMade(id: string): boolean {
        return this.collection.items.some(entry => entry.kind === "craft" && entry.products.some(amount => amount.resource === id && amount.amount > 0));
    }

    /** The drafted entry in conflict a menu was opened on: a resource or a craft itself, or the craft an edge is drawn for. */
    private conflictOf(target: MenuTarget | null): string | null {
        const id = target?.kind === "node" ? target.id : target?.kind === "edge" ? this.linkById.get(target.id)?.craft ?? null : null;

        return id !== null && this.collection.conflict(id) !== null ? id : null;
    }

    /** The structure's entries while the graph allows it; what a run gives and how long it lasts only where a craft was pressed. */
    public syncMenus(editable: boolean, target: MenuTarget | null): void {
        const allowed = editable && this.editable;

        this.collection.showConflictAnswers(editable && this.conflictOf(target) !== null);

        const craft = target?.kind === "node" && this.collection.item(target.id)?.kind === "craft";
        const recipe = target?.kind === "edge" && this.linkById.get(target.id)?.role === "recipe";

        for (const key of [AddCommand, AmountCommand, DeleteEdgeCommand])
            enableMenuEntries(this.services, key, allowed);

        const planned = this.planning && target?.kind === "node" && this.resource(target.id) !== undefined;
        const made = planned && this.isMade(target.id);

        // A plan's own entries stand only in the menu of a graph that plans: a target on any resource, Brought in on one something makes.
        showMenuEntries(this.services, TargetCommand, planned);
        showMenuEntries(this.services, BoughtCommand, made);
        enableMenuEntries(this.services, TargetCommand, editable && planned);
        enableMenuEntries(this.services, BoughtCommand, editable && made);
        checkMenuEntries(this.services, BoughtCommand, made && (this.document.plan.bought ?? []).includes(target.id));
        enableMenuEntries(this.services, OutputCommand, allowed && recipe);
        enableMenuEntries(this.services, TimeCommand, allowed && (craft || recipe));
    }
}
