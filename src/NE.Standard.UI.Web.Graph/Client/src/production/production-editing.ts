// What the viewer changes about a production catalogue (not places): entries added/renamed/recoloured/removed, links drawn (a new
// craft, an ingredient, a product), amounts and times edited, ingredients/products removed. Every change goes into the document's
// draft, by key, until the save.

import type { CanvasServices, KindDrag } from "../canvas/canvas-kind.ts";
import { openNamedMenu } from "../canvas/canvas-menus.ts";
import { freeKey } from "../graph/draft.ts";
import { beginLinkDrag, edgeMiddle, openChipField } from "../graph/link-drag.ts";
import { parsePositive } from "./craft-view.ts";
import type { Craft, CraftAmount, CraftDraft, ProductionDocument, ProductionEdge, ProductionEntry, ResourceDraft } from "./model.ts";
import { craftDraft, readSpan, resourceDraft, writeSpan } from "./model.ts";

/** What the editing reaches on the kind: the entries as drawn and as the server has them, and an edge by its key. */
export type ProductionEditingHost = {
    entries(): readonly ProductionEntry[];
    /** Whether a craft is drawn on its own edges rather than as a junction of its own. */
    collapsed(id: string): boolean;
    /** One of the edges a craft is drawn as, for a craft that has no item of its own. */
    craftEdge(id: string): string | undefined;
    entry(id: string): ProductionEntry | undefined;
    serverEntry(id: string): ProductionEntry | undefined;
    edge(id: string): ProductionEdge | undefined;
};

// The menu a dropped link asks its question in, as the renderer names it.
const LinkMenuName = "graph-link-menu";

export class ProductionEditing {
    private readonly services: CanvasServices<ProductionDocument>;
    private readonly host: ProductionEditingHost;

    public constructor(services: CanvasServices<ProductionDocument>, host: ProductionEditingHost) {
        this.services = services;
        this.host = host;
    }

    private get document(): ProductionDocument {
        return this.services.documentState.document;
    }

    /** The draft entry for a resource or craft, created from what's drawn on first change, with the server's kept beside it to tell a later server change apart. */
    private draftOf(id: string): ResourceDraft | CraftDraft | null {
        const draft = this.document.draft;
        const existing = draft.resources.find(entry => entry.id === id) ?? draft.crafts.find(entry => entry.id === id);

        if (existing !== undefined)
            return existing;

        const entry = this.host.entry(id);

        if (entry === undefined)
            return null;

        const server = this.host.serverEntry(id);
        const baseline = server === undefined ? null : JSON.stringify(server);

        if (entry.kind === "craft") {
            const craft: CraftDraft = { ...craftDraft(entry), baseline };

            draft.crafts.push(craft);
            return craft;
        }

        const resource: ResourceDraft = { ...resourceDraft(entry), baseline };

        draft.resources.push(resource);
        return resource;
    }

    private craftOf(id: string): CraftDraft | null {
        const entry = this.host.entry(id)?.kind === "craft" ? this.draftOf(id) : null;

        return entry === null ? null : entry as CraftDraft;
    }

    public rename(id: string, title: string | null): void {
        const entry = this.draftOf(id);

        if (entry !== null)
            entry.title = title;
    }

    public paint(id: string, color: string | null): void {
        const entry = this.draftOf(id);

        if (entry !== null)
            entry.color = color;
    }

    /** A resource of the viewer's own where the pointer last stood, chosen, and named at once. */
    public addResource(): void {
        const id = freeKey("resource", this.keys());
        const at = this.services.pointerScene();

        this.document.draft.resources.push({
            id,
            title: this.services.context.strings.text("ui.graph.new-resource"),
            icon: null,
            color: null,
            tooltip: null,
            image: null,
            category: null,
            unit: null,
            cost: null,
            created: true,
            baseline: null
        });

        this.document.nodes.push({ id, x: at.x, y: at.y, pinned: false });
        this.services.selection.selectOnly(id);
        this.services.documentState.edited();
        this.services.renameItem(id);
    }

    private keys(): Set<string> {
        return new Set(this.host.entries().map(entry => entry.id));
    }

    /** Entries taken out: one the viewer added simply goes from the draft, and the server's own is marked removed for the save. */
    public removeEntries(ids: ReadonlySet<string>): void {
        const draft = this.document.draft;

        for (const id of ids) {
            const created = [...draft.resources, ...draft.crafts].some(entry => entry.id === id && entry.created);

            draft.resources = draft.resources.filter(entry => entry.id !== id);
            draft.crafts = draft.crafts.filter(entry => entry.id !== id);

            if (!created && this.host.serverEntry(id) !== undefined && !draft.removed.includes(id))
                draft.removed.push(id);
        }
    }

    /** Ingredients and products taken out of their crafts; an edge of a craft drawn on its own edges is one of its ingredients, and a craft left with none goes with its last edge. */
    public removeEdges(ids: ReadonlySet<string>): void {
        const emptied = new Set<string>();

        for (const id of ids) {
            const edge = this.host.edge(id);
            const craft = edge === undefined ? null : this.craftOf(edge.craft);

            if (edge === undefined || craft === null)
                continue;

            if (edge.role === "product")
                craft.products = craft.products.filter(amount => amount.resource !== edge.resource);
            else
                craft.ingredients = craft.ingredients.filter(amount => amount.resource !== edge.resource);

            if (craft.ingredients.length === 0 && craft.products.length === 0)
                emptied.add(craft.id);
            else if (edge.role === "recipe" && craft.ingredients.length === 0)
                emptied.add(craft.id);
        }

        if (emptied.size > 0)
            this.removeEntries(emptied);
    }

