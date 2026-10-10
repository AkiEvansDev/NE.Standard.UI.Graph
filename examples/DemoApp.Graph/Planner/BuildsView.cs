using System.Collections.Generic;

namespace DemoApp.Graph.Planner;

/// <summary>
/// The builds as tabs over one page: the open build's plan drawn across it, its goals the targets named in the plan's own panel.
/// </summary>
internal sealed class BuildsView : GraphDemoView, IUIViewDefinition
{
    public static string ViewKey => "graph.planner.builds";

    protected override string Route => BuildsRoute;

    public override string Title => "planner.page.builds";

    protected override string Description
        => "planner.page.builds.description";

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
    /// right press — and the buttons that open another and move them through files: beside the strip from a tablet up, under it on a
    /// phone, where a third of the width stacked them one over another.
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
                // Held by the top, as the buttons are: the view's box is its strip plus the selected page's rule and air, so centring it
                // would set the captions above the buttons' middle.
                .SetVerticalAlignment(UIAlignment.Start)
                .SetPlacement(1, 1, 24, 1, sm: UIGridPlacement.At(1, 1, 16, 1))
            )
            // Small, so each button is the strip's own height and its middle is the captions' middle, with no offset to keep in step.
            .AddChild(UILayout.Row(4,
                    UIButtons.Ghost("planner.builds.new", MaterialIcons.Outlined(PlannerIcons.Add)).SetSize(UIButtonSize.Small).OnClick(nameof(BuildsController.AddBuild)),
                    UIButtons.Ghost("planner.import", MaterialIcons.Outlined(PlannerIcons.Import)).SetSize(UIButtonSize.Small).OnClick(nameof(BuildsController.OpenImport)),
                    UIButtons.Ghost("planner.export", MaterialIcons.Outlined(PlannerIcons.Export)).SetSize(UIButtonSize.Small).OnClick(nameof(BuildsController.ExportAsync))
                )
                .SetHorizontalAlignment(UIAlignment.End)
                .SetVerticalAlignment(UIAlignment.Start)
                .SetPlacement(1, 2, 24, 1, sm: UIGridPlacement.At(17, 1, 8, 1))
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
                    .SetTitle("planner.builds.empty")
                    .SetDescription("planner.builds.empty.description")
                    .SetWrapMode(UITextWrapMode.Wrap)
                    .SetVerticalAlignment(UIAlignment.Center),
                new LinkComponent()
                    .SetTitle("planner.builds.open-resources")
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
            .BindSheetName(nameof(BuildsController.OpenName))
            .SetAutoSave(true)
            .SetFormId(BuildsController.PlanForm)
            .BindValue(nameof(BuildsController.Plan), mode: UIBindingMode.OnSubmit)
            .OnSave(nameof(BuildsController.SaveGoals))
            .SetHeight(UILayoutLength.Fill());

    protected override IReadOnlyList<UIDialog> CreateDialogs()
        =>
        [
            new UIDialog
            {
                Key = BuildsController.DeleteDialogKey,
                Content = UILayout.Stack(12,
                    UIText.Title("planner.build.delete.title").BindDescription(nameof(BuildsController.DeleteQuestion)),
                    UIButtons.Pair(
                        UIButtons.Ghost("planner.keep-it").OnClick(nameof(BuildsController.CloseDialog)),
                        UIButtons.Danger("planner.delete").OnClick(nameof(BuildsController.Delete))
                    )
                )
                .SetMinWidth(UILayoutLength.Absolute(360))
            },
            new UIDialog
            {
                Key = BuildsController.ImportDialogKey,
                Content = UILayout.Stack(16,
                    UIText.Title("planner.builds.import.title", "planner.builds.import.description"),
                    new FileInputComponent()
                        .SetPlaceholder("planner.builds.import.file")
                        .SetAccept(PlannerFiles.BuildsAccept)
                        .BindSelectionId(nameof(BuildsController.ImportSelection)),
                    new RadioGroupComponent()
                        .SetOptions(
                        [
                            new OptionItem { Id = BuildsController.MergeImport, Title = "planner.import.merge", Description = "planner.builds.import.merge" },
                            new OptionItem { Id = BuildsController.ReplaceImport, Title = "planner.import.replace", Description = "planner.builds.import.replace" }
                        ])
                        .BindValue(nameof(BuildsController.ImportMode)),
                    UIButtons.Pair(
                        UIButtons.Ghost("planner.cancel").OnClick(nameof(BuildsController.CloseDialog)),
                        UIButtons.Primary("planner.import").OnClick(nameof(BuildsController.ImportAsync))
                    )
                )
                .SetMinWidth(UILayoutLength.Absolute(420))
            }
        ];
}
