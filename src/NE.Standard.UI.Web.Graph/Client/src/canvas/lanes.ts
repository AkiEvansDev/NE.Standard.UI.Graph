// Lane assignment for stepped edges: edges crossing one gap are bundled into lanes where they share an end, ordered to minimize
// crossings, rather than all turning on one line; an edge with points of its own takes a lane alone. Axes are the sheet's own:
// `along` the layers, `across` within one.

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
/** How far apart two lanes stand, and how far a lane keeps from the nodes either side, where the gap has the room. */
export const LaneSpacing = 14;
export const LaneMargin = 14;
/** Every order is tried up to this many lanes — 720 of them; past it the lanes keep the order their sources stand in. */
const MostOrdered = 6;

type Bundle = {
    readonly legs: LaneLeg[];
    min: number;
    max: number;
    /** Where the bundle's sources stand on average: the order lanes start in, and the one ties are broken by. */
    mean: number;
};

/**
 * Where each bent leg turns along the layers, by leg id; a straight leg, or one too short to turn, has none. A leg turns half way
 * along its run, and only legs whose uprights come within a lane of each other are set apart around there — so moving one node
 * moves only the turns of the wires near it.
 */
export function assignLanes(legs: readonly LaneLeg[], options: LaneOptions = {}): Map<string, number> {
    const spacing = options.spacing ?? LaneSpacing;
    const margin = options.margin ?? LaneMargin;
    const bent = legs
        .filter(leg => Math.abs(leg.from.across - leg.to.across) > 0.5 && leg.to.along - leg.from.along >= LeastRun)
        .sort((left, right) => left.from.along - right.from.along || left.from.across - right.from.across);
    const lanes = new Map<string, number>();

    for (const gap of gapsOf(bent, spacing, margin)) {
        const bundles = order(bundlesOf(gap.legs));
        const { middle, step } = placement(gap, bundles.length, spacing, margin);

        bundles.forEach((bundle, index) => {
            for (const leg of bundle.legs)
                lanes.set(leg.id, middle + (index - (bundles.length - 1) / 2) * step);
        });
    }

    return lanes;
}

/** Legs set apart together: the run they all share, how far across they reach, where they would turn on their own, and their lanes' reach. */
type Gap = { legs: LaneLeg[]; low: number; high: number; top: number; bottom: number; turns: number; from: number; to: number };

/** Every leg on its own, then joined with any whose uprights would come within a lane of its own, until none would. */
function gapsOf(bent: readonly LaneLeg[], spacing: number, margin: number): Gap[] {
    const gaps = bent.map(leg => reach({
        legs: [leg],
        low: leg.from.along,
        high: leg.to.along,
        top: Math.min(leg.from.across, leg.to.across),
        bottom: Math.max(leg.from.across, leg.to.across),
        turns: (leg.from.along + leg.to.along) / 2,
        from: 0,
        to: 0
    }, spacing, margin));

    // Each set takes in every other its uprights would meet, looking again after each, since a joined set reaches further; one it
    // has done with meets none, and a later set that grows into it takes it in on its own turn. No scan starts over from the first.
    for (let first = 0; first < gaps.length; first++) {
        for (let second = 0; second < gaps.length; second++) {
            if (second === first || !meet(gaps[first], gaps[second], spacing))
                continue;

            join(gaps[first], gaps[second], spacing, margin);
            gaps.splice(second, 1);

            if (second < first)
                first--;

            second = -1;
        }
    }

    return gaps;
}

/**
 * Whether two sets' uprights would come within a lane of each other: they stand level somewhere, they share a run to be set apart
 * in, and their lanes would turn that close.
 */
function meet(one: Gap, other: Gap, spacing: number): boolean {
    return one.top <= other.bottom + spacing && other.top <= one.bottom + spacing
        && Math.max(one.low, other.low) < Math.min(one.high, other.high)
        && one.from < other.to + spacing && other.from < one.to + spacing;
}

function join(into: Gap, other: Gap, spacing: number, margin: number): void {
    into.legs.push(...other.legs);
    into.low = Math.max(into.low, other.low);
    into.high = Math.min(into.high, other.high);
    into.top = Math.min(into.top, other.top);
    into.bottom = Math.max(into.bottom, other.bottom);
    into.turns += other.turns;
    reach(into, spacing, margin);
}

/** Sets where a set's lanes reach, first to last, from where they stand. */
function reach(gap: Gap, spacing: number, margin: number): Gap {
    const count = bundleCount(gap.legs);
    const { middle, step } = placement(gap, count, spacing, margin);
    const half = (count - 1) / 2 * step;

    gap.from = middle - half;
    gap.to = middle + half;

    return gap;
}

/**
 * Where a set's lanes stand: around where its legs would turn on their own, as far apart as the run they share allows, and inside
 * that run, clear of the nodes either side of it.
 */
