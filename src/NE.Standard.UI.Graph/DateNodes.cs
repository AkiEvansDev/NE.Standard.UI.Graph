using System;
using System.Globalization;
using NE.Standard.UI.Primitives.Constants;

namespace NE.Standard.UI.Graph;

/// <summary>
/// What an amount of time is counted in, for <see cref="AddToDateNode"/> and <see cref="DateDifferenceNode"/>.
/// </summary>
public enum UIDateUnit
{
    Minutes,
    Hours,
    Days,
    Weeks,
    Months,
    Years
}

/// <summary>A date moved on, or back, by an amount of time.</summary>
/// <remarks>
/// Months and years move by the calendar — the 31st of January and a month is the last day of February — and are added whole; a day
/// without a time loses what an amount of hours adds past its midnight. The result is the type that came in: a day stays a day, a
/// date and time a date and time.
/// </remarks>
[GraphNode(Key = NodeKey, Category = UINodeKinds.DatesCategory, Title = "Add to date", Description = "Moves a date on, or back, by an amount of time.", Icon = UIGlyphs.CalendarAdd, Color = UINodeKinds.DateColor)]
public sealed class AddToDateNode : IGraphNode
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "graph.add-to-date";

    /// <summary>Gets or sets the date to move — a day, or a date and time.</summary>
    [GraphInput(Title = "Date", PinOnly = true, Required = true)]
    public object? Date { get; set; }

    /// <summary>Gets or sets how much to move it by; below zero, it moves back.</summary>
    [GraphInput(Title = "Amount")]
    public double Amount { get; set; } = 1;

    /// <summary>Gets or sets what the amount is counted in.</summary>
    [GraphInput(Title = "Unit", NoPin = true)]
    public UIDateUnit Unit { get; set; } = UIDateUnit.Days;

    /// <summary>Gets or sets the date moved, of the type that came in.</summary>
    [GraphOutput(Title = "Result", TypeOf = nameof(Date))]
    public object? Result { get; set; }

    /// <inheritdoc/>
    public void Execute(UINodeRunContext context)
    {
        DateTime clock = NodeDates.Read(Date, "Date");
        DateTime moved;

        if (!double.IsFinite(Amount))
            throw new InvalidOperationException("The amount is not a number.");

        try
        {
            moved = Unit switch
            {
                UIDateUnit.Minutes => clock.AddMinutes(Amount),
                UIDateUnit.Hours => clock.AddHours(Amount),
                UIDateUnit.Days => clock.AddDays(Amount),
                UIDateUnit.Weeks => clock.AddDays(Amount * 7),
                UIDateUnit.Months => clock.AddMonths(Whole(Amount)),
                UIDateUnit.Years => clock.AddYears(Whole(Amount)),
                _ => throw new InvalidOperationException($"'{Unit}' is not a unit of time.")
            };
        }
        catch (ArgumentOutOfRangeException)
        {
            throw new InvalidOperationException($"Moved by {Amount.ToString(CultureInfo.InvariantCulture)} {Unit.ToString().ToLowerInvariant()}, {clock.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture)} falls outside the calendar.");
        }

        Result = NodeDates.Write(moved, Date);
    }

    /// <summary>An amount of months or years as the whole number the calendar moves by; a fraction of a month has no length.</summary>
    private int Whole(double amount)
    {
        var whole = Math.Round(amount);

        // A hair off a whole number is the sum's rounding, not a wish for part of a month.
        if (Math.Abs(amount - whole) > 1e-9)
            throw new InvalidOperationException($"{Unit} are added whole: {amount.ToString(CultureInfo.InvariantCulture)} is not a whole number of them.");

        // Past ten thousand years the calendar has no date to land on; clamped here, the calendar's own check says so.
        return (int)Math.Clamp(whole, -120_000, 120_000);
    }
}

