// How a solved plan is read off the sheet: which catalogue entries it draws, and the plan's totals in place of run numbers —
// an amount and time once, or a rate and worker count per period. Each number is stated once: the panel names the period, and
// an edge states its amount only where the node it leaves doesn't already.

import { formatAmount, formatTime } from "./craft-view.ts";
import type { ProductionEntry } from "./model.ts";
import type { Plan, PlanCraft, PlanPeriod, PlanResource } from "./plan.ts";

const Numbers = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });

export type PlanWords = {
    text(key: string): string;
};

/** A solved plan, indexed for the sheet. */
export type PlanReading = {
    readonly plan: Plan;
    readonly period: PlanPeriod;
    readonly crafts: ReadonlyMap<string, PlanCraft>;
    readonly resources: ReadonlyMap<string, PlanResource>;
};

export function readPlan(plan: Plan, period: PlanPeriod): PlanReading {
    return {
        plan,
        period,
        crafts: new Map(plan.crafts.map(craft => [craft.craft, craft])),
        resources: new Map(plan.resources.map(resource => [resource.resource, resource]))
    };
}

/** What the sheet draws of the catalogue under a plan: the crafts that run, and every resource the plan names. */
export function planEntries(entries: readonly ProductionEntry[], reading: PlanReading): ProductionEntry[] {
    return entries.filter(entry => (entry.kind === "craft" ? reading.crafts.has(entry.id) : reading.resources.has(entry.id)));
}

/** `/min` or `/h` after an amount counted over a period, in the panel's tables; nothing after a total. */
export function rateSuffix(period: PlanPeriod, words: PlanWords): string {
    return period === "Minute" ? words.text("ui.graph.per-minute") : period === "Hour" ? words.text("ui.graph.per-hour") : "";
}

/** A total or a rate of a resource, as an amount is written everywhere else on the sheet. */
export function formatFlow(amount: number, unit: string | null): string {
    return formatAmount(round(amount), unit);
}

/** What an edge says under a plan: the amount taken along it, or nothing where that equals the whole of what the resource's chip already states (as along a chain). Speaks where a resource is shared or partly used. */
export function edgeFlow(taken: number, resource: PlanResource | undefined, unit: string | null): string | null {
    const stated = resource === undefined ? null : resource.source ? resource.consumed + resource.target : resource.produced;

    return stated !== null && Math.abs(stated - taken) < 1e-6 ? null : formatFlow(taken, unit);
}

/** What a craft's runs come to: their time together for a plan made once, how many of the craft keep up for one counted over a period. */
export function formatEffort(craft: PlanCraft, words: PlanWords): string {
    return craft.workers === null ? formatTime(round(craft.time)) : words.text("ui.graph.plan-at-once").replace("{count}", String(craft.workers));
}

/** What a resource says on itself under a plan: how much the plan makes it (or brings it in, for a source), plus its maker's runs when that craft is drawn on its edges. */
export function resourceChip(resource: PlanResource, unit: string | null, maker: PlanCraft | undefined, words: PlanWords): string {
    const amount = formatFlow(resource.source ? resource.consumed + resource.target : resource.produced, unit);

    return maker === undefined ? amount : `${amount} · ${formatEffort(maker, words)}`;
}

/** What a craft's pill says after its name under a plan: its runs, and what they come to. */
export function craftNote(craft: PlanCraft, words: PlanWords): string {
    return `×${Numbers.format(round(craft.runs))} · ${formatEffort(craft, words)}`;
}

/** A plan's number as it is shown: the solver's dust rounded off, so twenty reads as 20 and not 19.999999999998. */
export function round(value: number): number {
    return Math.round(value * 1e6) / 1e6;
}

export function formatNumber(value: number): string {
    return Numbers.format(round(value));
}
