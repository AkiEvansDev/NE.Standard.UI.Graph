using System;
using System.Globalization;
using System.Threading;
using System.Threading.Tasks;
using NE.Standard.UI.Primitives.Constants;

namespace NE.Standard.UI.Graph;

/// <summary>
/// Any value written out as text, in the format asked for when it has one — <c>N2</c> for a number, <c>yyyy-MM-dd</c> for a day.
/// </summary>
[GraphNode(Key = NodeKey, Category = UINodeKinds.TextCategory, Title = "To text", Description = "Writes any value out as text.", Icon = UIGlyphs.Abc, Color = UINodeKinds.AnyColor)]
public sealed class ToTextNode : IGraphNode
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "graph.to-text";

    /// <summary>Gets or sets the value to write out.</summary>
    [GraphInput(Title = "Value", PinOnly = true)]
    public object? Value { get; set; }

    /// <summary>Gets or sets the format a value that takes one is written in; empty, its own.</summary>
    [GraphInput(Title = "Format", NoPin = true, MaxLength = 40)]
    public string Format { get; set; } = string.Empty;

    /// <summary>Gets or sets the text written.</summary>
    [GraphOutput(Title = "Text")]
    public string Text { get; set; } = string.Empty;

    /// <inheritdoc/>
    public void Execute(UINodeRunContext context)
        => Text = Value is IFormattable formattable && Format.Length > 0
            ? formattable.ToString(Format, CultureInfo.InvariantCulture)
            : Convert.ToString(Value, CultureInfo.InvariantCulture) ?? string.Empty;
}

/// <summary>
/// Shows whatever reaches it, drawn by the shape the run gave it: a number, a line of text, a picture, a list or a table of records.
/// </summary>
[GraphNode(Key = NodeKey, Category = UINodeKinds.UtilitiesCategory, Title = "Display", Description = "Shows whatever reaches it, drawn by the shape it has.", Icon = UIGlyphs.Visibility, Color = UINodeKinds.AnyColor, MinWidth = 16)]
public sealed class DisplayNode
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "graph.display";

    /// <summary>Gets or sets what the last run fed it; nothing of it is saved.</summary>
    [GraphInput(Title = "Value", Display = true, Height = 9, Description = "Whatever the run last fed it.")]
    public object? Value { get; set; }
}

/// <summary>
/// A note on the sheet: text for whoever reads it, with no pins, which a run passes over.
/// </summary>
[GraphNode(Key = NodeKey, Category = UINodeKinds.UtilitiesCategory, Title = "Note", Description = "Text for whoever reads the sheet.", Icon = UIGlyphs.StickyNote, Color = "var(--ui-color-warning)", MinWidth = 15)]
public sealed class NoteNode
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "graph.note";

    /// <summary>Gets or sets the note's text.</summary>
    [GraphInput(Title = "Note", NoPin = true, MaxLines = 12, Height = 6)]
    public string Text { get; set; } = string.Empty;
}

/// <summary>A point a wire is led through: whatever reaches it goes on unchanged, to as many inputs as are wired to it.</summary>
/// <remarks>
/// It wears the name and the colour of the output that feeds it. Every catalogue carries it, out of the picker: the canvas's menu
/// puts one down and a wire's menu puts one on the wire.
/// </remarks>
[GraphNode(Key = NodeKey, Category = UINodeKinds.UtilitiesCategory, Title = "Reroute", Description = "Leads a wire through a point of its own.", Color = UINodeKinds.AnyColor, Compact = true, Resizable = false, Hidden = true)]
public sealed class RerouteNode : IGraphNode
{
    /// <summary>The kind's key in a saved sheet, which the canvas's menu adds by.</summary>
    public const string NodeKey = "graph.reroute";

    /// <summary>Gets or sets what reaches it.</summary>
    [GraphInput(Title = "Value", PinOnly = true)]
    public object? Value { get; set; }

    /// <summary>Gets or sets what reached it, passed on.</summary>
    [GraphOutput(Title = "Value", TypeOf = nameof(Value))]
    public object? Result { get; set; }

    /// <inheritdoc/>
    public void Execute(UINodeRunContext context)
        => Result = Value;
}

