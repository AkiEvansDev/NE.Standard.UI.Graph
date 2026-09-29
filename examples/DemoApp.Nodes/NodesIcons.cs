namespace DemoApp.Nodes;

/// <summary>
/// The glyphs this demo's own menu entries draw — and the list the host registers, so a name on an entry and what the pack serves
/// cannot drift apart. The canvas's built-in entries wear the framework's own glyphs.
/// </summary>
public static class NodesIcons
{
    public const string Run = MaterialIcons.Calculate;
    public const string Position = MaterialIcons.Visibility;

    /// <summary>The page's own entries; the kinds' glyphs are their packages' to name.</summary>
    public static readonly string[] All = [Run, Position];
}
