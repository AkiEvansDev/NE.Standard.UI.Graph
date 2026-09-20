// Lane assignment for stepped edges: edges crossing the same gap are bundled by shared source/target into lanes, ordered to
// minimize crossings, rather than all turning on one line. Coordinates are in the sheet's own axes: `along` the layers, `across` within a layer.

export type LanePoint = { readonly along: number; readonly across: number };

/** One leg of an edge, from one stop to the next; the keys say which legs leave one place and which enter one. */
export type LaneLeg = {
    readonly id: string;
    readonly from: LanePoint;
    readonly to: LanePoint;
    readonly source: string;
    readonly target: string;
};

export type LaneOptions = {
    /** How far apart two lanes stand, where the gap has the room. */
    readonly spacing?: number;
    /** How far a lane keeps from the nodes either side of the gap. */
    readonly margin?: number;
};

/** The least run along the layers a leg needs to turn inside it; a shorter one is the drawing's own business. */
export const LeastRun = 48;
const Spacing = 14;
const Margin = 14;
/** Every order is tried up to this many lanes — 720 of them; past it the lanes keep the order their sources stand in. */
const MostOrdered = 6;

type Bundle = {
    readonly legs: LaneLeg[];
    min: number;
    max: number;
    /** Where the bundle's sources stand on average: the order lanes start in, and the one ties are broken by. */
    mean: number;
};

/** Where each bent leg turns, along the layers, by the leg's id; a straight leg, or one too short to turn in, has no entry. */
export function assignLanes(legs: readonly LaneLeg[], options: LaneOptions = {}): Map<string, number> {
    const spacing = options.spacing ?? Spacing;
    const margin = options.margin ?? Margin;
    const bent = legs
        .filter(leg => Math.abs(leg.from.across - leg.to.across) > 0.5 && leg.to.along - leg.from.along >= LeastRun)
        .sort((left, right) => left.from.along - right.from.along || left.from.across - right.from.across);
    const lanes = new Map<string, number>();

    for (const gap of gapsOf(bent)) {
        const bundles = order(bundlesOf(gap.legs));
        const room = Math.max(0, gap.high - gap.low - margin * 2);
        const step = bundles.length > 1 ? Math.min(spacing, room / (bundles.length - 1)) : 0;
        const middle = (gap.low + gap.high) / 2;

        bundles.forEach((bundle, index) => {
            for (const leg of bundle.legs)
                lanes.set(leg.id, middle + (index - (bundles.length - 1) / 2) * step);
        });
    }

    return lanes;
}

/** The legs that cross one gap between layers: each one's run overlaps what the others have left of the gap. */
function gapsOf(bent: readonly LaneLeg[]): { legs: LaneLeg[]; low: number; high: number }[] {
    const gaps: { legs: LaneLeg[]; low: number; high: number }[] = [];

    for (const leg of bent) {
        const last = gaps[gaps.length - 1];

        if (last !== undefined && leg.from.along < last.high && leg.to.along > last.low) {
            last.legs.push(leg);
            last.low = Math.max(last.low, leg.from.along);
            last.high = Math.min(last.high, leg.to.along);
        }
        else {
            gaps.push({ legs: [leg], low: leg.from.along, high: leg.to.along });
        }
    }

    return gaps;
}

/** A lane per place several legs leave together, and then per place the rest enter. */
function bundlesOf(legs: readonly LaneLeg[]): Bundle[] {
    const leaving = new Map<string, LaneLeg[]>();

    for (const leg of legs)
        leaving.set(leg.source, [...leaving.get(leg.source) ?? [], leg]);

    const groups = new Map<string, LaneLeg[]>();

    for (const leg of legs) {
        const key = (leaving.get(leg.source) ?? []).length > 1 ? `from:${leg.source}` : `to:${leg.target}`;

        groups.set(key, [...groups.get(key) ?? [], leg]);
    }

    return [...groups.values()].map(group => {
        const across = group.flatMap(leg => [leg.from.across, leg.to.across]);

        return {
            legs: group,
            min: Math.min(...across),
            max: Math.max(...across),
            mean: group.reduce((sum, leg) => sum + leg.from.across, 0) / group.length
        };
    });
}

/** The lanes in the order that crosses least, first to last along the layers; among equals, the order their sources stand in. */
function order(bundles: Bundle[]): Bundle[] {
    const standing = [...bundles].sort((left, right) => left.mean - right.mean || left.min - right.min);

    if (standing.length < 2 || standing.length > MostOrdered)
        return standing;

    let best = standing;
    let least = crossings(standing);

    for (const candidate of permutations(standing)) {
        const count = crossings(candidate);

        if (count < least) {
            best = candidate;
            least = count;
        }
    }

    return best;
}

/** Counts lane crossings for one order: a leg's flat runs cross every earlier lane's upright on the way out, and every later one on the way in. */
function crossings(bundles: readonly Bundle[]): number {
    let count = 0;

    for (let earlier = 0; earlier < bundles.length; earlier++) {
        for (let later = earlier + 1; later < bundles.length; later++) {
            for (const leg of bundles[earlier].legs)
                count += inside(leg.to.across, bundles[later]) ? 1 : 0;

            for (const leg of bundles[later].legs)
                count += inside(leg.from.across, bundles[earlier]) ? 1 : 0;
        }
    }

    return count;
}

function inside(across: number, bundle: Bundle): boolean {
    return across > bundle.min + 0.5 && across < bundle.max - 0.5;
}

function* permutations<TItem>(items: readonly TItem[]): Generator<TItem[]> {
    if (items.length <= 1) {
        yield [...items];
        return;
    }

    for (let index = 0; index < items.length; index++) {
        for (const rest of permutations([...items.slice(0, index), ...items.slice(index + 1)]))
            yield [items[index], ...rest];
    }
}
