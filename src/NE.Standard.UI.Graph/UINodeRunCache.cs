using System;
using System.Collections;
using System.Collections.Generic;
using System.Threading;

namespace NE.Standard.UI.Graph;

/// <summary>
/// What each node of a sheet last came to, for a runner (<see cref="UINodeRunner.Cache"/>) to hand on rather than run the node
/// again on the same inputs.
/// </summary>
/// <remarks>
/// One entry a node — its last run — so it grows no larger than the sheet; a node with state, or one marked
/// <see cref="GraphNodeAttribute.AlwaysRuns"/>, is never kept.
/// </remarks>
public sealed class UINodeRunCache
{
    private readonly Lock _sync = new();
    private readonly Dictionary<string, Entry> _entries = new(StringComparer.Ordinal);

    /// <summary>
    /// Forgets every node's last run, so the next run runs them all.
    /// </summary>
    public void Clear()
    {
        lock (_sync)
            _entries.Clear();
    }

    /// <summary>
    /// Forgets one node's last run.
    /// </summary>
    public void Forget(string nodeId)
    {
        lock (_sync)
            _ = _entries.Remove(nodeId);
    }

    internal bool TryGet(string nodeId, string type, object?[] inputs, out Entry entry)
    {
        lock (_sync)
        {
            if (_entries.TryGetValue(nodeId, out entry!) && string.Equals(entry.Type, type, StringComparison.Ordinal) && SameValues(entry.Inputs, inputs))
                return true;
        }

        entry = null!;
        return false;
    }

    private static bool SameValues(object?[] left, object?[] right)
    {
        if (left.Length != right.Length)
            return false;

        for (var i = 0; i < left.Length; i++)
        {
            if (!SameValue(left[i], right[i]))
                return false;
        }

        return true;
    }

    /// <summary>Equal values, a list — a pin taking several, a list pin — by its items rather than by reference.</summary>
    private static bool SameValue(object? left, object? right)
    {
        if (Equals(left, right))
            return true;

        if (left is not IEnumerable leftItems || right is not IEnumerable rightItems || left is string || right is string)
            return false;

        IEnumerator leftAt = leftItems.GetEnumerator();
        IEnumerator rightAt = rightItems.GetEnumerator();

        while (true)
        {
            var leftMoved = leftAt.MoveNext();

            if (leftMoved != rightAt.MoveNext())
                return false;

            if (!leftMoved)
                return true;

            if (!SameValue(leftAt.Current, rightAt.Current))
                return false;
        }
    }

    internal void Keep(string nodeId, Entry entry)
    {
        lock (_sync)
            _entries[nodeId] = entry;
    }

    /// <summary>Lets go of the nodes a sheet no longer holds.</summary>
    internal void Retain(IEnumerable<string> nodeIds)
    {
        HashSet<string> kept = new(nodeIds, StringComparer.Ordinal);

        lock (_sync)
        {
            foreach (var id in new List<string>(_entries.Keys))
            {
                if (!kept.Contains(id))
                    _ = _entries.Remove(id);
            }
        }
    }

    /// <summary>One node's last run: its kind, the inputs it ran on, what its outputs and display pins came to.</summary>
    internal sealed record Entry(string Type, object?[] Inputs, IReadOnlyDictionary<string, object?> Outputs, IReadOnlyList<KeyValuePair<string, object?>> Displays);
}
