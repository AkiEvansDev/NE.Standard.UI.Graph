using System.Collections.Generic;

namespace DemoApp.Graph.Planner;

/// <summary>
/// Three panes: the resources, the one open set up with its recipe, and what it is made from all the way down, drawn by the
/// production graph beside the form.
/// </summary>
internal sealed class ResourcesView : GraphDemoView, IUIViewDefinition
{
    private const string SearchId = "planner-resource-search";

    public static string ViewKey => "graph.planner.resources";

    protected override string Route => ResourcesRoute;

    public override string Title => "Resources";

    protected override string Description
        => "What the factory knows: every resource, and the one recipe that makes it — what a run takes, what it gives and how long it lasts. Start with what is brought in.";

    protected override DemoPage CreatePage()
        => App(new ContainerComponent()
            .SetHeight(UILayoutLength.Fill())
            // The grid has no gap of its own: the air between the panes is each pane's leading margin.
            .AddChild(CreateList().SetPlacement(1, 1, 5, 1))
            .AddChild(CreateEmpty().SetMargin(UIThickness.All(24, 0, 0, 0)).SetPlacement(6, 1, 19, 1))
            .AddChild(new ScrollContainerComponent()
                .VerticalScrollOnly()
                .SetHeight(UILayoutLength.Fill())
                .BindVisibility(nameof(ResourcesController.EditorVisibility))
                .AddChild(CreateForm())
                .SetMargin(UIThickness.All(24, 0, 0, 0))
                .SetPlacement(6, 1, 9, 1)
            )
            .AddChild(CreateRecipe().SetMargin(UIThickness.All(24, 0, 0, 0)).SetPlacement(15, 1, 10, 1))
        );

