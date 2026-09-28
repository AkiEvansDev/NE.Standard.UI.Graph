namespace NE.Standard.UI.Graph;

/// <summary>
/// Where a node stands in a run, which its frame takes its colour from.
/// </summary>
public enum UINodeState
{
    /// <summary>Nothing is happening; no status is drawn.</summary>
    Idle,

    /// <summary>Running now; the run line names it, with the node's own progress and message.</summary>
    Running,

    /// <summary>Ran through.</summary>
    Done,

    /// <summary>Failed, or could not run; why is a line of the log.</summary>
    Error,

    /// <summary>Never reached: something the node is fed by failed, so the run went round it.</summary>
    Skipped,

    /// <summary>Not run: its inputs were the ones it last ran on, so what it came to then was handed on (<see cref="UINodeRunCache"/>).</summary>
    Cached
}
