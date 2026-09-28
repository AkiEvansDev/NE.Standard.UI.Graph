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
    public const string Goal = MaterialIcons.Flag;
    public const string Import = MaterialIcons.Upload;
    public const string Export = MaterialIcons.Download;
    public const string Picture = MaterialIcons.AddPhotoAlternate;
    public const string Arrange = MaterialIcons.Sort;
    public const string Fit = MaterialIcons.FitScreen;
    public const string Group = MaterialIcons.SelectAll;
    public const string Pin = MaterialIcons.Keep;
    public const string Swatch = MaterialIcons.Circle;

    /// <summary>The page's own controls, drawn outlined.</summary>
    public static readonly string[] Outlined = [Search, Add, Delete, Resource, Goal, Import, Export, Picture];

    /// <summary>The canvas's menu, the colours' dots and every glyph a resource can wear, drawn filled.</summary>
    public static string[] Filled()
    {
        var glyphs = new string[PlannerCatalogue.Icons.Length + 6];

        for (var i = 0; i < PlannerCatalogue.Icons.Length; i++)
            glyphs[i] = PlannerCatalogue.Icons[i].Glyph;

        glyphs[^6] = Swatch;
        glyphs[^5] = Goal;
        glyphs[^4] = Arrange;
        glyphs[^3] = Fit;
        glyphs[^2] = Group;
        glyphs[^1] = Pin;

        return glyphs;
    }
}
