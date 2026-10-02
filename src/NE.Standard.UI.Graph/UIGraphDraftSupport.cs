using System;
using System.Collections.Generic;
using NE.Standard.UI.Abstractions.Binding;

namespace NE.Standard.UI.Graph;

/// <summary>
/// The overlay-by-key plumbing both drafts share: reading a list off the wire, removing keys, finding an entry by key, comparing
/// value lists.
/// </summary>
/// <remarks>Each draft's own <c>ApplyTo</c> covers what differs between a node and a craft.</remarks>
internal static class UIGraphDraftSupport
{
    /// <summary>The entries of a list as the wire may send it: none for none, and an entry sent as nothing left out.</summary>
    public static TEntry[] Present<TEntry>(TEntry[]? entries)
        where TEntry : class
        => entries is null ? [] : Array.TrueForAll(entries, static entry => entry is not null) ? entries : Array.FindAll(entries, static entry => entry is not null);

    /// <summary>Takes every entry whose key the draft removed out of the list, from the end so the indexes hold.</summary>
    public static HashSet<string> RemoveAll<TEntry>(IList<TEntry> entries, string[] removed)
        where TEntry : IBindableItem
    {
        HashSet<string> keys = new(removed, StringComparer.Ordinal);

        for (var index = entries.Count - 1; index >= 0; index--)
        {
            if (keys.Contains(entries[index].Id))
                entries.RemoveAt(index);
        }

        return keys;
    }

    /// <summary>The entry of that key, or null.</summary>
    public static TEntry? Find<TEntry>(IList<TEntry> entries, string id)
        where TEntry : class, IBindableItem
    {
        foreach (TEntry entry in entries)
        {
            if (string.Equals(entry.Id, id, StringComparison.Ordinal))
                return entry;
        }

        return null;
    }

    /// <summary>Whether two lists hold the same values in the same order; what an entry's list-valued property is compared by before it is rewritten.</summary>
    public static bool Same<TValue>(IReadOnlyList<TValue> left, TValue[] right)
        where TValue : IEquatable<TValue>
    {
        if (left.Count != right.Length)
            return false;

        for (var index = 0; index < right.Length; index++)
        {
            if (!EqualityComparer<TValue>.Default.Equals(left[index], right[index]))
                return false;
        }

        return true;
    }
}
