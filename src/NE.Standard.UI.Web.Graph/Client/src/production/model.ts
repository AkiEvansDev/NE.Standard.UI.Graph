// The production graph's catalogue off the wire (resources and crafts in one collection, told apart by kind), its document (places,
// draft, plan request), and the bipartite graph the layout sees: resource edges into crafts, craft edges out to resources.

import type { CanvasEdge, CanvasGroup, CanvasItem } from "../canvas/canvas-model.ts";
import { readCanvasEdge, readDocumentKey, readDraftMarks, readGroup, readPlacement, readText } from "../canvas/canvas-model.ts";
import type { DraftEntry, DraftModel } from "../graph/draft.ts";
import { overlay } from "../graph/draft.ts";
import type { PlanObjective, PlanPeriod, PlanRequest } from "./plan.ts";

export type CraftAmount = {
    readonly resource: string;
    readonly amount: number;
};

export type Resource = {
    readonly kind: "resource";
    readonly id: string;
    readonly title: string | null;
    readonly icon: string | null;
    readonly color: string | null;
    readonly tooltip: string | null;
    readonly image: string | null;
    readonly category: string | null;
    readonly unit: string | null;
    readonly cost: number | null;
};

export type Craft = {
    readonly kind: "craft";
    readonly id: string;
    readonly title: string | null;
    readonly icon: string | null;
    readonly color: string | null;
    readonly tooltip: string | null;
    readonly ingredients: readonly CraftAmount[];
    readonly products: readonly CraftAmount[];
    /** How long one run lasts, in seconds. */
    readonly time: number;
};

export type ProductionEntry = Resource | Craft;

/** One drawn edge: an ingredient into a craft, a product out of one, or — for a craft collapsed onto its edges — an ingredient running straight into its sole resource. A recipe edge is keyed by its craft. */
export type ProductionEdge = {
    readonly id: string;
    readonly from: string;
    readonly to: string;
    readonly craft: string;
    /** The resource the edge's amount counts: the ingredient's, for a recipe edge. */
    readonly resource: string;
    readonly role: "ingredient" | "product" | "recipe";
    readonly amount: number;
    /** What one run gives of the resource at the edge's end; a recipe edge alone has one. */
    readonly output?: number;
    /** The resource one run gives, and how long it lasts; a recipe edge alone has them. */
    readonly product?: string;
    readonly time?: number;
};

/** A resource as the draft holds it, in the server's own spelling so a save reads it as it reads a resource. */
export type ResourceDraft = DraftEntry & {
    title: string | null;
    icon: string | null;
    color: string | null;
    tooltip: string | null;
    image: string | null;
    category: string | null;
    unit: string | null;
    cost: number | null;
};

/** A craft as the draft holds it: its time as the server writes a span, `hh:mm:ss.fffffff`. */
export type CraftDraft = DraftEntry & {
    title: string | null;
    icon: string | null;
    color: string | null;
    tooltip: string | null;
    ingredients: CraftAmount[];
    products: CraftAmount[];
    time: string;
};

export type ProductionDraft = {
    resources: ResourceDraft[];
    crafts: CraftDraft[];
    removed: string[];
};

export type ProductionDocument = {
    nodes: CanvasItem[];
    edges: CanvasEdge[];
    groups: CanvasGroup[];
    draft: ProductionDraft;
    plan: PlanRequest;
    key: string | null;
};

function emptyProductionDocument(): ProductionDocument {
    return { nodes: [], edges: [], groups: [], draft: { resources: [], crafts: [], removed: [] }, plan: { targets: [], period: "Once", objective: "LeastRaw", bought: [] }, key: null };
}

/** A document as it came off the wire, with every part present and every number a number. */
export function readProductionDocument(value: unknown): ProductionDocument {
    const source = value as Partial<ProductionDocument> | null | undefined;

    if (source === null || source === undefined || typeof source !== "object")
        return emptyProductionDocument();

    const draft = source.draft as Partial<ProductionDraft> | null | undefined;

    return {
        nodes: (source.nodes ?? []).map(readPlacement),
        edges: (source.edges ?? []).map(readCanvasEdge),
        groups: (source.groups ?? []).map(readGroup),
        draft: {
            resources: (draft?.resources ?? []).flatMap(entry => {
                const resource = readResource(entry);

                return resource === null ? [] : [{ ...resourceDraft(resource), ...readDraftMarks(entry) }];
            }),
            crafts: (draft?.crafts ?? []).flatMap(entry => {
                const craft = readCraft(entry);

                return craft === null ? [] : [{ ...craftDraft(craft), ...readDraftMarks(entry) }];
            }),
            removed: (draft?.removed ?? []).map(id => String(id))
        },
        plan: readPlanRequest(source.plan),
        key: readDocumentKey(source)
    };
}

