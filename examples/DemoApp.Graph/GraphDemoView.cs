using System;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Text;

namespace DemoApp.Graph;

/// <summary>
/// What every page of the demo wears: the title band with the language and theme switchers, the sidebar naming the pages, and the
/// page filling what is left. The planner's pages first — an application on the production graph — then the layered graph's page; the node
/// canvas is a demo of its own, DemoApp.Nodes.
/// </summary>
public abstract class GraphDemoView : UIViewBase
{
    public const string ResourcesRoute = "/";
    public const string BuildsRoute = "/builds";
    public const string GraphRoute = "/graph";

    /// <summary>The two glyphs the theme switcher wears, which the host registers with the pack.</summary>
    public const string LightIcon = MaterialIcons.LightMode;
    public const string DarkIcon = MaterialIcons.DarkMode;

    /// <summary>The two glyphs a sample's source button and its copy button wear.</summary>
    public const string CodeIcon = MaterialIcons.Code;
    public const string CopyIcon = MaterialIcons.ContentCopy;

    /// <summary>The sidebar's authored id, stable across renders.</summary>
    private const string SidebarId = "graph-sidebar";

    // A route of null is a heading over the pages below it.
    private static readonly (string? Route, string Label)[] Pages =
    [
        (null, "planner.nav.planner"),
        (ResourcesRoute, "planner.page.resources"),
        (BuildsRoute, "planner.page.builds"),
        (null, "planner.nav.components"),
        (GraphRoute, "planner.page.graph")
    ];

    /// <summary>The title band and the sidebar stand, the sidebar from the top of the page; the content scrolls by itself.</summary>
    public override UIViewOptions Options { get; } = new() { StickyHeader = true, ScrollContentOnly = true, ShellLayout = UIShellLayout.FullHeightSides };

    protected abstract string Route { get; }
    public abstract override string Title { get; }
    protected abstract string Description { get; }

    /// <summary>
    /// The page band from the preset, with a sample page's source behind a button before the language and theme switchers; the
    /// switchers are on every page, since both are the framework's state. The planner's pages are an application, not a sample, and
    /// show no source.
    /// </summary>
    /// <remarks>The page is asked for twice, here for its source and in the content for itself: a component has one owner, so the two
    /// cannot share one build.</remarks>
    protected override IVisualComponent? CreateHeader()
    {
        ThemeSwitcherComponent theme = new ThemeSwitcherComponent()
            .SetLightIcon(MaterialIcons.Outlined(LightIcon))
            .SetDarkIcon(MaterialIcons.Outlined(DarkIcon));

        return CreatePage().Code is { } code
            ? PageHeader(Title, Description, CreateCodeFlyout(code).SetVerticalAlignment(UIAlignment.Center), new LanguageSwitcherComponent(), theme)
            : PageHeader(Title, Description, new LanguageSwitcherComponent(), theme);
    }

    /// <summary>
    /// The page band: the name with the switchers at the far end of its row at every width, and the muted line under them — on a phone
    /// the name a title's size and the line one line, cut, so the band stays about a title's height and leaves the screen to the page;
    /// from a medium screen the name in the display role and the line up to three lines.
    /// </summary>
    /// <remarks>
    /// <c>UIPage.Header</c>'s band, kept on one row on a phone too: there the preset folds the far end under the line, which took a
    /// third of a phone's height.
    /// </remarks>
    private static ContainerComponent PageHeader(string title, string description, params IVisualComponent[] trailing)
        => new ContainerComponent()
            .SetPadding(UIResponsive<UIThickness>.Create(UIThickness.All(24, 8, 16, 4), md: UIThickness.All(24, 20, 24, 4)))
            .SetColumn(24, UIGridUnit.Auto())
            // On a phone a name too long for its row wraps under itself rather than losing its end, its first line level with the
            // switchers, which stand at the row's top.
            .AddChild(PageTitle(title, UIResponsive<UIVisibility>.Create(UIVisibility.Visible, md: UIVisibility.Collapsed))
                .AsTitle()
                .SetTitleWrap(true)
                .SetVerticalAlignment(UIAlignment.Start)
                .SetMargin(UIThickness.All(0, PhoneTitleInset, 0, 0))
            )
            .AddChild(PageTitle(title, UIResponsive<UIVisibility>.Create(UIVisibility.Collapsed, md: UIVisibility.Visible)).AsDisplay())
            .AddChild(PageDescription(description, 1, UIResponsive<UIVisibility>.Create(UIVisibility.Visible, md: UIVisibility.Collapsed)).SetPlacement(1, 2, 24, 1))
            .AddChild(PageDescription(description, 3, UIResponsive<UIVisibility>.Create(UIVisibility.Collapsed, md: UIVisibility.Visible)).SetPlacement(1, 2, 23, 1))
            .AddChild(new StackPanelComponent()
                .SetOrientation(UIOrientation.Horizontal)
                .SetSpacing(UIResponsive<double>.Create(8, md: 12))
                .SetMargin(UIResponsive<UIThickness>.Create(UIThickness.All(8, 0, 0, 0), md: UIThickness.All(12, 0, 0, 0)))
                .SetHorizontalAlignment(UIAlignment.End)
                .SetVerticalAlignment(UIAlignment.Start)
                .AddChildren(trailing)
                .SetPlacement(24, 1, 1, 1)
            );

