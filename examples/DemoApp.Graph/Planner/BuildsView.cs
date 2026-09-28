using System.Collections.Generic;

namespace DemoApp.Graph.Planner;

/// <summary>
/// The builds as tabs over one page: the open build's plan drawn across it, its goals the targets named in the plan's own panel.
/// </summary>
internal sealed class BuildsView : GraphDemoView, IUIViewDefinition
{
    public static string ViewKey => "graph.planner.builds";

    protected override string Route => BuildsRoute;

    public override string Title => "Builds";

    protected override string Description
        => "What to make, and what it takes: a build's targets are named in the plan's panel, made once or every minute or hour, and the calculation says what is brought in, what runs and how often.";

    protected override DemoPage CreatePage()
        => App(new ContainerComponent()
            .SetHeight(UILayoutLength.Fill())
            .SetRow(1, UIGridUnit.Auto())
            .AddRow(UIGridUnit.Auto())
            .AddRow(UIGridUnit.Star())
            .AddChild(CreateStrip().SetPlacement(1, 1, 24, 1))
            .AddChild(CreateEmpty().SetPlacement(1, 2, 24, 1))
            .AddChild(CreateGraph().SetPlacement(1, 3, 24, 1))
        );

    /// <summary>
    /// The builds' captions — renamed by a double click, deleted by their cross, and all three plus a pin in the strip's own menu on a
    /// right press — and the buttons that open another and move them through files.
    /// </summary>
    private static ContainerComponent CreateStrip()
        => new ContainerComponent()
            .SetMargin(UIThickness.All(0, 0, 0, 16))
            .AddChild(new TabsViewComponent("planner-builds")
                .BindItems(nameof(BuildsController.Builds))
                .BindSelectedKey(nameof(BuildsController.SelectedKey))
                .SetRenamable(true)
                .SetTabMenuEntries(UITabMenuEntries.Rename | UITabMenuEntries.Pin | UITabMenuEntries.Delete)
                .OnItemRemove(nameof(BuildsController.AskDelete))
                .SetPlacement(1, 1, 16, 1)
            )
            .AddChild(UILayout.Row(4,
                    UIButtons.Ghost("New build", MaterialIcons.Outlined(PlannerIcons.Add)).OnClick(nameof(BuildsController.AddBuild)),
                    UIButtons.Ghost("Import", MaterialIcons.Outlined(PlannerIcons.Import)).OnClick(nameof(BuildsController.OpenImport)),
                    UIButtons.Ghost("Export", MaterialIcons.Outlined(PlannerIcons.Export)).OnClick(nameof(BuildsController.ExportAsync))
                )
                .SetHorizontalAlignment(UIAlignment.End)
                .SetVerticalAlignment(UIAlignment.Center)
                .SetPlacement(17, 1, 8, 1)
            );

    private static SurfaceComponent CreateEmpty()
        => new SurfaceComponent()
            .SetSurface(UISurfaceStyle.Tinted)
            .SetPadding(UIThickness.Uniform(16))
            .SetMargin(UIThickness.All(0, 0, 0, 16))
            .BindVisibility(nameof(BuildsController.EmptyVisibility))
            .SetContent(UILayout.Row(16,
                new TextComponent()
                    .SetIcon(MaterialIcons.Outlined(PlannerIcons.Resource))
                    .SetIconColor(UIThemeColor.Muted)
                    .SetTitle("The catalogue is empty")
                    .SetDescription("A goal is a resource, and there are none yet: add them, with their recipes, first.")
                    .SetVerticalAlignment(UIAlignment.Center),
                new LinkComponent()
                    .SetTitle("Open the resources")
                    .SetUrl(ResourcesRoute)
                    .SetVerticalAlignment(UIAlignment.Center)
                )
            );

    /// <summary>
    /// The plan drawn: only what takes part, with its totals. Every edit is saved as it is made, so a target named in the panel is the
    /// build's goal at once and another tab opens on what was left.
    /// </summary>
    private static ProductionGraphComponent CreateGraph()
        => new ProductionGraphComponent("planner-plan")
            .BindItems(nameof(BuildsController.Catalogue))
            .SetMode(UIProductionMode.Plan)
            .SetAutoSave(true)
            .SetFormId(BuildsController.PlanForm)
            .BindValue(nameof(BuildsController.Plan), mode: UIBindingMode.OnSubmit)
            .OnSave(nameof(BuildsController.SaveGoals))
            .SetHeight(UILayoutLength.Fill())
            .SetCommandIcon(UIGraphCommands.Arrange, PlannerIcons.Arrange)
            .SetCommandIcon(UIGraphCommands.Fit, PlannerIcons.Fit)
            .SetCommandIcon(UIGraphCommands.GroupSelection, PlannerIcons.Group)
            .SetCommandIcon(UIGraphCommands.Pin, PlannerIcons.Pin)
            .SetCommandIcon(UIGraphCommands.Target, PlannerIcons.Goal);

    protected override IReadOnlyList<UIDialog> CreateDialogs()
        =>
        [
            new UIDialog
            {
                Key = BuildsController.DeleteDialogKey,
                Content = UILayout.Stack(12,
                    UIText.Title("Delete the build?").BindDescription(nameof(BuildsController.DeleteQuestion)),
                    UIButtons.Pair(
                        UIButtons.Ghost("Keep it").OnClick(nameof(BuildsController.CloseDialog)),
                        UIButtons.Danger("Delete").OnClick(nameof(BuildsController.Delete))
                    )
                )
                .SetMinWidth(UILayoutLength.Absolute(360))
            },
            new UIDialog
            {
                Key = BuildsController.ImportDialogKey,
                Content = UILayout.Stack(16,
                    UIText.Title("Import builds", "A builds file the planner exported; its goals find their resources by id."),
                    new FileInputComponent()
                        .SetPlaceholder("Pick or drop a .json file")
                        .SetAccept(PlannerFiles.BuildsAccept)
                        .BindSelectionId(nameof(BuildsController.ImportSelection)),
                    new RadioGroupComponent()
                        .SetOptions(
                        [
                            new OptionItem { Id = BuildsController.MergeImport, Title = "Merge", Description = "A build of the file replaces the one of its id; the rest stay." },
                            new OptionItem { Id = BuildsController.ReplaceImport, Title = "Replace", Description = "The file's builds in place of these." }
                        ])
                        .BindValue(nameof(BuildsController.ImportMode)),
                    UIButtons.Pair(
                        UIButtons.Ghost("Cancel").OnClick(nameof(BuildsController.CloseDialog)),
                        UIButtons.Primary("Import").OnClick(nameof(BuildsController.ImportAsync))
                    )
                )
                .SetMinWidth(UILayoutLength.Absolute(420))
            }
        ];
}
