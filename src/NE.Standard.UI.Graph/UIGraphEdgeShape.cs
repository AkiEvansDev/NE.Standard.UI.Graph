namespace NE.Standard.UI.Graph;

/// <summary>
/// How an edge is drawn between two pins.
/// </summary>
public enum UIGraphEdgeShape
{
    /// <summary>A curve leaving each pin sideways.</summary>
    Bezier,

    /// <summary>A straight line from pin to pin.</summary>
    Straight,

    /// <summary>Horizontal and vertical runs with square corners.</summary>
    Orthogonal
}

/// <summary>
/// What a node's status line says about it — the frame takes the colour.
/// </summary>
public enum UINodeState
{
    /// <summary>Nothing is happening; no status is drawn.</summary>
    Idle,
    Running,
    Done,
    Error,

    /// <summary>Never reached: something the node is fed by failed, so the run went round it.</summary>
    Skipped
}