/** What was asked of the plan, off the wire: an enum by the server's name for it, in whichever case it came. */
function readPlanRequest(value: unknown): PlanRequest {
    const source = (value ?? {}) as { targets?: unknown; period?: unknown; objective?: unknown; bought?: unknown };
    const period = String(source.period ?? "").toLowerCase();
    const objective = String(source.objective ?? "").toLowerCase();

    return {
        targets: readAmounts(source.targets),
        period: (period === "minute" ? "Minute" : period === "hour" ? "Hour" : "Once") satisfies PlanPeriod,
        objective: (objective === "leasttime" ? "LeastTime" : objective === "leastcost" ? "LeastCost" : "LeastRaw") satisfies PlanObjective,
        bought: Array.isArray(source.bought) ? source.bought.map(id => String(id)) : []
    };
}

/** One entry off the wire, or nothing for a value with no key or of neither kind. */
export function readEntry(value: unknown): ProductionEntry | null {
    if (value === null || typeof value !== "object")
        return null;

    const kind = (value as { kind?: unknown }).kind;

    if (kind === "Craft" || kind === "craft" || kind === 1)
        return readCraft(value);

    return kind === "Resource" || kind === "resource" || kind === 0 ? readResource(value) : null;
}

function readResource(value: unknown): Resource | null {
    const source = value as Record<string, unknown>;

    if (typeof source.id !== "string" || source.id.length === 0)
        return null;

    return {
        kind: "resource",
        id: source.id,
        title: readText(source.title),
        icon: readText(source.icon),
        color: readText(source.color),
        tooltip: readText(source.tooltip),
        image: readText(source.image),
        category: readText(source.category),
        unit: readText(source.unit),
        cost: typeof source.cost === "number" && Number.isFinite(source.cost) ? source.cost : null
    };
}

function readCraft(value: unknown): Craft | null {
    const source = value as Record<string, unknown>;

    if (typeof source.id !== "string" || source.id.length === 0)
        return null;

    return {
        kind: "craft",
        id: source.id,
        title: readText(source.title),
        icon: readText(source.icon),
        color: readText(source.color),
        tooltip: readText(source.tooltip),
        ingredients: readAmounts(source.ingredients),
        products: readAmounts(source.products),
        time: readSpan(source.time)
    };
}

function readAmounts(value: unknown): CraftAmount[] {
    if (!Array.isArray(value))
        return [];

    return value.flatMap(entry => {
        const amount = entry as Record<string, unknown> | null;

        return amount !== null && typeof amount === "object" && typeof amount.resource === "string"
            ? [{ resource: amount.resource, amount: Number(amount.amount) || 0 }]
            : [];
    });
}

/** A span as the server writes one — `[-][d.]hh:mm:ss[.fffffff]` — or a number of seconds, as seconds. */
export function readSpan(value: unknown): number {
    if (typeof value === "number")
        return Number.isFinite(value) ? value : 0;

    if (typeof value !== "string")
        return 0;

    const match = /^(-)?(?:(\d+)\.)?(\d+):(\d+):(\d+(?:\.\d+)?)$/.exec(value.trim());

    if (match === null)
        return 0;

    const seconds = Number(match[2] ?? 0) * 86400 + Number(match[3]) * 3600 + Number(match[4]) * 60 + Number(match[5]);

    return match[1] === "-" ? -seconds : seconds;
}

/** Seconds as the server reads a span back. */
export function writeSpan(seconds: number): string {
    const ticks = Math.round(Math.max(0, seconds) * 1e7);
    const days = Math.floor(ticks / (86400 * 1e7));
    const rest = ticks - days * 86400 * 1e7;
    const hours = Math.floor(rest / (3600 * 1e7));
    const minutes = Math.floor((rest % (3600 * 1e7)) / (60 * 1e7));
    const whole = Math.floor((rest % (60 * 1e7)) / 1e7);
    const fraction = rest % 1e7;
    const clock = `${pad(hours)}:${pad(minutes)}:${pad(whole)}${fraction === 0 ? "" : `.${String(fraction).padStart(7, "0")}`}`;

    return days > 0 ? `${days}.${clock}` : clock;
}

