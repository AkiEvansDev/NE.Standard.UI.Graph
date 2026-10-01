using System.Collections.Generic;

namespace DemoApp.Graph.Planner;

/// <summary>
/// Three panes: the resources, the one open set up with its recipe, and what it is made from all the way down, drawn by the
/// production graph beside the form. Side by side from a wide screen on, each pane the page's height; under it one above the
/// other, the list and the graph at a height of their own, and the page scrolls.
/// </summary>
internal sealed class ResourcesView : GraphDemoView, IUIViewDefinition
{
    private const string SearchId = "planner-resource-search";

    // The heights of the panes that fill the page's height side by side, when they stand one above the other instead.
    private const double StackedListHeight = 360;
    private const double StackedRecipeHeight = 420;

    // The air between the panes: before a pane beside the one before it, above one under it.
    private static readonly UIResponsive<UIThickness> PaneGap = UIResponsive<UIThickness>.Create(UIThickness.All(0, 24, 0, 0), xl: UIThickness.All(24, 0, 0, 0));

    public static string ViewKey => "graph.planner.resources";

    protected override string Route => ResourcesRoute;

    public override string Title => "planner.page.resources";

    protected override string Description
        => "planner.page.resources.description";

    // Beside each other the panes fill the page and scroll themselves; one above the other they are the page, which scrolls.
    protected override UIResponsive<UILayoutLength>? PageHeight => Filled(UILayoutLength.Auto());

    // Below a wide screen three columns leave the form too narrow for its two selects side by side, so there the panes stack.
    protected override DemoPage CreatePage()
        => App(new ContainerComponent()
            .SetHeight(Filled(UILayoutLength.Auto()))
            // The grid has no gap of its own: the air between the panes is each pane's leading margin.
            .AddChild(CreateList().SetPlacement(1, 1, 24, 1, xl: UIGridPlacement.At(1, 1, 5, 1)))
            .AddChild(CreateEmpty().SetMargin(PaneGap).SetPlacement(1, 2, 24, 1, xl: UIGridPlacement.At(6, 1, 19, 1)))
            .AddChild(new ScrollContainerComponent()
                .VerticalScrollOnly()
                .SetHeight(Filled(UILayoutLength.Auto()))
                .BindVisibility(nameof(ResourcesController.EditorVisibility))
                .AddChild(CreateForm())
                .SetMargin(PaneGap)
                .SetPlacement(1, 2, 24, 1, xl: UIGridPlacement.At(6, 1, 9, 1))
            )
            .AddChild(CreateRecipe().SetMargin(PaneGap).SetPlacement(1, 3, 24, 1, xl: UIGridPlacement.At(15, 1, 10, 1)))
        );

    /// <summary>A pane's height: the page's own beside the others on a wide screen, <paramref name="stacked"/> under it.</summary>
    private static UIResponsive<UILayoutLength> Filled(UILayoutLength stacked)
        => UIResponsive<UILayoutLength>.Create(stacked, xl: UILayoutLength.Fill());