function placement(gap: Gap, count: number, spacing: number, margin: number): { middle: number; step: number } {
    const room = Math.max(0, gap.high - gap.low - margin * 2);
    const step = count > 1 ? Math.min(spacing, room / (count - 1)) : 0;
    const half = (count - 1) / 2 * step;
    const low = gap.low + margin + half;
    const high = gap.high - margin - half;
    const wanted = gap.turns / gap.legs.length;

    return { middle: low <= high ? Math.min(Math.max(wanted, low), high) : (gap.low + gap.high) / 2, step };
}

/** How many lanes a set of legs takes, as `bundlesOf` groups them; asked again each time two sets join, so it builds nothing it can count. */
function bundleCount(legs: readonly LaneLeg[]): number {
    const leaving = leavingCounts(legs);
    const keys = new Set<string>();

    for (const leg of legs)
        keys.add(bundleKey(leg, leaving));

    return keys.size;
}

/**
 * A lane per point several legs leave together, and then per point the rest enter: legs that share a point share its line, and
 * legs a node sets apart along its side — a card's — each keep their own.
 */
function bundlesOf(legs: readonly LaneLeg[]): Bundle[] {
    const leaving = leavingCounts(legs);
    const groups = new Map<string, LaneLeg[]>();

    for (const leg of legs) {
        const key = bundleKey(leg, leaving);
        const group = groups.get(key);

        if (group === undefined)
            groups.set(key, [leg]);
        else
            group.push(leg);
    }

    return [...groups.values()].map(group => {
        let min = Number.POSITIVE_INFINITY;
        let max = Number.NEGATIVE_INFINITY;
        let sum = 0;

        for (const leg of group) {
            min = Math.min(min, leg.from.across, leg.to.across);
            max = Math.max(max, leg.from.across, leg.to.across);
            sum += leg.from.across;
        }

        return { legs: group, min, max, mean: sum / group.length };
    });
}

/** How many legs leave each point. */
function leavingCounts(legs: readonly LaneLeg[]): Map<string, number> {
    const leaving = new Map<string, number>();

    for (const leg of legs) {
        const from = pointsOf(leg).from;

        leaving.set(from, (leaving.get(from) ?? 0) + 1);
    }

    return leaving;
}

/** The lane a leg shares: its point of leaving when others leave there too, else its point of entering. */
function bundleKey(leg: LaneLeg, leaving: ReadonlyMap<string, number>): string {
    const points = pointsOf(leg);

    return (leaving.get(points.from) ?? 0) > 1 ? points.fromLane : points.toLane;
}

/** Where on its nodes a leg leaves and enters them, to the pixel, and the lane keys either point gives it. */
type LegPoints = { readonly from: string; readonly to: string; readonly fromLane: string; readonly toLane: string };

// A leg's points by the leg, written once a leg rather than once each time two sets join.
const legPoints = new WeakMap<LaneLeg, LegPoints>();

function pointsOf(leg: LaneLeg): LegPoints {
    let points = legPoints.get(leg);

    if (points === undefined) {
        const from = `${leg.source}@${Math.round(leg.from.across)}`;
        const to = `${leg.target}@${Math.round(leg.to.across)}`;

        points = { from, to, fromLane: `from:${from}`, toLane: `to:${to}` };
        legPoints.set(leg, points);
    }

    return points;
}

/** The lanes in the order that crosses least, first to last along the layers; among equals, the order their sources stand in. */
function order(bundles: Bundle[]): Bundle[] {
    const standing = [...bundles].sort((left, right) => left.mean - right.mean || left.min - right.min);

    if (standing.length < 2 || standing.length > MostOrdered)
        return standing;

    // What two lanes cost each other depends only on which stands first, so it is counted once a pair rather than once an order:
    // this runs on every draw, a drag's frames among them.
    const pairs = standing.map(earlier => standing.map(later => (earlier === later ? 0 : crossings(earlier, later))));
    const cost = (order: readonly number[]): number => {
        let count = 0;

        for (let first = 0; first < order.length; first++) {
            for (let second = first + 1; second < order.length; second++)
                count += pairs[order[first]][order[second]];
        }

        return count;
    };

    let best = standing.map((_, index) => index);
    let least = cost(best);

    for (const candidate of permutations(best)) {
        const count = cost(candidate);

        if (count < least) {
            best = candidate;
            least = count;
        }
    }

    return best.map(index => standing[index]);
}

/** Counts the crossings of two lanes, one before the other: the earlier's flat runs cross the later's upright on the way out, and the later's cross the earlier's on the way in. */
function crossings(earlier: Bundle, later: Bundle): number {
    let count = 0;

    for (const leg of earlier.legs)
        count += inside(leg.to.across, later) ? 1 : 0;

    for (const leg of later.legs)
        count += inside(leg.from.across, earlier) ? 1 : 0;

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
