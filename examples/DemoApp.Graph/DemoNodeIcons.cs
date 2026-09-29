namespace DemoApp.Graph;

/// <summary>
/// The glyphs the graph page draws, named for what they mean here — and the list the host registers, so a name on a module and
/// what the pack serves cannot drift apart.
/// </summary>
public static class DemoNodeIcons
{
    public const string AddNode = MaterialIcons.Add;

    /// <summary>The page's add button and the modules' glyphs; the canvas's built-in entries wear the framework's own.</summary>
    public static readonly string[] All =
    [
        AddNode,
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
