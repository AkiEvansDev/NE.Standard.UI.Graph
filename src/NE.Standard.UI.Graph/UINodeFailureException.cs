using System;

namespace NE.Standard.UI.Graph;

/// <summary>A node's deliberate failure: its message is what the viewer reads in the canvas's log.</summary>
/// <remarks>
/// Any other exception a node throws reaches the viewer by its type alone, unless the runner shows detail
/// (<see cref="UINodeRunner.IncludeExceptionDetail"/>): its message may name what only the server should see — a path, a host, a
/// query. The whole of it goes to the server's log.
/// </remarks>
public sealed class UINodeFailureException : Exception
{
    /// <summary>A failure that says nothing of its own.</summary>
    public UINodeFailureException()
    {
    }

    /// <summary>A failure the viewer reads as <paramref name="message"/>.</summary>
    public UINodeFailureException(string message) : base(message)
    {
    }

    /// <summary>A failure the viewer reads as <paramref name="message"/>, caused by <paramref name="innerException"/>.</summary>
    public UINodeFailureException(string message, Exception innerException) : base(message, innerException)
    {
    }
}
