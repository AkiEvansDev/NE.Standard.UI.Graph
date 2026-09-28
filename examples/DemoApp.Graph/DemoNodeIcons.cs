namespace DemoApp.Graph;

/// <summary>
/// The glyphs the graph page draws, named for what they mean here — and the list the host registers, so a name on a module and
/// what the pack serves cannot drift apart.
/// </summary>
public static class DemoNodeIcons
{
    public const string AddNode = MaterialIcons.Add;
    public const string Delete = MaterialIcons.Delete;
    public const string Group = MaterialIcons.SelectAll;
    public const string Arrange = MaterialIcons.Sort;
    public const string Fit = MaterialIcons.FitScreen;
    public const string Save = MaterialIcons.Save;
    public const string Pin = MaterialIcons.Keep;
    public const string Rename = MaterialIcons.Edit;
    public const string Color = MaterialIcons.Palette;

    /// <summary>The canvas's commands and the modules' glyphs.</summary>
    public static readonly string[] All =
    [
        AddNode,
        Delete,
        Group,
        Arrange,
        Fit,
        Save,
        Pin,
        Rename,
        Color,
        MaterialIcons.DataObject,
        MaterialIcons.Storage,
        MaterialIcons.Schema,
        MaterialIcons.Terminal,
        MaterialIcons.Widgets,
        MaterialIcons.Security,
        MaterialIcons.Hub,
        MaterialIcons.Api,
        MaterialIcons.Web,
        MaterialIcons.AccountTree,
        MaterialIcons.Language,
        MaterialIcons.Cloud,
        MaterialIcons.Extension
    ];
}
