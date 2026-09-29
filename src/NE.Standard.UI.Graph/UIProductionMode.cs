namespace NE.Standard.UI.Graph;

/// <summary>
/// Which of its two uses a production graph is put to.
/// </summary>
public enum UIProductionMode
{
    /// <summary>The catalogue as it is: every resource and craft, one run's amounts on the edges, edited where the graph allows it.</summary>
    Constructor,

    /// <summary>
    /// A plan over the catalogue: the viewer names target amounts, and the graph draws the crafts and resources that reach them.
    /// </summary>
    /// <remarks>
    /// A panel sums up what is brought in, made, taken and left over. Nothing is edited here; with no reachable target, the sheet
    /// is empty.
    /// </remarks>
    Plan
}