    // Half the switchers' 40 px less the name's 28 px line: a one-line name stands in their middle, a wrapped one's first line too.
    private const double PhoneTitleInset = 6;

    /// <summary>The page's name, where <paramref name="visibility"/> shows it.</summary>
    private static TextComponent PageTitle(string title, UIResponsive<UIVisibility> visibility)
        => new TextComponent()
            .SetTitle(title)
            .SetTitleColor(UIThemeColor.OnBackground)
            .SetVerticalAlignment(UIAlignment.Center)
            .SetVisibility(visibility)
            .SetPlacement(1, 1, 23, 1);

    /// <summary>The muted line under the name, at most <paramref name="lines"/> lines, where <paramref name="visibility"/> shows it.</summary>
    private static ParagraphComponent PageDescription(string description, int lines, UIResponsive<UIVisibility> visibility)
        => new ParagraphComponent()
            .SetDescription(description)
            .SetMaxLines(lines)
            .SetDescriptionType(UITextAppearance.Body)
            .SetDescriptionColor(UIThemeColor.Muted)
            .SetVisibility(visibility);

    /// <summary>
    /// The <c>&lt;/&gt;</c> button and the popup it opens: the sample's source, read-only, with a copy button.
    /// </summary>
    /// <remarks>A copy of the framework demo's own (<c>DemoUI</c>): every demo carries its shell whole rather than share a package for it.</remarks>
    private static FlyoutComponent CreateCodeFlyout(string expression)
    {
        var source = FormatSource(expression);
        var lines = source.Count(static c => c == '\n') + 1;

        return new FlyoutComponent()
            .SetFlyoutPlacement(UIPopupPlacement.BottomEnd)
            .SetHorizontalAlignment(UIAlignment.End)
            .SetVerticalAlignment(UIAlignment.Start)
            .SetAnchor(new ButtonComponent()
                .SetType(UIButtonType.Ghost)
                .SetSize(UIButtonSize.Small)
                .SetIcon(MaterialIcons.Outlined(CodeIcon))
                .SetTooltip("planner.code")
            )
            .SetContent(new ContainerComponent()
                .SetWidth(UILayoutLength.Absolute(640))
                .AddChild(new CodeInputComponent()
                    .SetLanguage(UICodeLanguages.CSharp)
                    .SetValue(source)
                    .SetIsReadOnly(true)
                    .SetStatusBar(false)
                    .SetSearch(false)
                    .SetCompletions(false)
                    // One row over the text's own: a long line brings a horizontal scrollbar, which would cover the last one.
                    .SetRows(Math.Clamp(lines + 1, 3, 24))
                    .SetPlacement(1, 1, 24, 1)
                )
                // A literal rather than the field's value: the text is fixed, and a literal needs no id unique across the page.
                .AddChild(new ButtonComponent()
                    .SetType(UIButtonType.Ghost)
                    .SetSize(UIButtonSize.Small)
                    .SetIcon(MaterialIcons.Outlined(CopyIcon))
                    .SetTooltip("planner.copy")
                    .SetHorizontalAlignment(UIAlignment.End)
                    .SetVerticalAlignment(UIAlignment.Start)
                    // Clear of the text's vertical scrollbar, which runs down the same edge once the source is longer than the box.
                    .SetMargin(UIThickness.All(4, 4, 16, 4))
                    .InteractOn(EventNames.Click, CopyToClipboardEffect.Literal(source))
                    .SetPlacement(1, 1, 24, 1)
                )
            );
    }