    /** A press on a handle pulls a link: two resources make a new craft, resource-to-craft an ingredient, craft-to-resource a product. A craft never links to a craft, and names a resource once per side. */
    public beginLink(handle: HTMLElement): KindDrag | null {
        return beginLinkDrag(this.services, handle, {
            canLink: (from, to) => this.canLink(from, to),
            link: (from, to, at) => this.link(from, to, at)
        });
    }

    // The link a viewer dropped on a resource one recipe already makes, while its menu asks which of the two they meant.
    private asked: { readonly from: string; readonly to: string; readonly craft: string } | null = null;

    private canLink(from: string, to: string): boolean {
        const source = this.host.entry(from);
        const target = this.host.entry(to);

        if (source === undefined || target === undefined)
            return false;

        if (source.kind === "resource")
            return target.kind === "resource" || !target.ingredients.some(amount => amount.resource === from);

        return target.kind === "resource" && !source.products.some(amount => amount.resource === to);
    }

    private link(from: string, to: string, at: { readonly clientX: number; readonly clientY: number }): void {
        if (!this.canLink(from, to))
            return;

        const source = this.host.entry(from)!;
        const target = this.host.entry(to)!;

        if (source.kind === "resource" && target.kind === "resource") {
            const recipe = this.soleRecipe(from, to);

            // A recipe drawn as its edges has no junction to drop the link on; only the viewer knows if it's another ingredient or a new
            // recipe, answered via one of the menu's two commands (dismissed, the link is dropped).
            if (recipe !== null) {
                this.asked = { from, to, craft: recipe };
                openNamedMenu(this.services.root, LinkMenuName, at.clientX, at.clientY);
                return;
            }

            this.addRecipe(from, to);
        }
        else if (target.kind === "craft") {
            const craft = this.craftOf(to)!;

            craft.ingredients = [...craft.ingredients, { resource: from, amount: 1 }];
        }
        else {
            const craft = this.craftOf(from)!;

            craft.products = [...craft.products, { resource: to, amount: 1 }];
        }

        this.services.documentState.edited();
    }

    /** The one recipe that makes a resource, where it is drawn as its edges and does not take the other resource already. */
    private soleRecipe(from: string, to: string): string | null {
        const makers = this.host.entries().filter((entry): entry is Craft => entry.kind === "craft" && entry.products.some(amount => amount.resource === to));

        return makers.length === 1 && this.host.collapsed(makers[0].id) && !makers[0].ingredients.some(amount => amount.resource === from) ? makers[0].id : null;
    }

    /** A craft of one of each, placed by the layout between the two it joins. */
    private addRecipe(from: string, to: string): void {
        this.document.draft.crafts.push({
            id: freeKey("craft", this.keys()),
            title: null,
            icon: null,
            color: null,
            tooltip: null,
            ingredients: [{ resource: from, amount: 1 }],
            products: [{ resource: to, amount: 1 }],
            time: writeSpan(1),
            created: true,
            baseline: null
        });
    }

    /** What the viewer answered about the link they dropped: an ingredient of the recipe that was there, or a recipe of its own. */
    public answerLink(ingredient: boolean): void {
        const asked = this.asked;

        this.asked = null;

        if (asked === null || !this.canLink(asked.from, asked.to))
            return;

        const craft = ingredient ? this.craftOf(asked.craft) : null;

        if (craft !== null)
            craft.ingredients = [...craft.ingredients, { resource: asked.from, amount: 1 }];
        else
            this.addRecipe(asked.from, asked.to);

        this.services.documentState.edited();
    }

    /** Opens the field over an edge's amount: what one run takes of the resource it leaves, or gives on a product's edge; a non-positive value is refused. */
    public editAmount(id: string): void {
        this.editSide(id, "in");
    }

    /** The field over what a recipe drawn as a mark gives: the amount at the far end of its edge. */
    public editOutput(id: string): void {
        this.editSide(id, "out");
    }

    private editSide(id: string, side: "in" | "out"): void {
        const edge = this.host.edge(id);
        const middle = edgeMiddle(this.services, id);

        if (edge === undefined || middle === null)
            return;

        const taking = side === "in" ? edge.role !== "product" : edge.role === "product";
        const resource = side === "in" ? edge.resource : edge.product ?? edge.resource;
        const current = side === "in" ? edge.amount : edge.output ?? edge.amount;

        openChipField(this.services, middle, String(current), value => {
            const amount = parsePositive(value);
            const craft = amount === null ? null : this.craftOf(edge.craft);

            if (amount === null || craft === null)
                return;

            const write = (amounts: CraftAmount[]): CraftAmount[] => amounts.map(candidate => (candidate.resource === resource ? { ...candidate, amount } : candidate));

            if (taking)
                craft.ingredients = write(craft.ingredients);
            else
                craft.products = write(craft.products);

            this.services.documentState.edited();
        });
    }

    /** The field over how long a run of a craft lasts, in seconds: over the craft's own pill, or over an edge it is drawn as. */
    public editTime(id: string): void {
        const entry = this.host.entry(id);
        const rect = this.host.collapsed(id) ? null : this.services.nodeRect(id);
        const edge = this.host.craftEdge(id);
        const at = rect !== null ? { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 } : edge === undefined ? null : edgeMiddle(this.services, edge);

        if (at === null || entry?.kind !== "craft")
            return;

        openChipField(this.services, at, String(entry.time), value => {
            const seconds = parsePositive(value);
            const craft = seconds === null ? null : this.craftOf(id);

            if (seconds === null || craft === null || readSpan(craft.time) === seconds)
                return;

            craft.time = writeSpan(seconds);
            this.services.documentState.edited();
        });
    }
}