function pad(value: number): string {
    return String(value).padStart(2, "0");
}

export function resourceDraft(resource: Resource): ResourceDraft {
    return {
        id: resource.id,
        title: resource.title,
        icon: resource.icon,
        color: resource.color,
        tooltip: resource.tooltip,
        image: resource.image,
        category: resource.category,
        unit: resource.unit,
        cost: resource.cost,
        created: false,
        baseline: null
    };
}

export function craftDraft(craft: Craft): CraftDraft {
    return {
        id: craft.id,
        title: craft.title,
        icon: craft.icon,
        color: craft.color,
        tooltip: craft.tooltip,
        ingredients: craft.ingredients.map(amount => ({ ...amount })),
        products: craft.products.map(amount => ({ ...amount })),
        time: writeSpan(craft.time),
        created: false,
        baseline: null
    };
}

/** The entries to draw: the server's with the draft laid over by key; drafted resources and crafts are two lists in the draft but one catalogue here. */
export function overlayDraft(server: readonly ProductionEntry[], draft: ProductionDraft): ProductionEntry[] {
    const entries: (ResourceDraft | CraftDraft)[] = [...draft.resources, ...draft.crafts];
    const crafts = new Set(draft.crafts);

    return overlay(server, entries, draft.removed, entry => (crafts.has(entry as CraftDraft) ? readCraft(entry)! : readResource(entry)!));
}

/**
 * A craft with removed resources' amounts dropped, or nothing when it names none. It goes when left with no ingredient or nothing at
 * all (as `UIProductionDraft.ApplyTo` holds, both held to `tests/draft-corpus.json`): taking nothing it would make its products from
 * nothing, and one drawn on its edges would have none to be drawn on.
 */
export function withoutResources(craft: { readonly ingredients: readonly CraftAmount[]; readonly products: readonly CraftAmount[] }, removed: ReadonlySet<string>): { readonly ingredients: CraftAmount[]; readonly products: CraftAmount[]; readonly goes: boolean } | null {
    const ingredients = craft.ingredients.filter(amount => !removed.has(amount.resource));
    const products = craft.products.filter(amount => !removed.has(amount.resource));
    const lostIngredient = ingredients.length !== craft.ingredients.length;

    if (!lostIngredient && products.length === craft.products.length)
        return null;

    return { ingredients, products, goes: ingredients.length === 0 && (lostIngredient || products.length === 0) };
}

/** How the production graph keeps its draft: resources and crafts in lists of their own, one catalogue once laid over the server's. */
export const ProductionDraftModel: DraftModel<ProductionDocument, ProductionEntry, ResourceDraft | CraftDraft> = {
    read: readEntry,
    overlay: (server, document) => overlayDraft(server, document.draft),
    lists: document => [document.draft.resources, document.draft.crafts],
    listOf: (document, entry) => (isCraftDraft(entry) ? document.draft.crafts : document.draft.resources),
    toEntry: entry => (entry.kind === "craft" ? craftDraft(entry) : resourceDraft(entry)),
    prefix: entry => (isCraftDraft(entry) ? "craft" : "resource"),
    rekey: rekeyEntry
};

function isCraftDraft(entry: ResourceDraft | CraftDraft): entry is CraftDraft {
    return "ingredients" in entry;
}

/** The amounts, edge bends and plan that name the viewer's resource or craft, moved to its new key. */
function rekeyEntry(document: ProductionDocument, from: string, to: string): void {
    const move = (id: string): string => (id === from ? to : id);
    const renamed = new Map<string, string>();

    for (const craft of document.draft.crafts) {
        const was = craft.id === to ? from : craft.id;

        if (was !== craft.id || craft.ingredients.some(amount => amount.resource === from) || craft.products.some(amount => amount.resource === from)) {
            for (const amount of craft.ingredients)
                renamed.set(ingredientEdge(was, amount.resource), ingredientEdge(craft.id, move(amount.resource)));

            for (const amount of craft.products)
                renamed.set(productEdge(was, amount.resource), productEdge(craft.id, move(amount.resource)));

            craft.ingredients = craft.ingredients.map(amount => ({ ...amount, resource: move(amount.resource) }));
            craft.products = craft.products.map(amount => ({ ...amount, resource: move(amount.resource) }));
        }
    }

    for (const edge of document.edges)
        edge.id = renamed.get(edge.id) ?? edge.id;

    const plan = document.plan;

    document.plan = { ...plan, targets: plan.targets.map(target => ({ ...target, resource: move(target.resource) })), bought: (plan.bought ?? []).map(move) };
}

