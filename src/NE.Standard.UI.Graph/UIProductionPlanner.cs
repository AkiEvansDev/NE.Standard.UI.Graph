using System;
using System.Collections.Generic;

namespace NE.Standard.UI.Graph;

/// <summary>
/// Plans a production graph: how many runs of which craft reach the requested amounts. The canvas solves the same live in the
/// browser; this is the server-side port for a controller-driven plan.
/// </summary>
/// <remarks>Rates are steady-state: no queues, no schedule.</remarks>
public static class UIProductionPlanner
{
    private const double Eps = 1e-9;

    /// <summary>
    /// Solves <paramref name="request"/> over a catalogue of resources and crafts.
    /// </summary>
    public static UIProductionPlan Solve(IEnumerable<UIProductionEntry> entries, UIProductionPlanRequest request)
    {
        ArgumentNullException.ThrowIfNull(entries);
        ArgumentNullException.ThrowIfNull(request);

        List<UIResource> catalogue = [];
        Dictionary<string, UIResource> resources = new(StringComparer.Ordinal);
        List<UICraft> crafts = [];

        foreach (UIProductionEntry entry in entries)
        {
            if (entry is UIResource resource && resources.TryAdd(resource.Id, resource))
                catalogue.Add(resource);
            else if (entry is UICraft craft)
                crafts.Add(craft);
        }

        HashSet<string> bought = new(request.Bought, StringComparer.Ordinal);
        Dictionary<string, List<UICraft>> makers = new(StringComparer.Ordinal);

        foreach (UICraft craft in crafts)
        {
            foreach (UICraftAmount product in craft.Products)
            {
                // A resource the plan brings in has nothing that makes it, as far as the plan goes.
                if (!Counts(product, resources) || bought.Contains(product.Resource))
                    continue;

                if (!makers.TryGetValue(product.Resource, out List<UICraft>? list))
                    makers[product.Resource] = list = [];

                if (!list.Contains(craft))
                    list.Add(craft);
            }
        }

        Dictionary<string, double> targets = new(StringComparer.Ordinal);

        foreach (UIProductionTarget target in request.Targets)
        {
            if (resources.ContainsKey(target.Resource) && target.Amount > Eps)
                targets[target.Resource] = targets.GetValueOrDefault(target.Resource) + target.Amount;
        }

        if (targets.Count == 0)
            return new UIProductionPlan(UIProductionPlanStatus.Empty);

        List<UICraft> columns = Helping(crafts, resources, makers, targets, out HashSet<string> needed);
        List<string> made = [];

        foreach (UIResource resource in catalogue)
        {
            if (needed.Contains(resource.Id) && makers.ContainsKey(resource.Id))
                made.Add(resource.Id);
        }

        var rows = new double[made.Count][];
        var atLeast = new double[made.Count];

        for (var row = 0; row < made.Count; row++)
        {
            rows[row] = new double[columns.Count];
            atLeast[row] = targets.GetValueOrDefault(made[row]);

            for (var column = 0; column < columns.Count; column++)
                rows[row][column] = AmountOf(columns[column].Products, made[row]) - AmountOf(columns[column].Ingredients, made[row]);
        }

        var raw = new double[columns.Count];
        var priced = new double[columns.Count];
        var time = new double[columns.Count];

        for (var column = 0; column < columns.Count; column++)
        {
            raw[column] = RawOf(columns[column], resources, makers, priced: false);
            priced[column] = request.Objective == UIProductionObjective.LeastCost ? RawOf(columns[column], resources, makers, priced: true) : raw[column];
            time[column] = Math.Max(0, columns[column].Time.TotalSeconds);
        }

        var runs = request.Objective == UIProductionObjective.LeastTime
            ? ProductionSimplex.Minimise(rows, atLeast, time, raw)
            : ProductionSimplex.Minimise(rows, atLeast, priced, time);

        if (runs is null)
            return new UIProductionPlan(UIProductionPlanStatus.Infeasible);

        // Made once, a craft runs a whole number of times; counted over a period, a run and a half a minute is a rate like any other.
        var whole = request.Period == UIProductionPeriod.Once ? WholeRuns(rows, atLeast, runs) : null;

        return Read(catalogue, resources, makers, targets, columns, whole ?? runs, request.PeriodLength);
    }

    /// <summary>Whether an amount counts: of a resource the catalogue has, and above zero.</summary>
    private static bool Counts(UICraftAmount amount, Dictionary<string, UIResource> resources)
        => amount.Amount > 0 && resources.ContainsKey(amount.Resource);

    /// <summary>Everything that can help, in the catalogue's order: the crafts that make something needed, and what those take in their turn.</summary>
    private static List<UICraft> Helping(List<UICraft> crafts, Dictionary<string, UIResource> resources, Dictionary<string, List<UICraft>> makers, Dictionary<string, double> targets, out HashSet<string> needed)
    {
        needed = new(targets.Keys, StringComparer.Ordinal);

        HashSet<UICraft> helping = [];
        Queue<string> queue = new(targets.Keys);

        while (queue.TryDequeue(out var next))
        {
            if (!makers.TryGetValue(next, out List<UICraft>? made))
                continue;

            foreach (UICraft craft in made)
            {
                if (!helping.Add(craft))
                    continue;

                foreach (UICraftAmount ingredient in craft.Ingredients)
                {
                    if (Counts(ingredient, resources) && needed.Add(ingredient.Resource))
                        queue.Enqueue(ingredient.Resource);
                }
            }
        }

        List<UICraft> columns = [];

        foreach (UICraft craft in crafts)
        {
            if (helping.Contains(craft))
                columns.Add(craft);
        }

        return columns;
    }