    /// <summary>The search and the add button over the list; the search narrows it in the browser as it is typed, and the list scrolls in what is left.</summary>
    private static ContainerComponent CreateList()
        => new ContainerComponent()
            .SetHeight(Filled(UILayoutLength.Absolute(StackedListHeight)))
            .SetRow(1, UIGridUnit.Auto())
            .AddRow(UIGridUnit.Auto())
            .AddRow(UIGridUnit.Star())
            // A grid, not a row: in a narrow pane a row wraps the button under the field. The button's column is as wide as its
            // words, since a share of the pane squeezed them; the field takes the rest.
            .AddChild(new ContainerComponent()
                .SetColumn(24, UIGridUnit.Auto())
                .AddChild(new TextInputComponent(SearchId)
                    .SetType(UITextInputType.Search)
                    .SetPlaceholder("planner.search")
                    .SetPrefixIcon(MaterialIcons.Outlined(PlannerIcons.Search))
                    .SetShowClearButton()
                    .SetDebounceMilliseconds(150)
                    .SetPlacement(1, 1, 23, 1)
                )
                .AddChild(UIButtons.Primary("planner.add", MaterialIcons.Outlined(PlannerIcons.Add))
                    .OnClick(nameof(ResourcesController.Add))
                    .SetMargin(UIThickness.All(8, 0, 0, 0))
                    .SetPlacement(24, 1, 1, 1)
                )
                .SetPlacement(1, 1, 24, 1)
            )
            .AddChild(UILayout.Row(4,
                    UIButtons.Ghost("planner.import", MaterialIcons.Outlined(PlannerIcons.Import)).SetSize(UIButtonSize.Small).OnClick(nameof(ResourcesController.OpenImport)),
                    UIButtons.Ghost("planner.export", MaterialIcons.Outlined(PlannerIcons.Export)).SetSize(UIButtonSize.Small).OnClick(nameof(ResourcesController.ExportAsync))
                )
                .SetMargin(UIThickness.All(0, 12, 0, 12))
                .SetPlacement(1, 2, 24, 1)
            )
            .AddChild(new ItemsViewComponent()
                .BindItems(nameof(ResourcesController.Resources))
                .FilterBy(SearchId, IInputComponent.ValueProperty, nameof(TextItem.Title))
                .SetSelectionMode(UISelectionMode.One)
                .BindSelectedKey(nameof(ResourcesController.SelectedKey))
                .SetRowHoverable(true)
                .VerticalScrollOnly()
                .SetHeight(UILayoutLength.Fill())
                .SetSpacing(2)
                .SetTemplate(new TextComponent()
                    .BindIcon(nameof(TextItem.Icon), UIBindingScope.Relative)
                    .SetIconColor(UIThemeColor.Muted)
                    .BindTitle(nameof(TextItem.Title), UIBindingScope.Relative)
                    .AsBody()
                    .BindDescription(nameof(TextItem.Description), UIBindingScope.Relative)
                    .SetDescriptionColor(UIThemeColor.Muted)
                )
                .ConfigureDefaultEmptyTemplate(template => _ = template
                    .SetIcon(MaterialIcons.Outlined(PlannerIcons.Resource))
                    .SetTitle("planner.resources.empty")
                    .SetDescription("planner.resources.empty.description")
                )
                .SetPlacement(1, 3, 24, 1)
            );

    private static SurfaceComponent CreateEmpty()
        => new SurfaceComponent()
            .SetSurface(UISurfaceStyle.Tinted)
            .SetMinHeight(UILayoutLength.Absolute(320))
            .BindVisibility(nameof(ResourcesController.EmptyVisibility))
            .SetContent(new TextComponent()
                .SetIcon(MaterialIcons.Outlined(PlannerIcons.Resource))
                .SetIconColor(UIThemeColor.Muted)
                .SetTitle("planner.resources.none-open")
                .SetDescription("planner.resources.none-open.description")
                .Muted()
                .SetTextAlignment(UITextAlignment.Center)
                .SetHorizontalAlignment(UIAlignment.Center)
                .SetVerticalAlignment(UIAlignment.Center)
            );

