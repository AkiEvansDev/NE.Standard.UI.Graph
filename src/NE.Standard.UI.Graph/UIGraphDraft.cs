using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace NE.Standard.UI.Graph;

/// <summary>
/// Nodes the viewer added, changed or removed since the last save. A save hands it to the application to apply, or refuse, then
/// the layout returns without it.
/// </summary>
[method: JsonConstructor]
public sealed class UIGraphDraft(UIGraphNodeDraft[]? nodes = null, string[]? removed = null)
{
    /// <summary>The most nodes a graph holds once a draft is applied, unless the caller says otherwise.</summary>
    public const int DefaultMaxNodes = 10_000;

    /// <summary>
    /// Gets the empty draft.
    /// </summary>
    public static UIGraphDraft Empty { get; } = new();

    /// <summary>
    /// Gets every node the viewer added or changed, as the viewer left it.
    /// </summary>
    public UIGraphNodeDraft[] Nodes { get; } = UIGraphDraftSupport.Present(nodes);

    /// <summary>
    /// Gets the keys of the nodes the viewer removed.
    /// </summary>
    public string[] Removed { get; } = UIGraphDraftSupport.Present(removed);

    /// <summary>
    /// Gets whether the viewer changed nothing.
    /// </summary>
    [JsonIgnore]
    public bool IsEmpty => Nodes.Length == 0 && Removed.Length == 0;

    /// <summary>
    /// Applies the draft to an application's nodes, while the canvas lets them be edited: removed nodes go, changed ones take the
    /// viewer's name, colour and links, added ones join, and links to removed nodes are dropped.
    /// </summary>
    /// <remarks>
    /// The draft is the browser's, so it is held to what the canvas edits: refused whole, and nothing written, while
    /// <paramref name="editStructure"/> is off or once the nodes would pass <paramref name="maxNodes"/>; a colour that is neither one
    /// of <paramref name="colorChoices"/> (the canvas's defaults when null) nor one a node already wears is dropped; an added node
    /// keeps what else it carries only as a copy of a node already there, as Duplicate makes one. Only differing properties are written.
    /// </remarks>
    /// <returns>Whether the draft was applied.</returns>
    public bool ApplyTo(IList<UIGraphNode> nodes, bool editStructure, IReadOnlyList<UIGraphColorChoice>? colorChoices = null, int maxNodes = DefaultMaxNodes)
    {
        ArgumentNullException.ThrowIfNull(nodes);
        ArgumentOutOfRangeException.ThrowIfNegative(maxNodes);

        if (!editStructure || CountAfter(nodes) > maxNodes)
            return false;

        HashSet<string> colors = UIGraphDraftSupport.AllowedColors(colorChoices, nodes, static node => node.Color);
        HashSet<UIGraphNodeLooks> looks = [];

        foreach (UIGraphNode node in nodes)
            _ = looks.Add(UIGraphNodeLooks.Of(node));

        HashSet<string> removed = UIGraphDraftSupport.RemoveAll(nodes, Removed);

        // The draft is the browser's: a node it sent with no key is no node.
        foreach (UIGraphNodeDraft draft in Nodes)
        {
            if (string.IsNullOrEmpty(draft.Id) || removed.Contains(draft.Id))
                continue;

            UIGraphNode? node = UIGraphDraftSupport.Find(nodes, draft.Id);

            if (node is null)
            {
                node = new UIGraphNode(draft.Id);
                nodes.Add(node);

                if (looks.Contains(draft.Looks))
                    draft.Looks.WriteTo(node);
            }

            draft.WriteTo(node, colors);
        }

        HashSet<string> present = new(StringComparer.Ordinal);

        foreach (UIGraphNode node in nodes)
            _ = present.Add(node.Id);

        foreach (UIGraphNode node in nodes)
        {
            List<UIGraphLink> kept = [];

            foreach (UIGraphLink link in node.Links)
            {
                if (present.Contains(link.To))
                    kept.Add(link);
            }

            if (kept.Count != node.Links.Count)
                node.Links = kept;
        }

        return true;
    }