    private static double AmountOf(IReadOnlyList<UICraftAmount> amounts, string resource)
    {
        double sum = 0;

        foreach (UICraftAmount amount in amounts)
        {
            if (amount.Amount > 0 && string.Equals(amount.Resource, resource, StringComparison.Ordinal))
                sum += amount.Amount;
        }

        return sum;
    }

    /// <summary>What one run takes of the sources together, each counted as one or at its own cost.</summary>
    private static double RawOf(UICraft craft, Dictionary<string, UIResource> resources, Dictionary<string, List<UICraft>> makers, bool priced)
    {
        double sum = 0;

        foreach (UICraftAmount ingredient in craft.Ingredients)
        {
            if (Counts(ingredient, resources) && !makers.ContainsKey(ingredient.Resource))
                sum += ingredient.Amount * (priced ? resources[ingredient.Resource].Cost ?? 1 : 1);
        }

        return sum;
    }

    /// <summary>
    /// Rounds runs up to whole numbers, then tops up any shortfall with whole runs of the biggest maker until nothing is short;
    /// null if that never settles.
    /// </summary>
    private static double[]? WholeRuns(double[][] rows, double[] atLeast, double[] runs)
    {
        var whole = new double[runs.Length];

        for (var column = 0; column < runs.Length; column++)
            whole[column] = runs[column] <= Eps ? 0 : Math.Ceiling(runs[column] - 1e-6);

        for (var pass = 0; pass < 1000; pass++)
        {
            var isShort = false;

            for (var row = 0; row < rows.Length; row++)
            {
                double have = 0;

                for (var column = 0; column < whole.Length; column++)
                    have += rows[row][column] * whole[column];

                if (have >= atLeast[row] - 1e-6)
                    continue;

                var maker = -1;

                for (var column = 0; column < whole.Length; column++)
                {
                    if (rows[row][column] > Eps && (maker < 0 || runs[column] > runs[maker] + Eps))
                        maker = column;
                }

                if (maker < 0)
                    return null;

                whole[maker] += Math.Ceiling(((atLeast[row] - have) / rows[row][maker]) - 1e-9);
                isShort = true;
            }

            if (!isShort)
                return whole;
        }

        return null;
    }

    private static UIProductionPlan Read(List<UIResource> catalogue, Dictionary<string, UIResource> resources, Dictionary<string, List<UICraft>> makers, Dictionary<string, double> targets, List<UICraft> columns, double[] runs, TimeSpan? period)
    {
        List<UIPlannedCraft> planned = [];
        Dictionary<string, double> produced = new(StringComparer.Ordinal);
        Dictionary<string, double> consumed = new(StringComparer.Ordinal);
        double total = 0;

        for (var index = 0; index < columns.Count; index++)
        {
            UICraft craft = columns[index];
            var count = runs[index];

            if (count <= Eps)
                continue;

            var time = count * Math.Max(0, craft.Time.TotalSeconds);
            int? workers = period is TimeSpan length ? (int)Math.Ceiling((time / length.TotalSeconds) - Eps) : null;

            planned.Add(new UIPlannedCraft(craft.Id, count, TimeSpan.FromSeconds(time), workers));
            total += time;

            foreach (UICraftAmount product in craft.Products)
            {
                if (Counts(product, resources))
                    produced[product.Resource] = produced.GetValueOrDefault(product.Resource) + (count * product.Amount);
            }

            foreach (UICraftAmount ingredient in craft.Ingredients)
            {
                if (Counts(ingredient, resources))
                    consumed[ingredient.Resource] = consumed.GetValueOrDefault(ingredient.Resource) + (count * ingredient.Amount);
            }
        }

        List<UIPlannedResource> read = [];
        double raw = 0;
        double cost = 0;

        foreach (UIResource resource in catalogue)
        {
            if (!targets.ContainsKey(resource.Id) && !produced.ContainsKey(resource.Id) && !consumed.ContainsKey(resource.Id))
                continue;

            var source = !makers.ContainsKey(resource.Id);
            var target = targets.GetValueOrDefault(resource.Id);
            var gives = produced.GetValueOrDefault(resource.Id);
            var takes = consumed.GetValueOrDefault(resource.Id);

            if (source)
            {
                raw += takes + target;
                cost += (takes + target) * (resource.Cost ?? 1);
            }

            read.Add(new UIPlannedResource(resource.Id, source, target, gives, takes, source ? 0 : Settle(gives - takes - target)));
        }

        return new UIProductionPlan(UIProductionPlanStatus.Solved, planned, read, TimeSpan.FromSeconds(total), raw, cost);
    }

    private static double Settle(double value)
        => Math.Abs(value) < 1e-7 ? 0 : value;
}
