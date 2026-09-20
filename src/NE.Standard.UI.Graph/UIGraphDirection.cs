namespace NE.Standard.UI.Graph;

/// <summary>
/// Which way the layered layout runs, from what nothing feeds to what feeds nothing.
/// </summary>
public enum UIGraphDirection
{
    /// <summary>The layers stand side by side, the first at the left.</summary>
    LeftToRight,

    /// <summary>The layers stand one under another, the first at the top.</summary>
    TopToBottom,

    /// <summary>The layers stand side by side, the first at the right — read from what feeds nothing back to what nothing feeds.</summary>
    RightToLeft,

    /// <summary>The layers stand one under another, the first at the bottom.</summary>
    BottomToTop
}
