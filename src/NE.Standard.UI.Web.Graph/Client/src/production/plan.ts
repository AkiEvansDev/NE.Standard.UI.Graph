// The production plan: a browser port of `UIProductionPlanner`. Solves for how many runs of each craft meet the targets — every
// made resource must come out at least at target — via simplex; cross-checked against `tests/plan-corpus.json`.

import type { Craft, CraftAmount, ProductionEntry, Resource } from "./model.ts";
import { minimise } from "./simplex.ts";

const Eps = 1e-9;

// The server's plan holds a time in a TimeSpan and its workers in an int; past either, both ports answer the most it can hold.
const LongestTime = 922_337_203_685.477_5;
const MostWorkers = 2_147_483_647;

export type PlanPeriod = "Once" | "Minute" | "Hour";
export type PlanObjective = "LeastRaw" | "LeastTime" | "LeastCost";

type PlanTarget = {
    readonly resource: string;
    readonly amount: number;
};

/** What the viewer asked for, in the server's own spelling so a save reads it as it reads the rest of the document. */
export type PlanRequest = {
    readonly targets: readonly PlanTarget[];
    /** What the amounts are counted over: once, or every minute or hour of a line that keeps running. */
    readonly period: PlanPeriod;
    readonly objective: PlanObjective;
    /** The made resources the plan brings in rather than makes: what makes them is left out, and they are counted with the sources. */
    readonly bought?: readonly string[];
};

export type PlanCraft = {
    readonly craft: string;
    readonly runs: number;
    /** The runs' time together, in seconds. */
    readonly time: number;
    /** How many of the craft, side by side, keep up with a period's runs; nothing for a plan made once. */
    readonly workers: number | null;
};

export type PlanResource = {
    readonly resource: string;
    /** Whether nothing makes it: what is taken of it is brought in. */
    readonly source: boolean;
    readonly target: number;
    readonly produced: number;
    readonly consumed: number;
    /** What is made and neither asked for nor taken further: a by-product, or a run that gives more than is needed. */
    readonly surplus: number;
};

/** How much of a source has to be brought in; nothing for a resource the plan makes — the server's `UIPlannedResource.BroughtIn`. */
export function broughtIn(resource: PlanResource): number {
    return resource.source ? resource.consumed + resource.target : 0;
}

export type Plan = {
    /**
     * `Empty` with no target to reach, `Infeasible` when no runs reach them — a cycle that takes more than it gives — and `Unsettled`
     * when the solver found no answer it can stand by.
     */
    readonly status: "Empty" | "Solved" | "Infeasible" | "Unsettled";
    readonly crafts: readonly PlanCraft[];
    readonly resources: readonly PlanResource[];
    /** Every run's time together, in seconds. */
    readonly time: number;
    /** What is brought in of every source together, and what it costs — a source with no cost counting as one. */
    readonly raw: number;
    readonly cost: number;
};

function periodSeconds(period: PlanPeriod): number | null {
    return period === "Minute" ? 60 : period === "Hour" ? 3600 : null;
}

export function solvePlan(entries: readonly ProductionEntry[], request: PlanRequest): Plan {
    const resources = new Map<string, Resource>();

    for (const entry of entries) {
        if (entry.kind === "resource" && !resources.has(entry.id))
            resources.set(entry.id, entry);
    }

    const crafts = entries.filter((entry): entry is Craft => entry.kind === "craft");
    const bought = new Set(request.bought ?? []);
    const makers = new Map<string, Craft[]>();

    for (const craft of crafts) {
        for (const product of amountsOf(craft.products, resources)) {
            // A resource the plan brings in has nothing that makes it, as far as the plan goes.
            if (bought.has(product.resource))
                continue;

            const list = makers.get(product.resource);

            if (list === undefined)
                makers.set(product.resource, [craft]);
            else if (!list.includes(craft))
                list.push(craft);
        }
    }

    const targets = new Map<string, number>();

    for (const target of request.targets) {
        if (resources.has(target.resource) && target.amount > Eps)
            targets.set(target.resource, (targets.get(target.resource) ?? 0) + target.amount);
    }

    if (targets.size === 0)
        return { status: "Empty", crafts: [], resources: [], time: 0, raw: 0, cost: 0 };

    // Everything that can help: the crafts that make something needed, and what those take in their turn.
    const needed = new Set<string>(targets.keys());
    const helping = new Set<Craft>();
    const queue = [...needed];

    for (let next = queue.shift(); next !== undefined; next = queue.shift()) {
        for (const craft of makers.get(next) ?? []) {
            if (helping.has(craft))
                continue;

            helping.add(craft);

            for (const ingredient of amountsOf(craft.ingredients, resources)) {
                if (!needed.has(ingredient.resource)) {
                    needed.add(ingredient.resource);
                    queue.push(ingredient.resource);
                }
            }
        }
    }

    // In the catalogue's order, which is what both ports share.
    const columns = crafts.filter(craft => helping.has(craft));
    const made = [...resources.keys()].filter(id => needed.has(id) && makers.has(id));
    const rows = made.map(id => columns.map(craft => amountOf(craft.products, id) - amountOf(craft.ingredients, id)));
    const atLeast = made.map(id => targets.get(id) ?? 0);
    const weigh = request.objective === "LeastCost";
    const raw = columns.map(craft => rawOf(craft, resources, makers, false));
    const priced = weigh ? columns.map(craft => rawOf(craft, resources, makers, true)) : raw;
    const time = columns.map(craft => Math.max(0, craft.time));
    const runs = request.objective === "LeastTime"
        ? minimise({ rows, atLeast, cost: time, tieCost: raw })
        : minimise({ rows, atLeast, cost: priced, tieCost: time });

    if (!Array.isArray(runs))
        return { status: runs === "infeasible" ? "Infeasible" : "Unsettled", crafts: [], resources: [], time: 0, raw: 0, cost: 0 };

    // Made once, a craft runs a whole number of times; counted over a period, a run and a half a minute is a rate like any other.
    const whole = request.period === "Once" ? wholeRuns(rows, atLeast, runs) : null;

    return readPlan(resources, makers, targets, columns, whole ?? runs, periodSeconds(request.period));
}

