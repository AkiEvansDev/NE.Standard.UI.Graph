namespace DemoApp.Nodes;

/// <summary>
/// The glyphs this demo's canvas commands draw, named for what they mean here — and the list the host registers, so a name on a
/// command and what the pack serves cannot drift apart.
/// </summary>
public static class NodesIcons
{
    public const string AddNode = MaterialIcons.Add;
    public const string Delete = MaterialIcons.Delete;
    public const string Group = MaterialIcons.SelectAll;
    public const string Arrange = MaterialIcons.Sort;
    public const string Fit = MaterialIcons.FitScreen;
    public const string Save = MaterialIcons.Save;
    public const string Run = MaterialIcons.Calculate;
    public const string Pin = MaterialIcons.Keep;
    public const string Rename = MaterialIcons.Edit;
    public const string Color = MaterialIcons.Palette;
    public const string Position = MaterialIcons.Visibility;
    public const string Reroute = MaterialIcons.AltRoute;
    public const string Reset = MaterialIcons.RestartAlt;

    /// <summary>The canvas's commands; the kinds' glyphs are their packages' to name.</summary>
    public static readonly string[] All =
    [
        AddNode,
        Delete,
        Group,
        Arrange,
        Fit,
        Save,
        Run,
        Pin,
        Rename,
        Color,
        Position,
        Reroute,
        Reset
    ];
}
