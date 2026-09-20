using System;
using System.Globalization;
using NE.Standard.UI.Graph;
using NE.Standard.UI.Icons.Material;

namespace DemoApp.Graph;

/// <summary>
/// How much an event matters; an enum, so its editor is a choice of its names.
/// </summary>
internal enum EventPriority
{
    Low,
    Normal,
    High
}

/// <summary>
/// A name typed in on the node, for wiring into a list that takes several.
/// </summary>
[GraphNode(Category = "Planning", Title = "Name", Description = "A name typed in on the node.", Icon = MaterialIcons.Person, Color = DemoNodeColors.Text)]
internal sealed class NameNode : IGraphNode
{
    [GraphInput(Title = "Name", NoPin = true, MaxLength = 40)]
    public string Value { get; set; } = string.Empty;

    [GraphOutput(Title = "Name")]
    public string Result { get; set; } = string.Empty;

    public void Execute(UINodeRunContext context)
        => Result = Value;
}

/// <summary>
/// One event planned on the canvas, carrying every kind of field a node draws: a line of text, a date, a time, a yes-or-no, a
/// number with its unit, a choice, a list that takes names wired in and typed alike, a text of several lines, and a picture's
/// address with its choose-a-file button.
/// </summary>
[GraphNode(Category = "Planning", Title = "Event", Description = "An event: when it is, how long, who comes.", Icon = MaterialIcons.CalendarMonth, Color = DemoNodeColors.Text, MinWidth = 17)]
internal sealed class EventNode : IGraphNode
{
    [GraphInput(Title = "Title", NoPin = true, MaxLength = 60)]
    public string Name { get; set; } = string.Empty;

    [GraphInput(Title = "Day", NoPin = true)]
    public DateOnly Day { get; set; }

    [GraphInput(Title = "Time", NoPin = true)]
    public TimeOnly Time { get; set; }

    [GraphInput(Title = "All day", NoPin = true)]
    public bool AllDay { get; set; }

    [GraphInput(Title = "Length", NoPin = true, Unit = "min", Min = 0, Step = 15)]
    public double Length { get; set; } = 60;

    [GraphInput(Title = "Priority", NoPin = true)]
    public EventPriority Priority { get; set; } = EventPriority.Normal;

    [GraphInput(Title = "Guests", Multiple = true, Height = 6, Description = "Every name wired in, then the ones typed here.")]
    public string[] Guests { get; set; } = [];

    [GraphInput(Title = "Notes", NoPin = true, MaxLines = 3, MaxLength = 200)]
    public string Notes { get; set; } = string.Empty;

    [GraphInput(Title = "Cover", NoPin = true, Image = true)]
    public string? Cover { get; set; }

    [GraphOutput(Title = "Starts at")]
    public DateTime Moment { get; set; }

    [GraphOutput(Title = "Summary")]
    public string Summary { get; set; } = string.Empty;

    public void Execute(UINodeRunContext context)
    {
        ArgumentNullException.ThrowIfNull(context);

        Moment = Day.ToDateTime(AllDay ? TimeOnly.MinValue : Time);

        var when = AllDay
            ? Day.ToString("d MMM yyyy", CultureInfo.InvariantCulture) + ", all day"
            : Moment.ToString("d MMM yyyy HH:mm", CultureInfo.InvariantCulture) + $" for {Length.ToString("0", CultureInfo.InvariantCulture)} min";

        Summary = $"{Name} ({Priority}) — {when}; guests: {(Guests.Length == 0 ? "none" : string.Join(", ", Guests))}.";

        context.Log($"{Guests.Length} guests.");
    }
}

/// <summary>
/// When to be reminded of what arrives: a moment over a pin, with its own editor while nothing is wired, and how long before.
/// </summary>
[GraphNode(Category = "Planning", Title = "Reminder", Description = "A reminder some minutes before a moment.", Icon = MaterialIcons.Alarm, Color = DemoNodeColors.Text)]
internal sealed class ReminderNode : IGraphNode
{
    // Required, so its pin is the plain dot beside the optional ones: a reminder of nothing is not one.
    [GraphInput(Title = "At", Required = true)]
    public DateTime At { get; set; }

    [GraphInput(Title = "Before", NoPin = true, Unit = "min", Min = 0, Step = 5)]
    public double Before { get; set; } = 15;

    [GraphOutput(Title = "Remind at")]
    public DateTime RemindAt { get; set; }

    [GraphOutput(Title = "Text")]
    public string Text { get; set; } = string.Empty;

    public void Execute(UINodeRunContext context)
    {
        RemindAt = At.AddMinutes(-Before);
        Text = $"Reminder at {RemindAt.ToString("d MMM yyyy HH:mm", CultureInfo.InvariantCulture)}.";
    }
}
