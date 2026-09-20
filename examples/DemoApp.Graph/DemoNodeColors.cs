namespace DemoApp.Graph;

/// <summary>
/// The colours this demo's kinds wear: the theme's own series, each kind taking the colour of the type it works on, so a chain
/// reads as one colour from the node that makes a value to the node that shows it. A raw hex would be nobody's theme.
/// </summary>
/// <remarks>
/// The same colours the canvas gives those types' pins, which is the point — a green pin runs between green nodes.
/// </remarks>
internal static class DemoNodeColors
{
    /// <summary>Numbers, and the arithmetic on them.</summary>
    public const string Number = "var(--ui-color-series-3)";

    /// <summary>Text, and the nodes that write it out.</summary>
    public const string Text = "var(--ui-color-series-5)";

    /// <summary>Pictures.</summary>
    public const string Picture = "var(--ui-color-series-1)";

    /// <summary>Whatever reaches it: a kind that works on any type at all wears the neutral the universal pin wears.</summary>
    public const string Any = "var(--ui-text-muted)";
}
