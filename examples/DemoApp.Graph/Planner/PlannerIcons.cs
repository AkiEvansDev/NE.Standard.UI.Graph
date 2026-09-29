namespace DemoApp.Graph.Planner;

/// <summary>
/// The glyphs the planner's pages draw, named for what they mean here — and the lists the host registers, so a name here and what
/// the pack serves cannot drift apart.
/// </summary>
public static class PlannerIcons
{
    public const string Search = MaterialIcons.Search;
    public const string Add = MaterialIcons.Add;
    public const string Delete = MaterialIcons.Delete;
    public const string Resource = MaterialIcons.Category;
    public const string Import = MaterialIcons.Upload;
    public const string Export = MaterialIcons.Download;
    public const string Picture = MaterialIcons.AddPhotoAlternate;
    public const string Swatch = MaterialIcons.Circle;

    /// <summary>The page's own controls, drawn outlined.</summary>
    public static readonly string[] Outlined = [Search, Add, Delete, Resource, Import, Export, Picture];

    /// <summary>The colours' dots and every glyph a resource can wear, drawn filled.</summary>
    public static string[] Filled()
    {
        var glyphs = new string[PlannerCatalogue.Icons.Length + 1];

        for (var i = 0; i < PlannerCatalogue.Icons.Length; i++)
            glyphs[i] = PlannerCatalogue.Icons[i].Glyph;

        glyphs[^1] = Swatch;

        return glyphs;
    }
}
