using System;
using System.Collections.Generic;

namespace NE.Standard.UI.Graph;

/// <summary>Plans a production graph: how many runs of which craft reach the requested amounts.</summary>
/// <remarks>
/// The canvas solves the same live in the browser; this is the server-side port for a controller-driven plan. Rates are
/// steady-state: no queues, no schedule.
/// </remarks>
public static class UIProductionPlanner
{
    /// <summary>
    /// The most cells — resources made, times the crafts that help — a plan weighs unless the caller says otherwise: a table of a
    /// thousand by a thousand.
    /// </summary>
    public const int DefaultMaxCells = 1_000_000;

    private const double Eps = 1e-9;

    /// <summary>
    /// Solves <paramref name="request"/> over a catalogue of resources and crafts.
    /// </summary>
    /// <remarks>
    /// The catalogue and the request may be the browser's, so a plan that would weigh more than <paramref name="maxCells"/> is not
    /// worked out: it answers <see cref="UIProductionPlanStatus.TooLarge"/>.
    /// </remarks>
    public static UIProductionPlan Solve(IEnumerable<UIProductionEntry> entries, UIProductionPlanRequest request, int maxCells = DefaultMaxCells)
    {
        ArgumentNullException.ThrowIfNull(entries);
        ArgumentNullException.ThrowIfNull(request);
        ArgumentOutOfRangeException.ThrowIfNegative(maxCells);

        List<UIResource> catalogue = [];
        Dictionary<string, UIResource> resources = [with(StringComparer.Ordinal)];
        List<UICraft> crafts = [];

        foreach (UIProductionEntry entry in entries)
        {
            if (entry is UIResource resource && resources.TryAdd(resource.Id, resource))
                catalogue.Add(resource);
            else if (entry is UICraft craft)
                crafts.Add(craft);
        }

        HashSet<string> bought = new(request.Bought, StringComparer.Ordinal);
        Dictionary<string, List<UICraft>> makers = [with(StringComparer.Ordinal)];

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

        Dictionary<string, double> targets = [with(StringComparer.Ordinal)];

        // The request may be the browser's own document: a target sent as nothing, or naming nothing, asks for nothing.
        foreach (UIProductionTarget? target in request.Targets)
        {
            if (target?.Resource is null || !resources.ContainsKey(target.Resource) || !double.IsFinite(target.Amount) || target.Amount <= Eps)
                continue;

            var next = targets.GetValueOrDefault(target.Resource) + target.Amount;

            if (!double.IsFinite(next))
                return new UIProductionPlan(UIProductionPlanStatus.Unsettled);

            targets[target.Resource] = next;
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

        // The table is dense, so it is weighed before it is built.
        if ((long)made.Count * columns.Count > maxCells)
            return new UIProductionPlan(UIProductionPlanStatus.TooLarge);

        var rows = new double[made.Count][];
        var atLeast = new double[made.Count];

        for (var row = 0; row < made.Count; row++)
        {
            rows[row] = new double[columns.Count];
            atLeast[row] = targets.GetValueOrDefault(made[row]);

            for (var column = 0; column < columns.Count; column++)
            {
                var net = AmountOf(columns[column].Products, made[row]) - AmountOf(columns[column].Ingredients, made[row]);

                if (!double.IsFinite(net))
                    return new UIProductionPlan(UIProductionPlanStatus.Unsettled);

                rows[row][column] = net;
            }
        }

        var raw = new double[columns.Count];
        var priced = new double[columns.Count];
        var time = new double[columns.Count];

        for (var column = 0; column < columns.Count; column++)
        {
            raw[column] = RawOf(columns[column], resources, makers, priced: false);
            priced[column] = request.Objective == UIProductionObjective.LeastCost ? RawOf(columns[column], resources, makers, priced: true) : raw[column];
            time[column] = Math.Max(0, columns[column].Time.TotalSeconds);

            if (!double.IsFinite(raw[column]) || !double.IsFinite(priced[column]) || !double.IsFinite(time[column]))
                return new UIProductionPlan(UIProductionPlanStatus.Unsettled);
        }

        (var least, var tie) = request.Objective == UIProductionObjective.LeastTime ? (time, raw) : (priced, time);
        var runs = ProductionSimplex.Minimise(rows, atLeast, least, tie, out var unsettled);

        if (runs is null || !AllFinite(runs))
            return new UIProductionPlan((runs is not null || unsettled) ? UIProductionPlanStatus.Unsettled : UIProductionPlanStatus.Infeasible);

        // Made once, a craft runs a whole number of times; counted over a period, a run and a half a minute is a rate like any other.
        var whole = request.Period == UIProductionPeriod.Once ? WholeRuns(rows, atLeast, runs) : null;

        return Read(catalogue, resources, makers, targets, columns, whole ?? runs, request.PeriodLength);
    }

    /// <summary>Whether an amount counts: of a resource the catalogue has, and above zero; one a draft carried in as nothing does not.</summary>
    private static bool Counts(UICraftAmount? amount, Dictionary<string, UIResource> resources)
        => amount?.Resource is not null && double.IsFinite(amount.Amount) && amount.Amount > 0 && resources.ContainsKey(amount.Resource);

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

        foreach (UICraftAmount? amount in amounts)
        {
            if (amount is not null && double.IsFinite(amount.Amount) && amount.Amount > 0 && string.Equals(amount.Resource, resource, StringComparison.Ordinal))
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
                sum += ingredient.Amount * (priced ? CostOf(resources[ingredient.Resource]) : 1);
        }

        return sum;
    }