    /// <summary>
    /// The captured argument as it would be written on its own: the first line flush left, the rest moved by as much.
    /// </summary>
    /// <remarks>
    /// The compiler hands over the text with the call site's indentation on every line but the first, so the base is found from the
    /// first line at the expression's own depth: a closing bracket stands on the base, a chained call one step (four spaces) in.
    /// </remarks>
    private static string FormatSource(string expression)
    {
        var lines = expression.Trim().Replace("\r\n", "\n", StringComparison.Ordinal).Split('\n');
        var cut = BaseIndent(lines);
        StringBuilder text = new(lines[0].TrimEnd());

        for (var i = 1; i < lines.Length; i++)
        {
            var line = lines[i].TrimEnd();
            var indent = line.Length - line.TrimStart().Length;
            _ = text.Append('\n').Append(line[Math.Min(indent, cut)..]);
        }

        return text.ToString();
    }

    private static int BaseIndent(string[] lines)
    {
        var depth = CountDepth(lines[0], 0);
        var fallback = int.MaxValue;

        for (var i = 1; i < lines.Length; i++)
        {
            var body = lines[i].TrimStart();

            if (body.Length == 0)
                continue;

            var indent = lines[i].Length - body.Length;
            var closers = 0;

            while (closers < body.Length && body[closers] is ')' or ']' or '}')
                closers++;

            if (depth - closers <= 0)
                return closers > 0 ? indent : Math.Max(0, indent - 4);

            fallback = Math.Min(fallback, indent);
            depth = CountDepth(lines[i], depth);
        }

        return fallback == int.MaxValue ? 0 : Math.Max(0, fallback - 4);
    }

    /// <summary>
    /// The bracket depth after a line, skipping string and character literals and a trailing line comment.
    /// </summary>
    private static int CountDepth(string line, int depth)
    {
        for (var i = 0; i < line.Length; i++)
        {
            var c = line[i];

            if (c is '"' or '\'')
            {
                for (i++; i < line.Length && line[i] != c; i++)
                {
                    if (line[i] == '\\')
                        i++;
                }
            }
            else if (c == '/' && i + 1 < line.Length && line[i + 1] == '/')
            {
                break;
            }
            else if (c is '(' or '[' or '{')
            {
                depth++;
            }
            else if (c is ')' or ']' or '}')
            {
                depth--;
            }
        }

        return depth;
    }

    /// <summary>The sidebar every page wears: the pages under their headings, the one being read marked.</summary>
    protected override IVisualComponent? CreateLeftSide()
    {
        MenuItem[] entries = new MenuItem[Pages.Length];

        for (var i = 0; i < Pages.Length; i++)
        {
            entries[i] = Pages[i].Route is { } route
                ? new MenuItem { Id = route, Title = Pages[i].Label, Url = route, Selected = route == Route }
                : new MenuItem { Id = Pages[i].Label, Kind = UIMenuItemKind.Header, Title = Pages[i].Label };
        }

        // The width sits on the menu, not the container.
        return new ContainerComponent()
            .SetHorizontalAlignment(UIAlignment.Start)
            .SetPadding(UIThickness.All(16, 16, 16, 24))
            .AddChild(new MenuComponent(SidebarId)
                .SetShowCollapseToggle(true)
                .SetSearch()
                .SetMinWidth(UILayoutLength.Absolute(180))
                .SetItems(entries)
            );
    }

    /// <summary>
    /// The page's height where it keeps to the region and scrolls its own panes, as an application whose panes each fill the page
    /// does; where none (Auto, or null), the page grows past the region when it is taller, and the region scrolls it.
    /// </summary>
    protected virtual UIResponsive<UILayoutLength>? PageHeight => UILayoutLength.Fill();

    /// <summary>
    /// The content fills at least the region it scrolls in, so a canvas takes the whole height; kept to it where the page says
    /// (<see cref="PageHeight"/>), else grown past it by a page taller than the region, which then scrolls rather than squeezing the
    /// page's rows.
    /// </summary>
    protected override IVisualComponent CreateContent()
        => new ContainerComponent()
            .SetPadding(UIThickness.All(24, 4, 24, 24))
            .SetHeight(PageHeight)
            .SetMinHeight(UILayoutLength.Fill())
            .AddChild(CreatePage().Content);

    /// <summary>The page's own content, filling the container it is given, with its source when it is a sample.</summary>
    protected abstract DemoPage CreatePage();

    /// <summary>A sample page's content, and the source the compiler captured for it.</summary>
    protected static DemoPage Page(IVisualComponent content, [CallerArgumentExpression(nameof(content))] string code = "")
        => new(content, code);

    /// <summary>An application page's content, which shows no source.</summary>
    protected static DemoPage App(IVisualComponent content)
        => new(content, null);

    /// <summary>A page, and its source when it has one to show.</summary>
    protected readonly record struct DemoPage(IVisualComponent Content, string? Code);
}
