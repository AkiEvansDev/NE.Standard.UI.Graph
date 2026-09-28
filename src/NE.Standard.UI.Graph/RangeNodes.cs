using System;
using NE.Standard.UI.Primitives.Constants;

namespace NE.Standard.UI.Graph;

/// <summary>
/// Every point of a grid, one a run: X moves fastest, and Y moves on once X has been round — two counters nested, set up in one
/// node. Where it stands in the grid is kept in the document and shown on the node, and its reset puts it back to the
/// first; after the last it starts over, or it ends a run of all.
/// </summary>
[GraphNode(Key = NodeKey, Category = UINodeKinds.UtilitiesCategory, Title = "Range XY", Description = "Every point of a grid, one a run.", Icon = UIGlyphs.PlusOne, Color = "var(--ui-color-series-3)")]
public sealed class RangeXYNode : IGraphNode, IGraphNodeSequence
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "graph.range-xy";

    /// <summary>Gets or sets the first X.</summary>
    [GraphInput(Title = "From X")]
    public double FromX { get; set; }

    /// <summary>Gets or sets the last X, the step permitting.</summary>
    [GraphInput(Title = "To X")]
    public double ToX { get; set; } = 10;

    /// <summary>Gets or sets how far X moves a run.</summary>
    [GraphInput(Title = "Step X", NoPin = true)]
    public double StepX { get; set; } = 1;

    /// <summary>Gets or sets the first Y.</summary>
    [GraphInput(Title = "From Y")]
    public double FromY { get; set; }

    /// <summary>Gets or sets the last Y, the step permitting.</summary>
    [GraphInput(Title = "To Y")]
    public double ToY { get; set; } = 10;

    /// <summary>Gets or sets how far Y moves once X has been round.</summary>
    [GraphInput(Title = "Step Y", NoPin = true)]
    public double StepY { get; set; } = 1;

    /// <summary>Gets or sets whether the grid starts over after its last point rather than stopping there.</summary>
    [GraphInput(Title = "Start over", NoPin = true, Description = "After the last point, start again from the first rather than stopping.")]
    public bool Wrap { get; set; }

    /// <summary>Gets or sets where the next point stands, 0 for the first: how many the runs have handed out since it last started over.</summary>
    [GraphInput(Title = "Taken", State = true, Min = 0, Description = "Where the next point stands, 0 for the first; the reset starts over.")]
    public int Taken { get; set; }

    /// <summary>Gets or sets this run's X.</summary>
    [GraphOutput(Title = "X")]
    public double X { get; set; }

    /// <summary>Gets or sets this run's Y.</summary>
    [GraphOutput(Title = "Y")]
    public double Y { get; set; }

    /// <summary>Gets or sets whether this run handed out the last point.</summary>
    [GraphOutput(Title = "Wrapped")]
    public bool Wrapped { get; set; }

    /// <inheritdoc/>
    public bool HasMore { get; private set; }

    /// <inheritdoc/>
    public void Execute(UINodeRunContext context)
    {
        GridAxis x = GridAxis.Of("X", FromX, ToX, StepX);
        GridAxis y = GridAxis.Of("Y", FromY, ToY, StepY);
        GridWalk walk = GridWalk.Take(Taken, (long)x.Count * y.Count, Wrap);

        X = x.At(walk.Point % x.Count);
        Y = y.At(walk.Point / x.Count);
        (Taken, Wrapped, HasMore) = (walk.Taken, walk.Wrapped, walk.HasMore);
    }
}