    /// <summary>The resource and its recipe; every field writes as it changes.</summary>
    private static StackPanelComponent CreateForm()
        => UILayout.Stack(28,
            UILayout.Stack(16,
                CreateHeading(),
                new TextInputComponent()
                    .SetTitle("planner.resource.name")
                    .SetDebounceMilliseconds(400)
                    .BindValue(nameof(ResourcesController.Name))
                    .OnChange(nameof(ResourcesController.SaveResource)),
                // Each select as wide as its half of the row: a select's twelve-rem floor gives way to an authored width, and two floors
                // are wider than the form's column at a desktop width.
                UIForm.Row(
                    new SelectComponent()
                        .SetTitle("planner.resource.icon")
                        .SetOptions(PlannerCatalogue.IconOptions())
                        .BindValue(nameof(ResourcesController.Icon))
                        .OnChange(nameof(ResourcesController.SaveResource))
                        .SetWidth(UILayoutLength.Fill()),
                    new SelectComponent()
                        .SetTitle("planner.resource.colour")
                        .SetPlaceholder("planner.resource.colour.default")
                        .SetShowClearButton()
                        .SetOptions(PlannerCatalogue.ColorOptions())
                        .BindValue(nameof(ResourcesController.Color))
                        .OnChange(nameof(ResourcesController.SaveResource))
                        .SetWidth(UILayoutLength.Fill())
                ),
                // A picture of the resource's own, worn over the glyph wherever the resource is drawn; the glyph is what is left without one.
                UILayout.Row(12,
                    new ImageInputComponent()
                        .SetShape(UIImageInputShape.Avatar)
                        .SetPlaceholderIcon(MaterialIcons.Outlined(PlannerIcons.Picture))
                        .SetMaxFileSize(PlannerPictures.MaxBytes)
                        .BindValue(nameof(ResourcesController.Picture))
                        .BindSelectionId(nameof(ResourcesController.PictureSelection))
                        .OnChange(nameof(ResourcesController.TakePictureAsync)),
                    UIText.Caption("planner.resource.picture")
                        .Muted()
                        .SetVerticalAlignment(UIAlignment.Center),
                    UIButtons.Ghost("planner.resource.picture.remove")
                        .SetSize(UIButtonSize.Small)
                        .BindVisibility(nameof(ResourcesController.PictureVisibility))
                        .OnClick(nameof(ResourcesController.RemovePicture))
                        .SetVerticalAlignment(UIAlignment.Center)
                )
            ),
            UIPage.Section("planner.recipe", "planner.recipe.description",
                UIForm.Row(
                    new NumberInputComponent()
                        .SetTitle("planner.recipe.gives")
                        .SetMin(1)
                        .SetMax(999)
                        .SetAllowDecimals(false)
                        .SetShowStepper()
                        .BindValue(nameof(ResourcesController.Output))
                        .OnChange(nameof(ResourcesController.SaveResource)),
                    new NumberInputComponent()
                        .SetTitle("planner.recipe.seconds")
                        .SetMin(0.1m)
                        .SetMax(3600)
                        .SetShowStepper()
                        .BindValue(nameof(ResourcesController.Seconds))
                        .OnChange(nameof(ResourcesController.SaveResource))
                ),
                UILayout.Stack(8,
                    UIText.Caption("planner.recipe.takes").Muted(),
                    new ItemsViewComponent()
                        .BindItems(nameof(ResourcesController.Ingredients))
                        .SetSpacing(8)
                        .SetTemplate(CreateIngredient())
                        .ConfigureDefaultEmptyTemplate(template => _ = template
                            .SetTitle("planner.recipe.takes-nothing")
                            .SetDescription("planner.recipe.takes-nothing.description")
                        )
                ),
                UIButtons.Ghost("planner.recipe.add-ingredient", MaterialIcons.Outlined(PlannerIcons.Add))
                    .SetHorizontalAlignment(UIAlignment.Start)
                    .OnClick(nameof(ResourcesController.AddIngredient))
            )
        );

    /// <summary>The resource's heading, with the way to delete it at its end: there, not a red bar under the form that outweighs every field.</summary>
    private static ContainerComponent CreateHeading()
        => new ContainerComponent()
            .AddChild(UIText.Title("planner.resource").SetVerticalAlignment(UIAlignment.Center).SetPlacement(1, 1, 16, 1))
            .AddChild(UIButtons.Ghost("planner.delete", MaterialIcons.Outlined(PlannerIcons.Delete))
                .SetSize(UIButtonSize.Small)
                .SetIconColor(UIThemeColor.Danger)
                .SetHorizontalAlignment(UIAlignment.End)
                .SetVerticalAlignment(UIAlignment.Center)
                .OnClick(nameof(ResourcesController.AskDelete))
                .SetPlacement(17, 1, 8, 1)
            );

    /// <summary>What the open resource is made from, all the way down, read-only beside the form: the form is where it is changed.</summary>
    private static ContainerComponent CreateRecipe()
        => new ContainerComponent()
            .SetHeight(Filled(UILayoutLength.Absolute(StackedRecipeHeight)))
            .SetRow(1, UIGridUnit.Auto())
            .AddRow(UIGridUnit.Star())
            .BindVisibility(nameof(ResourcesController.EditorVisibility))
            .AddChild(UILayout.Stack(4,
                    UIText.Title("planner.made-from"),
                    UIText.Caption(string.Empty).BindTitle(nameof(ResourcesController.RecipeNote)).Muted()
                )
                .SetMargin(UIThickness.All(0, 0, 0, 16))
                .SetPlacement(1, 1, 24, 1)
            )
            .AddChild(new ProductionGraphComponent("planner-preview")
                .BindItems(nameof(ResourcesController.Preview))
                .SetIsReadOnly(true)
                .SetHeight(UILayoutLength.Fill())
                .SetPlacement(1, 2, 24, 1)
            );

