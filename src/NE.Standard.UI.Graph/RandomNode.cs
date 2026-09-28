using System;
using NE.Standard.UI.Primitives.Constants;

namespace NE.Standard.UI.Graph;

/// <summary>
/// What becomes of a random number's seed after each run.
/// </summary>
public enum UIRandomMode
{
    /// <summary>The seed stays: every run draws the same number, until the seed is changed on the node.</summary>
    Fixed = 0,

    /// <summary>A new seed is drawn for the next run.</summary>
    Randomize = 1,

    /// <summary>The seed goes up by one.</summary>
    Increment = 2,

    /// <summary>The seed goes down by one.</summary>
    Decrement = 3,
}

/// <summary>
/// A number drawn at random between two ends, from a seed the sheet keeps: the same seed draws the same number, on any machine and
/// runtime, so a run can be made again, and the mode says what the seed becomes for the next run — the same, another drawn at
/// random, one more or one less. Neighbouring seeds draw numbers with nothing to do with each other.
/// </summary>
[GraphNode(Key = NodeKey, Category = UINodeKinds.ValuesCategory, Title = "Random", Description = "A number drawn at random, from a seed the sheet keeps.", Icon = UIGlyphs.Dice, Color = "var(--ui-color-series-3)")]
public sealed class RandomNode : IGraphNode
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "graph.random";

    /// <summary>Gets or sets the least number drawn.</summary>
    [GraphInput(Title = "From")]
    public double From { get; set; }

    /// <summary>Gets or sets the greatest number drawn.</summary>
    [GraphInput(Title = "To")]
    public double To { get; set; } = 1;

    /// <summary>Gets or sets whether only whole numbers are drawn, both ends among them.</summary>
    [GraphInput(Title = "Whole numbers", NoPin = true)]
    public bool Whole { get; set; }

    /// <summary>Gets or sets what the seed becomes after the run.</summary>
    [GraphInput(Title = "After a run", NoPin = true)]
    public UIRandomMode Mode { get; set; } = UIRandomMode.Randomize;

    /// <summary>Gets or sets the seed the next run draws from.</summary>
    [GraphInput(Title = "Seed", State = true, Min = 0, Description = "What the next run draws from; the same seed draws the same number.")]
    public int Seed { get; set; }

    /// <summary>Gets or sets the number drawn.</summary>
    [GraphOutput(Title = "Value")]
    public double Value { get; set; }

    /// <summary>Gets or sets the seed it was drawn from, to draw it again.</summary>
    [GraphOutput(Title = "Seed used")]
    public int Used { get; set; }

    /// <inheritdoc/>
    [System.Diagnostics.CodeAnalysis.SuppressMessage("Security", "CA5394:Do not use insecure randomness", Justification = "A sheet's random numbers are seeded to be drawn again; nothing secret rests on them.")]
    public void Execute(UINodeRunContext context)
    {
        var low = Math.Min(From, To);
        var high = Math.Max(From, To);
        var draw = Draw(Seed);

        Used = Seed;
        Value = Whole ? DrawWhole(low, high, draw) : low + (draw * (high - low));
        Seed = Mode switch
        {
            UIRandomMode.Randomize => Random.Shared.Next(),
            UIRandomMode.Increment => Seed == int.MaxValue ? 0 : Seed + 1,
            UIRandomMode.Decrement => Seed == 0 ? int.MaxValue : Seed - 1,
            _ => Seed
        };
    }

    /// <summary>
    /// A number in [0, 1) mixed out of the seed (SplitMix64): a fixed algorithm rather than a seeded <see cref="Random"/>, whose
    /// numbers for seeds side by side fall into a pattern and are not promised to stay the same from one .NET to the next.
    /// </summary>
    private static double Draw(int seed)
    {
        var mixed = unchecked((uint)seed + 0x9E3779B97F4A7C15UL);

        mixed = unchecked((mixed ^ (mixed >> 30)) * 0xBF58476D1CE4E5B9UL);
        mixed = unchecked((mixed ^ (mixed >> 27)) * 0x94D049BB133111EBUL);
        mixed ^= mixed >> 31;

        return (mixed >> 11) * (1.0 / (1UL << 53));
    }

    private static double DrawWhole(double low, double high, double draw)
    {
        var first = Math.Ceiling(low);
        var last = Math.Floor(high);

        return first <= last
            ? Math.Min(first + Math.Floor(draw * (last - first + 1)), last)
            : throw new InvalidOperationException("No whole number lies between From and To.");
    }
}