/// <summary>
/// Every point of a box, one a run: X moves fastest, then Y, then Z — three counters nested, set up in one node. Where it stands in the box
/// is kept in the document and shown on the node, and its reset puts it back to the first; after the last it starts over, or it
/// ends a run of all.
/// </summary>
[GraphNode(Key = NodeKey, Category = UINodeKinds.UtilitiesCategory, Title = "Range XYZ", Description = "Every point of a box, one a run.", Icon = UIGlyphs.PlusOne, Color = "var(--ui-color-series-3)")]
public sealed class RangeXYZNode : IGraphNode, IGraphNodeSequence
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "graph.range-xyz";

    /// <summary>Gets or sets the first X.</summary>
    [GraphInput(Title = "From X")]
    public double FromX { get; set; }

    /// <summary>Gets or sets the last X, the step permitting.</summary>
    [GraphInput(Title = "To X")]
    public double ToX { get; set; } = 10;

    /// <summary>Gets or sets how far X moves a run.</summary>
    [GraphInput(Title = "Step X", NoPin = true)]
    public double StepX { get; set; } = 1;

    /// <summary>Gets or sets the first Y.</summary>
    [GraphInput(Title = "From Y")]
    public double FromY { get; set; }

    /// <summary>Gets or sets the last Y, the step permitting.</summary>
    [GraphInput(Title = "To Y")]
    public double ToY { get; set; } = 10;

    /// <summary>Gets or sets how far Y moves once X has been round.</summary>
    [GraphInput(Title = "Step Y", NoPin = true)]
    public double StepY { get; set; } = 1;

    /// <summary>Gets or sets the first Z.</summary>
    [GraphInput(Title = "From Z")]
    public double FromZ { get; set; }

    /// <summary>Gets or sets the last Z, the step permitting.</summary>
    [GraphInput(Title = "To Z")]
    public double ToZ { get; set; } = 10;

    /// <summary>Gets or sets how far Z moves once Y has been round.</summary>
    [GraphInput(Title = "Step Z", NoPin = true)]
    public double StepZ { get; set; } = 1;

    /// <summary>Gets or sets whether the box starts over after its last point rather than stopping there.</summary>
    [GraphInput(Title = "Start over", NoPin = true, Description = "After the last point, start again from the first rather than stopping.")]
    public bool Wrap { get; set; }

    /// <summary>Gets or sets where the next point stands, 0 for the first: how many the runs have handed out since it last started over.</summary>
    [GraphInput(Title = "Taken", State = true, Min = 0, Description = "Where the next point stands, 0 for the first; the reset starts over.")]
    public int Taken { get; set; }

    /// <summary>Gets or sets this run's X.</summary>
    [GraphOutput(Title = "X")]
    public double X { get; set; }

    /// <summary>Gets or sets this run's Y.</summary>
    [GraphOutput(Title = "Y")]
    public double Y { get; set; }

    /// <summary>Gets or sets this run's Z.</summary>
    [GraphOutput(Title = "Z")]
    public double Z { get; set; }

    /// <summary>Gets or sets whether this run handed out the last point.</summary>
    [GraphOutput(Title = "Wrapped")]
    public bool Wrapped { get; set; }

    /// <inheritdoc/>
    public bool HasMore { get; private set; }

    /// <inheritdoc/>
    public void Execute(UINodeRunContext context)
    {
        GridAxis x = GridAxis.Of("X", FromX, ToX, StepX);
        GridAxis y = GridAxis.Of("Y", FromY, ToY, StepY);
        GridAxis z = GridAxis.Of("Z", FromZ, ToZ, StepZ);
        GridWalk walk = GridWalk.Take(Taken, (long)x.Count * y.Count * z.Count, Wrap);

        X = x.At(walk.Point % x.Count);
        Y = y.At(walk.Point / x.Count % y.Count);
        Z = z.At(walk.Point / (x.Count * y.Count));
        (Taken, Wrapped, HasMore) = (walk.Taken, walk.Wrapped, walk.HasMore);
    }
}

/// <summary>One axis of a range, or a counter's values: how many it holds from its start to its end, and the value at each place.</summary>
internal readonly record struct GridAxis(double From, double To, double Step, int Count)
{
    // How near a step has to come to To to count as landing on it: 0.1 three times is not quite 0.3 in binary.
    private const double Tolerance = 1e-9;

    // A grid is walked one run a point, so an axis far longer than this is a mistake in its bounds, not a wish.
    private const int MaxCount = 1_000_000;

    public static GridAxis Of(string name, double from, double to, double step)
    {
        if (step == 0 || !double.IsFinite(step))
            throw new InvalidOperationException($"{name}'s step cannot be zero.");

        if (!double.IsFinite(from) || !double.IsFinite(to))
            throw new InvalidOperationException($"{name}'s From and To must be numbers.");

        // The last place that stays within To, counted once rather than found by adding up, which drifts.
        var last = Math.Floor(((to - from) / step) + Tolerance);

        if (last < 0)
            throw new InvalidOperationException($"{name} starts past its end: its step leads away from its To.");

        if (last >= MaxCount)
            throw new InvalidOperationException($"{name} holds more than {MaxCount} values: its step is too small for its bounds.");

        return new GridAxis(from, to, step, (int)last + 1);
    }

    /// <summary>The value at a place; the one landing on To is To itself, whatever the sum's rounding made of it.</summary>
    public double At(int place)
    {
        var value = From + (place * Step);

        return Math.Abs(value - To) <= Math.Abs(Step) * Tolerance ? To : value;
    }
}

/// <summary>One run's move through a range of <c>count</c> points: the point it hands out, and where that leaves the range.</summary>
internal readonly record struct GridWalk(int Point, int Taken, bool Wrapped, bool HasMore)
{
    public static GridWalk Take(int taken, long count, bool wrap)
    {
        if (count > int.MaxValue)
            throw new InvalidOperationException("The range holds too many points to walk one a run.");

        var total = (int)count;

        if (taken < 0 || taken >= total)
        {
            if (!wrap)
                throw new InvalidOperationException("The range is past its last point: Reset it from its menu to walk it again.");

            taken = 0;
        }

        var next = taken + 1;
        var wrapped = next == total;

        return new GridWalk(taken, wrapped && wrap ? 0 : next, wrapped, wrap || next < total);
    }
}
