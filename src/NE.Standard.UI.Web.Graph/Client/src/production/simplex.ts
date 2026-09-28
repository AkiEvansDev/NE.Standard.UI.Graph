// A small dense simplex, ported from `ProductionSimplex`: minimizes a cost over x >= 0 under `at least` rows, with a second
// cost breaking ties. Bland's rule (first improving column, first binding row) keeps both ports in lockstep even on a degenerate
// table; cross-checked against `tests/plan-corpus.json`.

const Eps = 1e-9;
// A number this small after a pivot is the arithmetic's dust, and dust left in the table is what a later ratio trips on.
const Dust = 1e-12;

export type LinearProgramme = {
    /** One row per constraint: the coefficients of `sum(row[j] * x[j]) >= atLeast[i]`. */
    readonly rows: readonly (readonly number[])[];
    /** What each row has to reach; never below zero. */
    readonly atLeast: readonly number[];
    /** The cost made least. */
    readonly cost: readonly number[];
    /** The cost made least among the answers the first cost holds equal. */
    readonly tieCost: readonly number[];
};

/**
 * The x of the least cost; `infeasible` when no x >= 0 reaches every row, `unsettled` when the walk to the least found no end — a
 * cost that falls without bound, or a table that would not settle.
 */
export function minimise(programme: LinearProgramme): number[] | "infeasible" | "unsettled" {
    const count = programme.cost.length;
    const height = programme.rows.length;
    const artificial: number[] = [];

    for (let row = 0; row < height; row++) {
        if (programme.atLeast[row] > Eps)
            artificial.push(row);
    }

    // The columns: the x themselves, a surplus per row, an artificial per row that starts above zero; the last is the right-hand side.
    const real = count + height;
    const width = real + artificial.length;
    const table: number[][] = [];
    const basis: number[] = [];
    let ceiling = 1;

    for (let row = 0; row < height; row++) {
        const line = new Array<number>(width + 1).fill(0);
        const place = artificial.indexOf(row);

        // A row that starts at zero is turned over, so its own surplus stands in the basis at zero and it needs no artificial.
        const sign = place < 0 ? -1 : 1;

        for (let column = 0; column < count; column++)
            line[column] = sign * programme.rows[row][column];

        line[count + row] = -sign;

        if (place >= 0) {
            line[real + place] = 1;
            line[width] = programme.atLeast[row];
            ceiling = Math.max(ceiling, programme.atLeast[row]);
        }

        table.push(line);
        basis.push(place < 0 ? count + row : real + place);
    }

    const first = new Array<number>(width + 1).fill(0);
    const second = new Array<number>(width + 1).fill(0);
    const phase = new Array<number>(width + 1).fill(0);

    for (let column = 0; column < count; column++) {
        first[column] = programme.cost[column];
        second[column] = programme.tieCost[column];
    }

    for (const row of artificial) {
        for (let column = 0; column < real; column++)
            phase[column] -= table[row][column];

        phase[width] -= table[row][width];
    }

    const costs = [phase, first, second];

    if (artificial.length > 0) {
        if (!walk(table, basis, costs, real, column => phase[column] < -Eps))
            return "unsettled";

        let left = 0;

        for (let row = 0; row < height; row++) {
            if (basis[row] >= real)
                left += table[row][width];
        }

        if (left > 1e-7 * ceiling)
            return "infeasible";

        leaveArtificials(table, basis, costs, real);
    }

    // Along the answers the first cost holds equal, the second walk takes a column it is indifferent to, which the second cost gains by.
    if (!walk(table, basis, costs, real, column => first[column] < -Eps) || !walk(table, basis, costs, real, column => Math.abs(first[column]) <= Eps && second[column] < -Eps))
        return "unsettled";

    const answer = new Array<number>(count).fill(0);

    for (let row = 0; row < height; row++) {
        if (basis[row] < count)
            answer[basis[row]] = Math.max(0, table[row][width]);
    }

    return answer;
}

/** Pivots while a column is wanted; false when the walk found no end, which a cost that is never negative does not allow. */
function walk(table: number[][], basis: number[], costs: number[][], real: number, wanted: (column: number) => boolean): boolean {
    const width = table.length === 0 ? real : table[0].length - 1;
    const limit = 64 * (table.length + width) + 256;

    for (let step = 0; step < limit; step++) {
        let entering = -1;

        for (let column = 0; column < real; column++) {
            if (wanted(column)) {
                entering = column;
                break;
            }
        }

        if (entering < 0)
            return true;

        let leaving = -1;
        let best = 0;

        for (let row = 0; row < table.length; row++) {
            if (table[row][entering] <= Eps)
                continue;

            const ratio = table[row][width] / table[row][entering];

            if (leaving < 0 || ratio < best - Eps) {
                leaving = row;
                best = ratio;
            } else if (ratio <= best + Eps && basis[row] < basis[leaving]) {
                leaving = row;
                best = Math.min(best, ratio);
            }
        }

        if (leaving < 0)
            return false;

        pivot(table, basis, costs, leaving, entering);
    }

    return false;
}

function pivot(table: number[][], basis: number[], costs: number[][], row: number, column: number): void {
    const line = table[row];
    const by = line[column];

    for (let index = 0; index < line.length; index++)
        line[index] = clean(line[index] / by);

    line[column] = 1;

    for (let other = 0; other < table.length; other++) {
        if (other !== row)
            eliminate(table[other], line, column);
    }

    for (const cost of costs)
        eliminate(cost, line, column);

    basis[row] = column;
}

function eliminate(target: number[], line: number[], column: number): void {
    const factor = target[column];

    if (factor === 0)
        return;

    for (let index = 0; index < target.length; index++)
        target[index] = clean(target[index] - factor * line[index]);

    target[column] = 0;
}

function clean(value: number): number {
    return Math.abs(value) < Dust ? 0 : value;
}

/** An artificial still in the basis stands at zero; it leaves for any real column its row has, or — if none — the row is redundant and no later pivot changes it. */
function leaveArtificials(table: number[][], basis: number[], costs: number[][], real: number): void {
    const width = table[0].length - 1;

    for (let row = 0; row < table.length; row++) {
        if (basis[row] < real)
            continue;

        table[row][width] = 0;

        for (let column = 0; column < real; column++) {
            if (Math.abs(table[row][column]) > Eps) {
                pivot(table, basis, costs, row, column);
                break;
            }
        }
    }
}