    /// <summary>How many nodes the list would hold once the draft is applied: less those it removes, and the keys it adds.</summary>
    private int CountAfter(IList<UIGraphNode> nodes)
    {
        HashSet<string> keys = new(StringComparer.Ordinal);

        foreach (UIGraphNode node in nodes)
            _ = keys.Add(node.Id);

        foreach (UIGraphNodeDraft draft in Nodes)
        {
            if (!string.IsNullOrEmpty(draft.Id))
                _ = keys.Add(draft.Id);
        }

        foreach (var id in Removed)
            _ = keys.Remove(id);

        return keys.Count;
    }
}

/// <summary>
/// One node as the viewer left it: its whole state, whether it was added, and the server's node as of the viewer's first change
/// (for conflict detection).
/// </summary>
[method: JsonConstructor]
public sealed class UIGraphNodeDraft(string id, string? title = null, string? description = null, string? icon = null, string? image = null, UIGraphNodeShape? shape = null, string? color = null, string? badgeTitle = null, string? tooltip = null, UIGraphLink[]? links = null, bool created = false, string? baseline = null)
{
    /// <summary>Gets the node's key.</summary>
    public string Id { get; } = id;

    /// <summary>Gets the node's title.</summary>
    public string? Title { get; } = title;

    /// <summary>Gets the line under the title.</summary>
    public string? Description { get; } = description;

    /// <summary>Gets the node's icon.</summary>
    public string? Icon { get; } = icon;

    /// <summary>Gets the address of the node's picture.</summary>
    public string? Image { get; } = image;

    /// <summary>Gets the node's own shape.</summary>
    public UIGraphNodeShape? Shape { get; } = shape;

    /// <summary>Gets the node's colour.</summary>
    public string? Color { get; } = color;

    /// <summary>Gets the short text the node's card carries at its end.</summary>
    public string? BadgeTitle { get; } = badgeTitle;

    /// <summary>Gets the node's tooltip.</summary>
    public string? Tooltip { get; } = tooltip;

    /// <summary>Gets the links the node leaves by.</summary>
    /// <remarks>As the browser sent them, less a link it sent as nothing, with no key or to no node.</remarks>
    public UIGraphLink[] Links { get; } = links is null ? [] : Array.FindAll(links, static link => !string.IsNullOrEmpty(link?.Id) && !string.IsNullOrEmpty(link.To));

    /// <summary>Gets whether the viewer added the node rather than changed one the application had.</summary>
    public bool Created { get; } = created;

    /// <summary>Gets the application's node, as the browser read it, when the viewer first changed it; unset for a node the viewer added.</summary>
    public string? Baseline { get; } = baseline;

    /// <summary>What the node carries beside what the canvas edits.</summary>
    internal UIGraphNodeLooks Looks => new(Description, Icon, Image, Shape, BadgeTitle, Tooltip);

    /// <summary>Writes what the canvas edits onto a node — its name, a colour <paramref name="colors"/> holds, its links — each setter leaving alone what already matches.</summary>
    internal void WriteTo(UIGraphNode node, HashSet<string> colors)
    {
        node.Title = Title;

        if (Color is null || colors.Contains(Color))
            node.Color = Color;

        if (!UIGraphDraftSupport.Same(node.Links, Links))
            node.Links = Links;
    }
}

/// <summary>What a node carries beside what the canvas edits: what an added node keeps only as a copy of a node already there.</summary>
internal readonly record struct UIGraphNodeLooks(string? Description, string? Icon, string? Image, UIGraphNodeShape? Shape, string? BadgeTitle, string? Tooltip)
{
    public static UIGraphNodeLooks Of(UIGraphNode node)
        => new(node.Description, node.Icon, node.Image, node.Shape, node.BadgeTitle, node.Tooltip);

    public void WriteTo(UIGraphNode node)
    {
        node.Description = Description;
        node.Icon = Icon;
        node.Image = Image;
        node.Shape = Shape;
        node.BadgeTitle = BadgeTitle;
        node.Tooltip = Tooltip;
    }
}
