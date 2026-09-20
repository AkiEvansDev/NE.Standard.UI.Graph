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
    /// <summary>
    /// Gets the empty draft.
    /// </summary>
    public static UIGraphDraft Empty { get; } = new();

    /// <summary>
    /// Gets every node the viewer added or changed, as the viewer left it.
    /// </summary>
    public UIGraphNodeDraft[] Nodes { get; } = nodes ?? [];

    /// <summary>
    /// Gets the keys of the nodes the viewer removed.
    /// </summary>
    public string[] Removed { get; } = removed ?? [];

    /// <summary>
    /// Gets whether the viewer changed nothing.
    /// </summary>
    [JsonIgnore]
    public bool IsEmpty => Nodes.Length == 0 && Removed.Length == 0;

    /// <summary>
    /// Applies the draft to an application's nodes: removed nodes go, changed ones take the viewer's state, added ones join, and
    /// links to removed nodes are dropped. Only differing properties are written.
    /// </summary>
    public void ApplyTo(IList<UIGraphNode> nodes)
    {
        ArgumentNullException.ThrowIfNull(nodes);

        HashSet<string> removed = UIGraphDraftSupport.RemoveAll(nodes, Removed);

        foreach (UIGraphNodeDraft draft in Nodes)
        {
            if (removed.Contains(draft.Id))
                continue;

            UIGraphNode? node = UIGraphDraftSupport.Find(nodes, draft.Id);

            if (node is null)
            {
                node = new UIGraphNode(draft.Id);
                nodes.Add(node);
            }

            draft.WriteTo(node);
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
    }

}

/// <summary>
/// One node as the viewer left it: its whole state, whether it was added, and the server's node as of the viewer's first change
/// (for conflict detection).
/// </summary>
[method: JsonConstructor]
public sealed class UIGraphNodeDraft(
    string id,
    string? title = null,
    string? subtitle = null,
    string? icon = null,
    string? image = null,
    UIGraphNodeShape? shape = null,
    string? color = null,
    string? badge = null,
    string? tooltip = null,
    UIGraphLink[]? links = null,
    bool created = false,
    string? baseline = null)
{
    /// <summary>Gets the node's key.</summary>
    public string Id { get; } = id;

    /// <summary>Gets the node's title.</summary>
    public string? Title { get; } = title;

    /// <summary>Gets the line under the title.</summary>
    public string? Subtitle { get; } = subtitle;

    /// <summary>Gets the node's icon.</summary>
    public string? Icon { get; } = icon;

    /// <summary>Gets the address of the node's picture.</summary>
    public string? Image { get; } = image;

    /// <summary>Gets the node's own shape.</summary>
    public UIGraphNodeShape? Shape { get; } = shape;

    /// <summary>Gets the node's colour.</summary>
    public string? Color { get; } = color;

    /// <summary>Gets the node's badge.</summary>
    public string? Badge { get; } = badge;

    /// <summary>Gets the node's tooltip.</summary>
    public string? Tooltip { get; } = tooltip;

    /// <summary>Gets the links the node leaves by.</summary>
    public UIGraphLink[] Links { get; } = links ?? [];

    /// <summary>Gets whether the viewer added the node rather than changed one the application had.</summary>
    public bool Created { get; } = created;

    /// <summary>Gets the application's node, as the browser read it, when the viewer first changed it; unset for a node the viewer added.</summary>
    public string? Baseline { get; } = baseline;

    /// <summary>Writes this state onto a node, property by property, leaving alone what already matches.</summary>
    public void WriteTo(UIGraphNode node)
    {
        ArgumentNullException.ThrowIfNull(node);

        if (node.Title != Title)
            node.Title = Title;

        if (node.Subtitle != Subtitle)
            node.Subtitle = Subtitle;

        if (node.Icon != Icon)
            node.Icon = Icon;

        if (node.Image != Image)
            node.Image = Image;

        if (node.Shape != Shape)
            node.Shape = Shape;

        if (node.Color != Color)
            node.Color = Color;

        if (node.Badge != Badge)
            node.Badge = Badge;

        if (node.Tooltip != Tooltip)
            node.Tooltip = Tooltip;

        if (!UIGraphDraftSupport.Same(node.Links, Links))
            node.Links = Links;
    }
}
