using System;
using System.Collections.Generic;

namespace NE.Standard.UI.Graph;

/// <summary>
/// A small dense simplex: minimises one cost over x >= 0 under <c>at least</c> rows, with a second cost breaking ties.
/// </summary>
/// <remarks>
/// Uses Bland's rule to avoid cycling; must match the browser port (<c>Client/src/production/simplex.ts</c>), verified by a shared
/// corpus test.
/// </remarks>
internal static class ProductionSimplex
{
    private const double Eps = 1e-9;

    // A number this small after a pivot is the arithmetic's dust, and dust left in the table is what a later ratio trips on.
    private const double Dust = 1e-12;

    /// <summary>
    /// The x of the least cost under <c>sum(rows[i][j] * x[j]) >= atLeast[i]</c>, or nothing when no x >= 0 reaches every row.
    /// </summary>
    /// <remarks>
    /// No <paramref name="atLeast"/> is below zero. <paramref name="unsettled"/> says the nothing came from a walk to the least
    /// that found no end: a cost that falls without bound, or a table that would not settle.
    /// </remarks>
    public static double[]? Minimise(double[][] rows, double[] atLeast, double[] cost, double[] tieCost, out bool unsettled)
    {
        unsettled = false;

        var count = cost.Length;
        var height = rows.Length;
        List<int> artificial = [];

        for (var row = 0; row < height; row++)
        {
            if (atLeast[row] > Eps)
                artificial.Add(row);
        }

        // The columns: the x themselves, a surplus per row, an artificial per row that starts above zero; the last is the right-hand side.
        var real = count + height;
        var width = real + artificial.Count;
        var table = new double[height][];
        var basis = new int[height];
        double ceiling = 1;

        for (var row = 0; row < height; row++)
        {
            var line = new double[width + 1];
            var place = artificial.IndexOf(row);

            // A row that starts at zero is turned over, so its own surplus stands in the basis at zero and it needs no artificial.
            var sign = place < 0 ? -1 : 1;

            for (var column = 0; column < count; column++)
                line[column] = sign * rows[row][column];

            line[count + row] = -sign;

            if (place >= 0)
            {
                line[real + place] = 1;
                line[width] = atLeast[row];
                ceiling = Math.Max(ceiling, atLeast[row]);
            }

            table[row] = line;
            basis[row] = place < 0 ? count + row : real + place;
        }

        var first = new double[width + 1];
        var second = new double[width + 1];
        var phase = new double[width + 1];

        for (var column = 0; column < count; column++)
        {
            first[column] = cost[column];
            second[column] = tieCost[column];
        }

        foreach (var row in artificial)
        {
            for (var column = 0; column < real; column++)
                phase[column] -= table[row][column];

            phase[width] -= table[row][width];
        }

        double[][] costs = [phase, first, second];

        if (artificial.Count > 0)
        {
            if (!Walk(table, basis, costs, real, column => phase[column] < -Eps))
            {
                unsettled = true;
                return null;
            }

            double left = 0;

            for (var row = 0; row < height; row++)
            {
                if (basis[row] >= real)
                    left += table[row][width];
            }

            if (left > 1e-7 * ceiling)
                return null;

            LeaveArtificials(table, basis, costs, real);
        }

        // Along the answers the first cost holds equal, the second walk takes a column it is indifferent to, which the second cost gains by.
        if (!Walk(table, basis, costs, real, column => first[column] < -Eps) || !Walk(table, basis, costs, real, column => Math.Abs(first[column]) <= Eps && second[column] < -Eps))
        {
            unsettled = true;
            return null;
        }

        var answer = new double[count];

        for (var row = 0; row < height; row++)
        {
            if (basis[row] < count)
                answer[basis[row]] = Math.Max(0, table[row][width]);
        }

        return answer;
    }

    /// <summary>Pivots while a column is wanted; false when the walk found no end, which a cost that is never negative does not allow.</summary>
    private static bool Walk(double[][] table, int[] basis, double[][] costs, int real, Func<int, bool> wanted)
    {
        var width = table.Length == 0 ? real : table[0].Length - 1;
        var limit = (64 * (table.Length + width)) + 256;

        for (var step = 0; step < limit; step++)
        {
            var entering = -1;

            for (var column = 0; column < real; column++)
            {
                if (wanted(column))
                {
                    entering = column;
                    break;
                }
            }

            if (entering < 0)
                return true;

            var leaving = -1;
            double best = 0;

            for (var row = 0; row < table.Length; row++)
            {
                if (table[row][entering] <= Eps)
                    continue;

                var ratio = table[row][width] / table[row][entering];

                if (leaving < 0 || ratio < best - Eps)
                {
                    leaving = row;
                    best = ratio;
                }
                else if (ratio <= best + Eps && basis[row] < basis[leaving])
                {
                    leaving = row;
                    best = Math.Min(best, ratio);
                }
            }

            if (leaving < 0)
                return false;

            Pivot(table, basis, costs, leaving, entering);
        }

        return false;
    }

    private static void Pivot(double[][] table, int[] basis, double[][] costs, int row, int column)
    {
        var line = table[row];
        var by = line[column];

        for (var index = 0; index < line.Length; index++)
            line[index] = Clean(line[index] / by);

        line[column] = 1;

        for (var other = 0; other < table.Length; other++)
        {
            if (other != row)
                Eliminate(table[other], line, column);
        }

        foreach (var cost in costs)
            Eliminate(cost, line, column);

        basis[row] = column;
    }

    private static void Eliminate(double[] target, double[] line, int column)
    {
        var factor = target[column];

        if (factor == 0)
            return;

        for (var index = 0; index < target.Length; index++)
            target[index] = Clean(target[index] - (factor * line[index]));

        target[column] = 0;
    }

    private static double Clean(double value)
        => Math.Abs(value) < Dust ? 0 : value;

    /// <summary>Removes an artificial still in the basis via any real column in its row; a row with none is already implied by the others.</summary>
    private static void LeaveArtificials(double[][] table, int[] basis, double[][] costs, int real)
    {
        var width = table[0].Length - 1;

        for (var row = 0; row < table.Length; row++)
        {
            if (basis[row] < real)
                continue;

            table[row][width] = 0;

            for (var column = 0; column < real; column++)
            {
                if (Math.Abs(table[row][column]) > Eps)
                {
                    Pivot(table, basis, costs, row, column);
                    break;
                }
            }
        }
    }
}