    /// <summary>One ingredient in the recipe's two columns — which resource, how many a run — and a button that takes the row away.</summary>
    private static ContainerComponent CreateIngredient()
        => new ContainerComponent()
            // A search over the catalogue rather than a list to scroll; Replace, so a left field shows the pick, icon and all, never a
            // term typed to find it.
            .AddChild(new SearchComponent()
                .SetPlaceholder("planner.recipe.pick-resource")
                .SetSelectionDisplayMode(UISearchSelectionDisplayMode.ReplaceWithSelectedItem)
                .BindOptions(nameof(ResourcesController.IngredientOptions))
                .BindValue(nameof(AmountRow.Resource), UIBindingScope.Relative)
                .OnChange(nameof(ResourcesController.SaveIngredients))
                .SetPlacement(1, 1, 12, 1)
            )
            .AddChild(new NumberInputComponent()
                .SetMin(1)
                .SetMax(999)
                .SetAllowDecimals(false)
                .SetShowStepper()
                .BindValue(nameof(AmountRow.Amount), UIBindingScope.Relative)
                .OnChange(nameof(ResourcesController.SaveIngredients))
                // The recipe row's own gap before its second column, so the amount stands under Seconds a run.
                .SetMargin(UIThickness.All(16, 0, 0, 0))
                .SetPlacement(13, 1, 10, 1)
            )
            .AddChild(UIButtons.Icon(MaterialIcons.Outlined(PlannerIcons.Delete), "planner.recipe.remove-ingredient")
                .OnClick(nameof(ResourcesController.RemoveIngredient), UIAction.ArgCurrentItemKey("id"))
                .SetVerticalAlignment(UIAlignment.Center)
                .SetHorizontalAlignment(UIAlignment.End)
                .SetPlacement(23, 1, 2, 1)
            );

    protected override IReadOnlyList<UIDialog> CreateDialogs()
        =>
        [
            new UIDialog
            {
                Key = ResourcesController.DeleteDialogKey,
                Content = UILayout.Stack(12,
                    UIText.Title("planner.resource.delete.title").BindDescription(nameof(ResourcesController.DeleteQuestion)),
                    UIButtons.Pair(
                        UIButtons.Ghost("planner.keep-it").OnClick(nameof(ResourcesController.CloseDialog)),
                        UIButtons.Danger("planner.delete").OnClick(nameof(ResourcesController.Delete))
                    )
                )
                .SetMinWidth(UILayoutLength.Absolute(360))
            },
            new UIDialog
            {
                Key = ResourcesController.ImportDialogKey,
                Content = UILayout.Stack(16,
                    UIText.Title("planner.resources.import.title", "planner.resources.import.description"),
                    new FileInputComponent()
                        .SetPlaceholder("planner.resources.import.file")
                        .SetAccept(PlannerFiles.ResourcesAccept)
                        .BindSelectionId(nameof(ResourcesController.ImportSelection)),
                    new RadioGroupComponent()
                        .SetOptions(
                        [
                            new OptionItem { Id = ResourcesController.MergeImport, Title = "planner.import.merge", Description = "planner.resources.import.merge" },
                            new OptionItem { Id = ResourcesController.ReplaceImport, Title = "planner.import.replace", Description = "planner.resources.import.replace" }
                        ])
                        .BindValue(nameof(ResourcesController.ImportMode)),
                    UIButtons.Pair(
                        UIButtons.Ghost("planner.cancel").OnClick(nameof(ResourcesController.CloseDialog)),
                        UIButtons.Primary("planner.import").OnClick(nameof(ResourcesController.ImportAsync))
                    )
                )
                .SetMinWidth(UILayoutLength.Absolute(420))
            }
        ];
}
