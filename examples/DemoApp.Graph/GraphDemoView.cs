using System;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Text;

namespace DemoApp.Graph;

/// <summary>
/// What every page of the demo wears: the title band with the theme switcher, the sidebar naming the pages, and the page filling
/// what is left. The planner's pages first — an application on the production graph — then the layered graph's page; the node
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
        (null, "Planner"),
        (ResourcesRoute, "Resources"),
        (BuildsRoute, "Builds"),
        (null, "Components"),
        (GraphRoute, "Graph")
    ];

    /// <summary>The title band and the sidebar stand, the sidebar from the top of the page; the content scrolls by itself.</summary>
    public override UIViewOptions Options { get; } = new() { StickyHeader = true, ScrollContentOnly = true, ShellLayout = UIShellLayout.FullHeightSides };

    protected abstract string Route { get; }
    public abstract override string Title { get; }
    protected abstract string Description { get; }

    /// <summary>
    /// The page band from the preset, with a sample page's source behind a button before the theme switcher; the switcher is on every
    /// page, since the theme is the framework's state. The planner's pages are an application, not a sample, and show no source.
    /// </summary>
    /// <remarks>The page is asked for twice, here for its source and in the content for itself: a component has one owner, so the two
    /// cannot share one build.</remarks>
    protected override IVisualComponent? CreateHeader()
    {
        ThemeSwitcherComponent theme = new ThemeSwitcherComponent()
            .SetLightIcon(MaterialIcons.Outlined(LightIcon))
            .SetDarkIcon(MaterialIcons.Outlined(DarkIcon));

        return CreatePage().Code is { } code
            ? UIPage.Header(Title, Description, CreateCodeFlyout(code).SetVerticalAlignment(UIAlignment.Center), theme)
            : UIPage.Header(Title, Description, theme);
    }

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
                .SetTooltip("Code")
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
                    .SetTooltip("Copy")
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

    /// <summary>The content fills the region it scrolls in, so a canvas takes the whole height.</summary>
    protected override IVisualComponent CreateContent()
        => new ContainerComponent()
            .SetPadding(UIThickness.All(24, 4, 24, 24))
            .SetHeight(UILayoutLength.Fill())
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
