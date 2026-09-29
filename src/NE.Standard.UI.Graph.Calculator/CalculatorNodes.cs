using System;
using System.Collections.Generic;

namespace NE.Standard.UI.Graph.Calculator;

/// <summary>The calculator's kinds, for a catalogue beside an application's own.</summary>
/// <remarks>
/// They wear the core's own glyphs, so the host registers nothing for them. A number typed in is the canvas's own
/// <see cref="UINodeKinds"/> <c>NumberNode</c>.
/// </remarks>
public static class CalculatorNodes
{
    /// <summary>Where the kinds stand in the picker, each in a category under this one.</summary>
    public const string Category = "Calculator";

    /// <summary>The colour a kind working on numbers wears: the theme's own series, so it follows the page's theme.</summary>
    public const string NumberColor = "var(--ui-color-series-3)";

    /// <summary>The colour a kind that answers yes or no wears.</summary>
    public const string LogicColor = "var(--ui-color-series-4)";

    /// <summary>The colour a kind that writes its answer out wears.</summary>
    public const string OutputColor = "var(--ui-color-series-5)";

    /// <summary>Gets every kind of the calculator, for <see cref="UINodeCatalog.FromTypes"/>.</summary>
    public static IReadOnlyList<Type> Kinds { get; } =
    [
        typeof(OperationNode),
        typeof(RoundNode),
        typeof(SumNode),
        typeof(ClampNode),
        typeof(MinMaxNode),
        typeof(CompareNode),
        typeof(ResultNode)
    ];
}