/**
 * Rounds runs to whole numbers, filling any shortfall with whole runs of the biggest producer until none is short (the rest is
 * surplus); returns null if that doesn't settle, and the fractional answer stands instead.
 */
function wholeRuns(rows: readonly (readonly number[])[], atLeast: readonly number[], runs: readonly number[]): number[] | null {
    const whole = runs.map(count => (count <= Eps ? 0 : Math.ceil(count - 1e-6)));

    for (let pass = 0; pass < 1000; pass++) {
        let short = false;

        for (let row = 0; row < rows.length; row++) {
            let have = 0;

            for (let column = 0; column < whole.length; column++)
                have += rows[row][column] * whole[column];

            if (have >= atLeast[row] - 1e-6)
                continue;

            let maker = -1;

            for (let column = 0; column < whole.length; column++) {
                if (rows[row][column] > Eps && (maker < 0 || runs[column] > runs[maker] + Eps))
                    maker = column;
            }

            if (maker < 0)
                return null;

            whole[maker] += Math.ceil((atLeast[row] - have) / rows[row][maker] - 1e-9);
            short = true;
        }

        if (!short)
            return whole;
    }

    return null;
}

function readPlan(resources: ReadonlyMap<string, Resource>, makers: ReadonlyMap<string, Craft[]>, targets: ReadonlyMap<string, number>, columns: readonly Craft[], runs: readonly number[], period: number | null): Plan {
    const planned: PlanCraft[] = [];
    const produced = new Map<string, number>();
    const consumed = new Map<string, number>();
    let total = 0;

    for (let index = 0; index < columns.length; index++) {
        const craft = columns[index];
        const count = runs[index];

        if (count <= Eps)
            continue;

        const time = count * Math.max(0, craft.time);

        planned.push({ craft: craft.id, runs: count, time: Math.min(time, LongestTime), workers: period === null ? null : Math.min(Math.ceil(time / period - Eps), MostWorkers) });
        total += time;

        for (const product of amountsOf(craft.products, resources))
            produced.set(product.resource, (produced.get(product.resource) ?? 0) + count * product.amount);

        for (const ingredient of amountsOf(craft.ingredients, resources))
            consumed.set(ingredient.resource, (consumed.get(ingredient.resource) ?? 0) + count * ingredient.amount);
    }

    const read: PlanResource[] = [];
    let raw = 0;
    let cost = 0;

    for (const entry of resources.values()) {
        if (!targets.has(entry.id) && !produced.has(entry.id) && !consumed.has(entry.id))
            continue;

        const source = !makers.has(entry.id);
        const target = targets.get(entry.id) ?? 0;
        const gives = produced.get(entry.id) ?? 0;
        const takes = consumed.get(entry.id) ?? 0;

        if (source) {
            raw += takes + target;
            cost += (takes + target) * costOf(entry);
        }

        read.push({ resource: entry.id, source, target, produced: gives, consumed: takes, surplus: source ? 0 : settle(gives - takes - target) });
    }

    return { status: "Solved", crafts: planned, resources: read, time: Math.min(total, LongestTime), raw, cost };
}

/** What one run takes of the sources together, each counted as one or at its own cost. */
function rawOf(craft: Craft, resources: ReadonlyMap<string, Resource>, makers: ReadonlyMap<string, Craft[]>, priced: boolean): number {
    let sum = 0;

    for (const ingredient of amountsOf(craft.ingredients, resources)) {
        if (!makers.has(ingredient.resource))
            sum += ingredient.amount * (priced ? costOf(resources.get(ingredient.resource)!) : 1);
    }

    return sum;
}

/** What one of a source costs: its own cost, or one when it names none — or one it cannot mean, since a source that paid to be taken would make the least cost fall without end. */
function costOf(resource: Resource): number {
    return resource.cost !== null && Number.isFinite(resource.cost) && resource.cost >= 0 ? resource.cost : 1;
}

/** The amounts that count: of a resource the catalogue has, and above zero. */
function amountsOf(amounts: readonly CraftAmount[], resources: ReadonlyMap<string, Resource>): CraftAmount[] {
    return amounts.filter(amount => resources.has(amount.resource) && amount.amount > 0);
}

function amountOf(amounts: readonly CraftAmount[], resource: string): number {
    let sum = 0;

    for (const amount of amounts) {
        if (amount.resource === resource && amount.amount > 0)
            sum += amount.amount;
    }

    return sum;
}

function settle(value: number): number {
    return Math.abs(value) < 1e-7 ? 0 : value;
}