    /// <summary>
    /// What one of a source costs: its own cost, or one when it names none — or one it cannot mean: a source that paid to be taken
    /// would make the least cost fall without end.
    /// </summary>
    private static double CostOf(UIResource resource)
        => resource.Cost is double cost && double.IsFinite(cost) && cost >= 0 ? cost : 1;

    private static bool AllFinite(double[] values)
    {
        for (var i = 0; i < values.Length; i++)
        {
            if (!double.IsFinite(values[i]))
                return false;
        }

        return true;
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

                if (!double.IsFinite(have))
                    return null;

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

                if (!double.IsFinite(whole[maker]))
                    return null;

                isShort = true;
            }

            if (!isShort)
                return whole;
        }

        return null;
    }

    private static UIProductionPlan Read(List<UIResource> catalogue, Dictionary<string, UIResource> resources, Dictionary<string, List<UICraft>> makers, Dictionary<string, double> targets, List<UICraft> columns, double[] runs, TimeSpan? period)
    {
        if (period is TimeSpan span && (!double.IsFinite(span.TotalSeconds) || span.TotalSeconds <= 0))
            return new UIProductionPlan(UIProductionPlanStatus.Unsettled);

        List<UIPlannedCraft> planned = [];
        Dictionary<string, double> produced = [with(StringComparer.Ordinal)];
        Dictionary<string, double> consumed = [with(StringComparer.Ordinal)];
        double total = 0;

        for (var index = 0; index < columns.Count; index++)
        {
            UICraft craft = columns[index];
            var count = runs[index];

            if (!double.IsFinite(count))
                return new UIProductionPlan(UIProductionPlanStatus.Unsettled);

            if (count <= Eps)
                continue;

            var time = count * Math.Max(0, craft.Time.TotalSeconds);
            total += time;

            if (!double.IsFinite(time) || !double.IsFinite(total))
                return new UIProductionPlan(UIProductionPlanStatus.Unsettled);

            int? workers = null;

            if (period is TimeSpan length)
            {
                var neededWorkers = (time / length.TotalSeconds) - Eps;

                if (!double.IsFinite(neededWorkers))
                    return new UIProductionPlan(UIProductionPlanStatus.Unsettled);

                workers = (int)Math.Clamp(Math.Ceiling(neededWorkers), 0, int.MaxValue);
            }

            planned.Add(new UIPlannedCraft(craft.Id, count, Duration(time), workers));

            foreach (UICraftAmount product in craft.Products)
            {
                if (!Counts(product, resources))
                    continue;

                var next = produced.GetValueOrDefault(product.Resource) + (count * product.Amount);

                if (!double.IsFinite(next))
                    return new UIProductionPlan(UIProductionPlanStatus.Unsettled);

                produced[product.Resource] = next;
            }

            foreach (UICraftAmount ingredient in craft.Ingredients)
            {
                if (!Counts(ingredient, resources))
                    continue;

                var next = consumed.GetValueOrDefault(ingredient.Resource) + (count * ingredient.Amount);

                if (!double.IsFinite(next))
                    return new UIProductionPlan(UIProductionPlanStatus.Unsettled);

                consumed[ingredient.Resource] = next;
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
                var brought = takes + target;

                raw += brought;
                cost += brought * CostOf(resource);

                if (!double.IsFinite(raw) || !double.IsFinite(cost))
                    return new UIProductionPlan(UIProductionPlanStatus.Unsettled);
            }

            var surplus = source ? 0 : Settle(gives - takes - target);

            if (!double.IsFinite(surplus))
                return new UIProductionPlan(UIProductionPlanStatus.Unsettled);

            read.Add(new UIPlannedResource(resource.Id, source, target, gives, takes, surplus));
        }

        return new UIProductionPlan(UIProductionPlanStatus.Solved, planned, read, Duration(total), raw, cost);
    }

    /// <summary>A plan's seconds as a time, the longest one there is for a plan longer than that.</summary>
    /// <remarks>
    /// The canvas's plan (<c>plan.ts</c>) counts seconds in a number and solves such a plan all the same; a time cannot hold past
    /// 29 000 years, and <see cref="TimeSpan.FromSeconds(double)"/> would throw rather than answer.
    /// </remarks>
    private static TimeSpan Duration(double seconds)
        => seconds * TimeSpan.TicksPerSecond < TimeSpan.MaxValue.Ticks ? TimeSpan.FromSeconds(seconds) : TimeSpan.MaxValue;

    private static double Settle(double value)
        => Math.Abs(value) < 1e-7 ? 0 : value;
}