    /// <summary>The search and the add button over the list; the search narrows it in the browser as it is typed, and the list scrolls in what is left.</summary>
    private static ContainerComponent CreateList()
        => new ContainerComponent()
            .SetHeight(UILayoutLength.Fill())
            .SetRow(1, UIGridUnit.Auto())
            .AddRow(UIGridUnit.Auto())
            .AddRow(UIGridUnit.Star())
            // A grid, not a row: in a narrow pane a row wraps the button under the field.
            .AddChild(new ContainerComponent()
                .AddChild(new TextInputComponent(SearchId)
                    .SetType(UITextInputType.Search)
                    .SetPlaceholder("Search")
                    .SetPrefixIcon(MaterialIcons.Outlined(PlannerIcons.Search))
                    .SetShowClearButton()
                    .SetDebounceMilliseconds(150)
                    .SetPlacement(1, 1, 18, 1)
                )
                .AddChild(UIButtons.Primary("Add", MaterialIcons.Outlined(PlannerIcons.Add))
                    .OnClick(nameof(ResourcesController.Add))
                    .SetHorizontalAlignment(UIAlignment.End)
                    .SetPlacement(19, 1, 6, 1)
                )
                .SetPlacement(1, 1, 24, 1)
            )
            .AddChild(UILayout.Row(4,
                    UIButtons.Ghost("Import", MaterialIcons.Outlined(PlannerIcons.Import)).SetSize(UIButtonSize.Small).OnClick(nameof(ResourcesController.OpenImport)),
                    UIButtons.Ghost("Export", MaterialIcons.Outlined(PlannerIcons.Export)).SetSize(UIButtonSize.Small).OnClick(nameof(ResourcesController.ExportAsync))
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
                // After the template: an item event is registered on the template in hand.
                .OnItemClickWithItemKey(nameof(ResourcesController.Open))
                .ConfigureDefaultEmptyTemplate(template => _ = template
                    .SetIcon(MaterialIcons.Outlined(PlannerIcons.Resource))
                    .SetTitle("No resources yet")
                    .SetDescription("Add one: something brought in, like ore or water, is where a factory starts.")
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
                .SetTitle("Nothing open")
                .SetDescription("Add a resource, or pick one in the list: it opens here with its recipe, and the recipe draws what it is made from.")
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
                    .SetTitle("Name")
                    .SetDebounceMilliseconds(400)
                    .BindValue(nameof(ResourcesController.Name))
                    .OnChange(nameof(ResourcesController.SaveResource)),
                UIForm.Row(
                    new SelectComponent()
                        .SetTitle("Icon")
                        .SetOptions(PlannerCatalogue.IconOptions())
                        .BindValue(nameof(ResourcesController.Icon))
                        .OnChange(nameof(ResourcesController.SaveResource)),
                    new SelectComponent()
                        .SetTitle("Colour")
                        .SetPlaceholder("The graph's own")
                        .SetShowClearButton()
                        .SetOptions(PlannerCatalogue.ColorOptions())
                        .BindValue(nameof(ResourcesController.Color))
                        .OnChange(nameof(ResourcesController.SaveResource))
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
                    UIText.Caption("A picture over the glyph, 2 MB at most")
                        .Muted()
                        .SetVerticalAlignment(UIAlignment.Center),
                    UIButtons.Ghost("Remove")
                        .SetSize(UIButtonSize.Small)
                        .BindVisibility(nameof(ResourcesController.PictureVisibility))
                        .OnClick(nameof(ResourcesController.RemovePicture))
                        .SetVerticalAlignment(UIAlignment.Center)
                )
            ),
            UIPage.Section("Recipe", "What one run gives and how long it lasts, and what it takes. With nothing taken, the resource is brought in.",
                UIForm.Row(
                    new NumberInputComponent()
                        .SetTitle("Gives")
                        .SetMin(1)
                        .SetMax(999)
                        .SetAllowDecimals(false)
                        .SetShowStepper()
                        .BindValue(nameof(ResourcesController.Output))
                        .OnChange(nameof(ResourcesController.SaveResource)),
                    new NumberInputComponent()
                        .SetTitle("Seconds a run")
                        .SetMin(0.1m)
                        .SetMax(3600)
                        .SetShowStepper()
                        .BindValue(nameof(ResourcesController.Seconds))
                        .OnChange(nameof(ResourcesController.SaveResource))
                ),
                UILayout.Stack(8,
                    UIText.Caption("Takes").Muted(),
                    new ItemsViewComponent()
                        .BindItems(nameof(ResourcesController.Ingredients))
                        .SetSpacing(8)
                        .SetTemplate(CreateIngredient())
                        .ConfigureDefaultEmptyTemplate(template => _ = template
                            .SetTitle("Takes nothing")
                            .SetDescription("Brought in from outside the factory.")
                        )
                ),
                UIButtons.Ghost("Add an ingredient", MaterialIcons.Outlined(PlannerIcons.Add))
                    .SetHorizontalAlignment(UIAlignment.Start)
                    .OnClick(nameof(ResourcesController.AddIngredient))
            )
        );

    /// <summary>The resource's heading, with the way to delete it at its end: there, not a red bar under the form that outweighs every field.</summary>
    private static ContainerComponent CreateHeading()
        => new ContainerComponent()
            .AddChild(UIText.Title("Resource").SetVerticalAlignment(UIAlignment.Center).SetPlacement(1, 1, 16, 1))
            .AddChild(UIButtons.Ghost("Delete", MaterialIcons.Outlined(PlannerIcons.Delete))
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
            .SetHeight(UILayoutLength.Fill())
            .SetRow(1, UIGridUnit.Auto())
            .AddRow(UIGridUnit.Star())
            .BindVisibility(nameof(ResourcesController.EditorVisibility))
            .AddChild(UILayout.Stack(4,
                    UIText.Title("Made from"),
                    UIText.Caption(string.Empty).BindTitle(nameof(ResourcesController.RecipeNote)).Muted()
                )
                .SetMargin(UIThickness.All(0, 0, 0, 16))
                .SetPlacement(1, 1, 24, 1)
            )
            .AddChild(new ProductionGraphComponent("planner-preview")
                .BindItems(nameof(ResourcesController.Preview))
                .SetIsReadOnly(true)
                .SetHeight(UILayoutLength.Fill())
                .SetCommandIcon(UIGraphCommands.Arrange, PlannerIcons.Arrange)
                .SetCommandIcon(UIGraphCommands.Fit, PlannerIcons.Fit)
                .SetPlacement(1, 2, 24, 1)
            );

    /// <summary>One ingredient in the recipe's two columns — which resource, how many a run — and a button that takes the row away.</summary>
    private static ContainerComponent CreateIngredient()
        => new ContainerComponent()
            .AddChild(new SelectComponent()
                .SetPlaceholder("Pick a resource")
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
            .AddChild(UIButtons.Icon(MaterialIcons.Outlined(PlannerIcons.Delete), "Remove")
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
                    UIText.Title("Delete the resource?").BindDescription(nameof(ResourcesController.DeleteQuestion)),
                    UIButtons.Pair(
                        UIButtons.Ghost("Keep it").OnClick(nameof(ResourcesController.CloseDialog)),
                        UIButtons.Danger("Delete").OnClick(nameof(ResourcesController.Delete))
                    )
                )
                .SetMinWidth(UILayoutLength.Absolute(360))
            },
            new UIDialog
            {
                Key = ResourcesController.ImportDialogKey,
                Content = UILayout.Stack(16,
                    UIText.Title("Import resources", "A resources file the planner exported, here or elsewhere, pictures and all."),
                    new FileInputComponent()
                        .SetPlaceholder("Pick or drop a .zip file")
                        .SetAccept(PlannerFiles.ResourcesAccept)
                        .BindSelectionId(nameof(ResourcesController.ImportSelection)),
                    new RadioGroupComponent()
                        .SetOptions(
                        [
                            new OptionItem { Id = ResourcesController.MergeImport, Title = "Merge", Description = "A resource of the file replaces the one of its id; the rest stay." },
                            new OptionItem { Id = ResourcesController.ReplaceImport, Title = "Replace", Description = "The file's catalogue in place of this one; goals asking for what is gone go too." }
                        ])
                        .BindValue(nameof(ResourcesController.ImportMode)),
                    UIButtons.Pair(
                        UIButtons.Ghost("Cancel").OnClick(nameof(ResourcesController.CloseDialog)),
                        UIButtons.Primary("Import").OnClick(nameof(ResourcesController.ImportAsync))
                    )
                )
                .SetMinWidth(UILayoutLength.Absolute(420))
            }
        ];
}
