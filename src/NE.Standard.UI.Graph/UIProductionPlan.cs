using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace NE.Standard.UI.Graph;

/// <summary>
/// What a plan's amounts are counted over.
/// </summary>
public enum UIProductionPeriod
{
    /// <summary>Made once: the amounts are totals, so are the runs and their time, and every craft runs a whole number of times.</summary>
    Once,

    /// <summary>Every minute of a line that keeps running.</summary>
    Minute,

    /// <summary>Every hour of a line that keeps running.</summary>
    Hour
}

/// <summary>
/// What a plan makes least where the catalogue leaves it a choice — two recipes for one resource, or a by-product that covers a demand.
/// </summary>
public enum UIProductionObjective
{
    /// <summary>The least brought in, every source counted alike; among equals, the soonest.</summary>
    LeastRaw,

    /// <summary>The least time of all the runs together; among equals, the least brought in.</summary>
    LeastTime,

    /// <summary>The least cost of what is brought in, a source with no <see cref="UIResource.Cost"/> counting as one; among equals, the soonest.</summary>
    LeastCost
}

/// <summary>
/// How much of one resource a plan has to reach.
/// </summary>
public sealed record UIProductionTarget(string Resource, double Amount);

/// <summary>
/// What the viewer asked a production graph to plan: amounts to reach, the period they're counted over, and what to make least.
/// Part of the graph's document, saved like the layout.
/// </summary>
[method: JsonConstructor]
public sealed class UIProductionPlanRequest(UIProductionTarget[]? targets = null, UIProductionPeriod period = UIProductionPeriod.Once, UIProductionObjective objective = UIProductionObjective.LeastRaw, string[]? bought = null)
{
    /// <summary>
    /// Gets the request that asks for nothing.
    /// </summary>
    public static UIProductionPlanRequest Empty { get; } = new();

    /// <summary>
    /// Gets the amounts to reach.
    /// </summary>
    public UIProductionTarget[] Targets { get; } = targets ?? [];

    /// <summary>
    /// Gets what the amounts are counted over.
    /// </summary>
    public UIProductionPeriod Period { get; } = period;

    /// <summary>
    /// Gets what the plan makes least.
    /// </summary>
    public UIProductionObjective Objective { get; } = objective;

    /// <summary>
    /// Gets the made resources the plan brings in rather than makes: what makes them is left out of the plan, and they are counted
    /// with the sources.
    /// </summary>
    public string[] Bought { get; } = bought ?? [];

    /// <summary>
    /// Gets how long the period lasts, or nothing for a plan made once.
    /// </summary>
    [JsonIgnore]
    public TimeSpan? PeriodLength => Period switch
    {
        UIProductionPeriod.Minute => TimeSpan.FromMinutes(1),
        UIProductionPeriod.Hour => TimeSpan.FromHours(1),
        _ => null
    };
}

/// <summary>
/// How a plan came out.
/// </summary>
public enum UIProductionPlanStatus
{
    /// <summary>Nothing was asked for that the catalogue knows.</summary>
    Empty,

    /// <summary>The runs reach every target.</summary>
    Solved,

    /// <summary>No runs reach the targets: a cycle takes more than it gives.</summary>
    Infeasible
}

/// <summary>
/// One craft of a plan: how many runs, their combined time, and — for a period-based plan — how many run side by side to keep up.
/// </summary>
public sealed record UIPlannedCraft(string Craft, double Runs, TimeSpan Time, int? Workers);

/// <summary>
/// One resource of a plan: what the runs make and take of it, what was asked for, and what's left over. A source makes nothing —
/// what's taken and asked is brought in.
/// </summary>
public sealed record UIPlannedResource(string Resource, bool IsSource, double Target, double Produced, double Consumed, double Surplus)
{
    /// <summary>
    /// Gets how much of a source has to be brought in; zero for a resource the plan makes.
    /// </summary>
    public double BroughtIn => IsSource ? Consumed + Target : 0;
}

/// <summary>
/// The answer to a <see cref="UIProductionPlanRequest"/>: the runs of every craft that takes part and the balance of every resource
/// they touch, in the catalogue's order.
/// </summary>
public sealed class UIProductionPlan(UIProductionPlanStatus status, IReadOnlyList<UIPlannedCraft>? crafts = null, IReadOnlyList<UIPlannedResource>? resources = null, TimeSpan time = default, double raw = 0, double cost = 0)
{
    /// <summary>Gets how the plan came out.</summary>
    public UIProductionPlanStatus Status { get; } = status;

    /// <summary>Gets the crafts that run.</summary>
    public IReadOnlyList<UIPlannedCraft> Crafts { get; } = crafts ?? [];

    /// <summary>Gets the resources the runs touch, and the targets.</summary>
    public IReadOnlyList<UIPlannedResource> Resources { get; } = resources ?? [];

    /// <summary>Gets every run's time together.</summary>
    public TimeSpan Time { get; } = time;

    /// <summary>Gets what is brought in of every source together.</summary>
    public double Raw { get; } = raw;

    /// <summary>Gets what the sources brought in cost, one with no cost counting as one.</summary>
    public double Cost { get; } = cost;
}