/// <summary>How far one date stands from another, in the unit asked for.</summary>
/// <remarks>
/// Months and years as the whole calendar months and years between them, the smaller units with their fraction; below zero when
/// <c>To</c> comes before <c>From</c>.
/// </remarks>
[GraphNode(Key = NodeKey, Category = UINodeKinds.DatesCategory, Title = "Date difference", Description = "How far one date stands from another.", Icon = UIGlyphs.DateRange, Color = UINodeKinds.DateColor)]
public sealed class DateDifferenceNode : IGraphNode
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "graph.date-difference";

    /// <summary>Gets or sets the date counted from.</summary>
    [GraphInput(Title = "From", PinOnly = true, Required = true)]
    public object? From { get; set; }

    /// <summary>Gets or sets the date counted to.</summary>
    [GraphInput(Title = "To", PinOnly = true, Required = true)]
    public object? To { get; set; }

    /// <summary>Gets or sets what the difference is counted in.</summary>
    [GraphInput(Title = "Unit", NoPin = true)]
    public UIDateUnit Unit { get; set; } = UIDateUnit.Days;

    /// <summary>Gets or sets how far apart the two stand.</summary>
    [GraphOutput(Title = "Amount")]
    public double Amount { get; set; }

    /// <inheritdoc/>
    public void Execute(UINodeRunContext context)
    {
        DateTime from = NodeDates.Read(From, "From");
        DateTime to = NodeDates.Read(To, "To");
        TimeSpan span = to - from;

        Amount = Unit switch
        {
            UIDateUnit.Minutes => span.TotalMinutes,
            UIDateUnit.Hours => span.TotalHours,
            UIDateUnit.Days => span.TotalDays,
            UIDateUnit.Weeks => span.TotalDays / 7,
            UIDateUnit.Months => WholeMonths(from, to),
            // Truncated toward zero, as the months are: eleven months back is no year back.
            UIDateUnit.Years => WholeMonths(from, to) / 12,
            _ => throw new InvalidOperationException($"'{Unit}' is not a unit of time.")
        };
    }

    /// <summary>How many whole calendar months lie between two dates: the last month is counted only once its day and time are reached.</summary>
    private static int WholeMonths(DateTime from, DateTime to)
    {
        var months = ((to.Year - from.Year) * 12) + to.Month - from.Month;

        if (months > 0 && from.AddMonths(months) > to)
            months--;
        else if (months < 0 && from.AddMonths(months) < to)
            months++;

        return months;
    }
}

/// <summary>
/// A date taken apart: its year, month, day, day of the week, hour and minute. A day without a time has its hour and minute at
/// zero.
/// </summary>
[GraphNode(Key = NodeKey, Category = UINodeKinds.DatesCategory, Title = "Date parts", Description = "Takes a date apart into its year, month, day and time.", Icon = UIGlyphs.EventNote, Color = UINodeKinds.DateColor)]
public sealed class DatePartsNode : IGraphNode
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "graph.date-parts";

    /// <summary>Gets or sets the date to take apart.</summary>
    [GraphInput(Title = "Date", PinOnly = true, Required = true)]
    public object? Date { get; set; }

    /// <summary>Gets or sets its year.</summary>
    [GraphOutput(Title = "Year")]
    public int Year { get; set; }

    /// <summary>Gets or sets its month, 1 for January.</summary>
    [GraphOutput(Title = "Month", Description = "1 for January to 12 for December.")]
    public int Month { get; set; }

    /// <summary>Gets or sets its day of the month.</summary>
    [GraphOutput(Title = "Day")]
    public int Day { get; set; }

    /// <summary>Gets or sets its day of the week, 1 for Monday to 7 for Sunday, as ISO 8601 counts them.</summary>
    [GraphOutput(Title = "Day of week", Description = "1 for Monday to 7 for Sunday.")]
    public int DayOfWeek { get; set; }

    /// <summary>Gets or sets its hour, 0 to 23.</summary>
    [GraphOutput(Title = "Hour")]
    public int Hour { get; set; }

    /// <summary>Gets or sets its minute.</summary>
    [GraphOutput(Title = "Minute")]
    public int Minute { get; set; }

    /// <inheritdoc/>
    public void Execute(UINodeRunContext context)
    {
        DateTime clock = NodeDates.Read(Date, "Date");

        Year = clock.Year;
        Month = clock.Month;
        Day = clock.Day;
        // .NET counts from Sunday at 0; ISO from Monday at 1, Sunday last.
        DayOfWeek = (((int)clock.DayOfWeek + 6) % 7) + 1;
        Hour = clock.Hour;
        Minute = clock.Minute;
    }
}

/// <summary>The date types a pin of any type may carry, read as the clock reads them and written back as the type that came in.</summary>
/// <remarks>A day at its midnight; a date and time with an offset by its own clock rather than moved to another zone.</remarks>
internal static class NodeDates
{
    /// <summary>Whether a value is a date, and the clock reading it stands for.</summary>
    public static bool TryRead(object? value, out DateTime clock)
    {
        switch (value)
        {
            case DateOnly day:
                clock = day.ToDateTime(TimeOnly.MinValue);
                return true;
            case DateTime dateTime:
                clock = dateTime;
                return true;
            case DateTimeOffset offset:
                clock = offset.DateTime;
                return true;
            default:
                clock = default;
                return false;
        }
    }

    /// <summary>The clock reading a pin's value stands for, or the node's failure naming the pin.</summary>
    public static DateTime Read(object? value, string pin)
        => TryRead(value, out DateTime clock)
            ? clock
            : throw new InvalidOperationException($"{pin} takes a date, and {(value is null ? "nothing" : $"a {value.GetType().Name}")} reached it.");

    /// <summary>A clock reading as the type <paramref name="like"/> is: a day loses its time, a date and time with an offset keeps it.</summary>
    public static object Write(DateTime clock, object? like)
        => like switch
        {
            DateOnly => DateOnly.FromDateTime(clock),
            DateTimeOffset offset => new DateTimeOffset(DateTime.SpecifyKind(clock, DateTimeKind.Unspecified), offset.Offset),
            _ => clock
        };
}
