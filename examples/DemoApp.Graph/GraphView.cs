using System.Linq;

namespace DemoApp.Graph;

/// <summary>
/// The dependency graph: the graph's settings above, the modules filling the page, a form that adds a module below, and what the
/// server last heard under it — written out in one piece, since it is the source the page shows.
/// </summary>
internal sealed class GraphView : GraphDemoView, IUIViewDefinition
{
    // The canvas's least height, in rem; its row holds the same floor in pixels.
    private const double CanvasHeight = 24;

    public static string ViewKey => "graph.graph";

    protected override string Route => GraphRoute;

    public override string Title => "planner.page.graph";

    // A short or narrow screen cannot hold the rows around the canvas and its floor: the page grows past the region and scrolls.
    protected override UIResponsive<UILayoutLength>? PageHeight => null;

    protected override string Description
        => "planner.page.graph.description";

    protected override DemoPage CreatePage()
        => Page(new ContainerComponent()
            .SetHeight(UILayoutLength.Fill())
            .SetRow(1, UIGridUnit.Auto())
            // The canvas takes what the page leaves and never less than its floor; where the rows and the floor do not fit, the page
            // grows past the screen (PageHeight) and scrolls, every row at its own height.
            .AddRow(UIGridUnit.Star(min: CanvasHeight * 16))
            .AddRow(UIGridUnit.Auto())
            .AddRow(UIGridUnit.Auto())
            // Rows that wrap, each list kept with its caption: at a narrow width the switches and the button go under.
            .AddChild(UILayout.Row(16,
                    UILayout.Row(8,
                        new TextComponent()
                            .SetTitle("planner.graph.layers")
                            .SetTitleType(UITextAppearance.Body)
                            .SetVerticalAlignment(UIAlignment.Center),
                        new SelectComponent()
                            .SetOptions([
                                new OptionItem { Id = nameof(UIGraphDirection.LeftToRight), Title = "planner.graph.left-to-right" },
                                new OptionItem { Id = nameof(UIGraphDirection.TopToBottom), Title = "planner.graph.top-to-bottom" },
                                new OptionItem { Id = nameof(UIGraphDirection.RightToLeft), Title = "planner.graph.right-to-left" },
                                new OptionItem { Id = nameof(UIGraphDirection.BottomToTop), Title = "planner.graph.bottom-to-top" }
                            ])
                            .BindValue(nameof(DependenciesController.Direction))
                            .SetWidth(UILayoutLength.Absolute(160))
                            .SetVerticalAlignment(UIAlignment.Center)
                    ),
                    UILayout.Row(8,
                        new TextComponent()
                            .SetTitle("planner.graph.edges")
                            .SetTitleType(UITextAppearance.Body)
                            .SetVerticalAlignment(UIAlignment.Center),
                        new SelectComponent()
                            .SetOptions([
                                new OptionItem { Id = nameof(UIGraphEdgeShape.Bezier), Title = "planner.graph.curved" },
                                new OptionItem { Id = nameof(UIGraphEdgeShape.Straight), Title = "planner.graph.straight" },
                                new OptionItem { Id = nameof(UIGraphEdgeShape.Orthogonal), Title = "planner.graph.stepped" }
                            ])
                            .BindValue(nameof(DependenciesController.EdgeShape))
                            .SetWidth(UILayoutLength.Absolute(160))
                            .SetVerticalAlignment(UIAlignment.Center)
                    ),
                    UILayout.Row(8,
                        new TextComponent()
                            .SetTitle("planner.graph.nodes")
                            .SetTitleType(UITextAppearance.Body)
                            .SetVerticalAlignment(UIAlignment.Center),
                        new SelectComponent()
                            .SetOptions([
                                new OptionItem { Id = nameof(UIGraphNodeShape.Card), Title = "planner.graph.cards" },
                                new OptionItem { Id = nameof(UIGraphNodeShape.Icon), Title = "planner.graph.circles" }
                            ])
                            .BindValue(nameof(DependenciesController.NodeShape))
                            .SetWidth(UILayoutLength.Absolute(120))
                            .SetVerticalAlignment(UIAlignment.Center)
                    ),
                    new SwitchComponent()
                        .SetTitle("planner.graph.edit-structure")
                        .BindValue(nameof(DependenciesController.EditStructure))
                        .SetVerticalAlignment(UIAlignment.Center),
                    new SwitchComponent()
                        .SetTitle("planner.graph.read-only")
                        .BindValue(nameof(DependenciesController.ReadOnly))
                        .SetVerticalAlignment(UIAlignment.Center),
                    new ButtonComponent()
                        .SetTitle("planner.graph.forget-layout")
                        .SetType(UIButtonType.Outline)
                        .OnClick(nameof(DependenciesController.ResetLayout))
                        .SetVerticalAlignment(UIAlignment.Center)
                )
                .SetMargin(UIThickness.All(0, 0, 0, 12))
                .SetPlacement(1, 1, 24, 1)
            )
            .AddChild(new LayeredGraphComponent(DependenciesController.CanvasId)
                .BindItems(nameof(DependenciesController.Modules))
                .SetCanvasHeight(CanvasHeight)
                .SetHeight(UILayoutLength.Fill())
                .SetShowMinimap(true)
                // Out past the default quarter: the modules side by side are wider than a phone's canvas at a quarter of their size.
                .SetZoomRange(0.1, 2.5)
                // The layout is the viewer's until a save sends it; the modules are the server's and arrive as they change.
                .SetFormId(DependenciesController.CanvasForm)
                .BindValue(nameof(DependenciesController.Layout), mode: UIBindingMode.OnSubmit)
                .BindDirection(nameof(DependenciesController.Direction))
                .BindNodeShape(nameof(DependenciesController.NodeShape))
                .BindEdgeShape(nameof(DependenciesController.EdgeShape))
                .BindIsReadOnly(nameof(DependenciesController.ReadOnly))
                .BindEditStructure(nameof(DependenciesController.EditStructure))
                .OnSave(nameof(DependenciesController.Save))
                .OnNodeClick(nameof(DependenciesController.ModuleClicked))
                .SetPlacement(1, 2, 24, 1)
            )
            // Wraps as the toolbar does: at a narrow width the buttons go under the two fields.
            .AddChild(UILayout.Row(12,
                    new TextInputComponent()
                        .SetTitle("planner.graph.module")
                        .SetTitlePlacement(UIInputTitlePlacement.Inside)
                        .BindValue(nameof(DependenciesController.NewModule))
                        .SetWidth(UILayoutLength.Absolute(200))
                        .SetVerticalAlignment(UIAlignment.Center),
                    new SelectComponent()
                        .SetTitle("planner.graph.built-on")
                        .SetTitlePlacement(UIInputTitlePlacement.Inside)
                        .SetOptions(DependenciesController.Choices.Select(static choice => new OptionItem { Id = choice.Id, Title = choice.Title, IsContent = true }))
                        .BindValue(nameof(DependenciesController.UsedModule))
                        .SetWidth(UILayoutLength.Absolute(220))
                        .SetVerticalAlignment(UIAlignment.Center),
                    new ButtonComponent()
                        .SetTitle("planner.graph.add-module")
                        .SetIcon(DemoNodeIcons.AddNode)
                        .SetType(UIButtonType.Primary)
                        .OnClick(nameof(DependenciesController.AddModule))
                        .SetVerticalAlignment(UIAlignment.Center),
                    new ButtonComponent()
                        .SetTitle("planner.graph.remove-added")
                        .SetType(UIButtonType.Outline)
                        .OnClick(nameof(DependenciesController.RemoveAdded))
                        .SetVerticalAlignment(UIAlignment.Center)
                )
                .SetMargin(UIThickness.All(0, 12, 0, 4))
                .SetPlacement(1, 3, 24, 1)
            )
            .AddChild(new TextComponent()
                .BindTitle(nameof(DependenciesController.Status))
                .SetTitleType(UITextAppearance.Caption)
                .SetTitleColor(UIThemeColor.FromStyle(UIColorStyle.Muted))
                .SetPlacement(1, 4, 24, 1)
            )
        );
}