/// <summary>Holds the run for a while, saying how far along it is, then passes on whatever reached it.</summary>
/// <remarks>
/// A node that takes long enough to watch, for a sheet that waits on something outside it or a run slowed down to be followed.
/// </remarks>
[GraphNode(Key = NodeKey, Category = UINodeKinds.UtilitiesCategory, Title = "Delay", Description = "Waits, reporting as it goes, and passes its value on.", Icon = UIGlyphs.Hourglass, Color = UINodeKinds.AnyColor, ShowProgress = true, AlwaysRuns = true)]
public sealed class DelayNode : IGraphNodeAsync
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "graph.delay";

    /// <summary>The longest a delay holds a run, in seconds.</summary>
    public const double MaxSeconds = 300;

    // How often the wait says how far along it is.
    private const int Steps = 20;

    /// <summary>Gets or sets what reaches it.</summary>
    [GraphInput(Title = "Value", PinOnly = true)]
    public object? Value { get; set; }

    /// <summary>Gets or sets how long it holds the run.</summary>
    [GraphInput(Title = "Seconds", Min = 0, Max = MaxSeconds, Step = 0.5, Unit = "s")]
    public double Seconds { get; set; } = 1;

    /// <summary>Gets or sets what reached it, passed on.</summary>
    [GraphOutput(Title = "Value", TypeOf = nameof(Value))]
    public object? Result { get; set; }

    /// <inheritdoc/>
    public async ValueTask ExecuteAsync(UINodeRunContext context, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(context);

        var seconds = double.IsFinite(Seconds) ? Math.Clamp(Seconds, 0, MaxSeconds) : 0;

        if (seconds > 0)
        {
            TimeSpan step = TimeSpan.FromSeconds(seconds / Steps);

            for (var taken = 1; taken <= Steps; taken++)
            {
                await Task.Delay(step, cancellationToken).ConfigureAwait(false);
                await context.ReportAsync((string?)null, taken / (double)Steps).ConfigureAwait(false);
            }
        }

        Result = Value;
    }
}

/// <summary>A count that moves by its step each run, from its start towards its end, then starts over or ends a run of all.</summary>
/// <remarks>
/// The value the next run hands out is kept in the document and shown on the node, and its reset puts it back to the start. One
/// counter's <see cref="Wrapped"/> wired into another's <see cref="Advance"/> makes a loop inside a loop: every value of the inner
/// one for each value of the outer.
/// </remarks>
[GraphNode(Key = NodeKey, Category = UINodeKinds.UtilitiesCategory, Title = "Counter", Description = "Counts one step further each run.", Icon = UIGlyphs.PlusOne, Color = "var(--ui-color-series-3)")]
public sealed class CounterNode : IGraphNode, IGraphNodeSequence
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "graph.counter";

    /// <summary>Gets or sets the first value handed out.</summary>
    [GraphInput(Title = "From")]
    public double From { get; set; }

    /// <summary>Gets or sets the last value handed out, the step permitting.</summary>
    [GraphInput(Title = "To")]
    public double To { get; set; } = 10;

    /// <summary>Gets or sets how far each run moves the count; below zero, it counts down.</summary>
    [GraphInput(Title = "Step", NoPin = true)]
    public double Step { get; set; } = 1;

    /// <summary>Gets or sets whether the count starts over at the end rather than stopping there.</summary>
    [GraphInput(Title = "Start over", NoPin = true, Description = "At the end, start again from the first value rather than stopping.")]
    public bool Wrap { get; set; }

    /// <summary>Gets or sets whether this run moves the count on; wired from another counter's <see cref="Wrapped"/>, it moves once a round of that one.</summary>
    [GraphInput(Title = "Advance", Description = "Whether this run moves the count on; from another counter's Wrapped, once a round of that one.")]
    public bool Advance { get; set; } = true;

    /// <summary>Gets or sets the value the next run hands out; empty, the first one.</summary>
    [GraphInput(Title = "Next", State = true, Description = "The value the next run hands out; empty, the first. The reset starts over.")]
    public double? Next { get; set; }

    /// <summary>Gets or sets the value this run handed out.</summary>
    [GraphOutput(Title = "Value")]
    public double Value { get; set; }

    /// <summary>Gets or sets whether this run handed out the last value, the count starting over or ending after it.</summary>
    [GraphOutput(Title = "Wrapped")]
    public bool Wrapped { get; set; }

    /// <inheritdoc/>
    public bool HasMore { get; private set; }

    /// <inheritdoc/>
    public void Execute(UINodeRunContext context)
    {
        // The same axis a range walks: its values counted once rather than found by adding up, which drifts.
        GridAxis axis = GridAxis.Of("The counter", From, To, Step);

        // Kept as a value, read back as a place: rounded, since a value summed in binary lands a hair off its step.
        var place = Next is double next ? Math.Round((next - From) / Step) : 0;

        // Asked the way round that reads a place no number stands for as past the end too.
        if (!(place >= 0 && place < axis.Count))
        {
            if (!Wrap)
                throw new InvalidOperationException("The counter is past its end: Reset it from its menu to count again.");

            place = 0;
        }

        Value = axis.At((int)place);
        Wrapped = false;

        if (Advance)
        {
            place++;

            if (place >= axis.Count)
            {
                Wrapped = true;

                if (Wrap)
                    place = 0;
            }
        }

        Next = axis.At((int)place);
        HasMore = Wrap || place < axis.Count;
    }
}