/** How the catalogue is drawn: its edges, the crafts that took no room of their own, and what each resource says on itself. */
export type ProductionDrawing = {
    readonly edges: ProductionEdge[];
    /** The crafts drawn on their own edges rather than as a junction: they are not items of the sheet. */
    readonly collapsed: Set<string>;
    /** What a resource exactly one craft makes says on itself: the run's own amount and length. */
    readonly outputs: Map<string, ResourceOutput>;
    /** The product edges whose amount that resource's chip says instead. */
    readonly quiet: Set<string>;
};

/** The catalogue as drawn: a craft alone making one resource takes no room of its own — ingredients run straight into it, which states the run's output. Every other craft is a junction, since only a junction ties its edges to one run. */
export function drawProduction(entries: readonly ProductionEntry[]): ProductionDrawing {
    const resources = new Set(entries.filter(entry => entry.kind === "resource").map(entry => entry.id));
    const crafts = entries.filter((entry): entry is Craft => entry.kind === "craft");
    const makers = new Map<string, Craft[]>();

    for (const craft of crafts) {
        for (const product of craft.products) {
            if (!resources.has(product.resource))
                continue;

            const list = makers.get(product.resource);

            if (list === undefined)
                makers.set(product.resource, [craft]);
            else
                list.push(craft);
        }
    }

    const edges: ProductionEdge[] = [];
    const collapsed = new Set<string>();
    const outputs = new Map<string, ResourceOutput>();
    const quiet = new Set<string>();

    for (const craft of crafts) {
        const ingredients = craft.ingredients.filter(amount => resources.has(amount.resource));
        const products = craft.products.filter(amount => resources.has(amount.resource));
        const only = products.length === 1 && (makers.get(products[0].resource) ?? []).length === 1;

        if (only) {
            collapsed.add(craft.id);

            for (const ingredient of ingredients) {
                edges.push({
                    id: ingredientEdge(craft.id, ingredient.resource),
                    from: ingredient.resource,
                    to: products[0].resource,
                    craft: craft.id,
                    resource: ingredient.resource,
                    role: "recipe",
                    amount: ingredient.amount,
                    output: products[0].amount,
                    product: products[0].resource,
                    time: craft.time
                });
            }

            continue;
        }

        for (const ingredient of ingredients)
            edges.push({ id: ingredientEdge(craft.id, ingredient.resource), from: ingredient.resource, to: craft.id, craft: craft.id, resource: ingredient.resource, role: "ingredient", amount: ingredient.amount });

        for (const product of products)
            edges.push({ id: productEdge(craft.id, product.resource), from: craft.id, to: product.resource, craft: craft.id, resource: product.resource, role: "product", amount: product.amount });
    }

    // A resource one craft alone makes says that run on itself; where the craft is a junction, its product edge then says nothing.
    for (const [resource, made] of makers) {
        if (made.length !== 1)
            continue;

        const craft = made[0];
        const amount = craft.products.find(product => product.resource === resource)!.amount;

        outputs.set(resource, { craft: craft.id, amount, time: craft.time, edge: productEdge(craft.id, resource) });

        if (!collapsed.has(craft.id))
            quiet.add(productEdge(craft.id, resource));
    }

    return { edges, collapsed, outputs, quiet };
}

function ingredientEdge(craft: string, resource: string): string {
    return `${craft}<${resource}`;
}

function productEdge(craft: string, resource: string): string {
    return `${craft}>${resource}`;
}

/** What one run of the single craft that makes a resource gives of it, and how long that run lasts. */
export type ResourceOutput = {
    readonly craft: string;
    readonly amount: number;
    readonly time: number;
    /** The product edge the amount is written on, whose label the resource's own chip stands in place of. */
    readonly edge: string;
};
