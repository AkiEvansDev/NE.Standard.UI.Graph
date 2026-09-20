using NE.Standard.UI.Abstractions.Styling;
using NE.Standard.UI.Authoring.Components;
using NE.Standard.UI.Authoring.Views;
using NE.Standard.UI.Components.BuiltIns.Actions;
using NE.Standard.UI.Components.BuiltIns.Contents;
using NE.Standard.UI.Components.BuiltIns.Inputs;
using NE.Standard.UI.Components.BuiltIns.Layouts;
using NE.Standard.UI.Components.BuiltIns.Models;
using NE.Standard.UI.Graph;
using NE.Standard.UI.Primitives.Binding;
using NE.Standard.UI.Primitives.Styling;

namespace DemoApp.Graph;

/// <summary>
/// The production graph: its settings above, the factory filling the page, the buttons that add and take away a recipe while the
/// page runs below, and what the server last heard under it.
/// </summary>
internal sealed class ProductionView : GraphDemoView, IUIViewDefinition
{
    public static string ViewKey => "graph.production";

    protected override string Route => ProductionRoute;

    public override string Title => "Production";

    protected override string Description
        => "A factory's resources and recipes; a number is what one run takes or gives. Drag from a dot to make a recipe, right-click an edge or a recipe to edit it, Ctrl+S to apply.";

    protected override IVisualComponent CreatePage()
        => new ContainerComponent()
            .SetHeight(UILayoutLength.Fill())
            .SetRow(1, UIGridUnit.Auto())
            .AddRow(UIGridUnit.Star())
            .AddRow(UIGridUnit.Auto())
            .AddRow(UIGridUnit.Auto())
            .AddChild(CreateSettings().SetPlacement(1, 1, 24, 1))
            .AddChild(CreateGraph().SetPlacement(1, 2, 24, 1))
            .AddChild(CreateForm().SetPlacement(1, 3, 24, 1))
            .AddChild(new TextComponent()
                .BindTitle(nameof(ProductionController.Status))
                .SetTitleType(UITextAppearance.Caption)
                .SetTitleColor(UIThemeColor.FromStyle(UIColorStyle.Muted))
                .SetPlacement(1, 4, 24, 1)
            );

    private static StackPanelComponent CreateSettings()
        => new StackPanelComponent()
            .SetOrientation(UIOrientation.Horizontal)
            .SetSpacing(16)
            .SetMargin(UIThickness.All(0, 0, 0, 12))
            .AddChild(Caption("Layers"))
            .AddChild(new SelectComponent()
                .SetOptions([
                    new OptionItem { Id = nameof(UIGraphDirection.LeftToRight), Title = "Left to right" },
                    new OptionItem { Id = nameof(UIGraphDirection.TopToBottom), Title = "Top to bottom" },
                    new OptionItem { Id = nameof(UIGraphDirection.RightToLeft), Title = "Right to left" },
                    new OptionItem { Id = nameof(UIGraphDirection.BottomToTop), Title = "Bottom to top" }
                ])
                .BindValue(nameof(ProductionController.Direction))
                .SetWidth(UILayoutLength.Absolute(160))
                .SetVerticalAlignment(UIAlignment.Center)
            )
            .AddChild(Caption("Edges"))
            .AddChild(new SelectComponent()
                .SetOptions([
                    new OptionItem { Id = nameof(UIGraphEdgeShape.Bezier), Title = "Curved" },
                    new OptionItem { Id = nameof(UIGraphEdgeShape.Straight), Title = "Straight" },
                    new OptionItem { Id = nameof(UIGraphEdgeShape.Orthogonal), Title = "Stepped" }
                ])
                .BindValue(nameof(ProductionController.EdgeShape))
                .SetWidth(UILayoutLength.Absolute(160))
                .SetVerticalAlignment(UIAlignment.Center)
            )
            .AddChild(Caption("Resources"))
            .AddChild(new SelectComponent()
                .SetOptions([
                    new OptionItem { Id = nameof(UIGraphNodeShape.Card), Title = "Cards" },
                    new OptionItem { Id = nameof(UIGraphNodeShape.Icon), Title = "Circles" }
                ])
                .BindValue(nameof(ProductionController.NodeShape))
                .SetWidth(UILayoutLength.Absolute(120))
                .SetVerticalAlignment(UIAlignment.Center)
            )
            .AddChild(new SwitchComponent()
                .SetTitle("Edit structure")
                .BindValue(nameof(ProductionController.EditStructure))
                .SetVerticalAlignment(UIAlignment.Center)
            )
            .AddChild(new SwitchComponent()
                .SetTitle("Read only")
                .BindValue(nameof(ProductionController.ReadOnly))
                .SetVerticalAlignment(UIAlignment.Center)
            )
            .AddChild(new ButtonComponent()
                .SetTitle("Forget the layout")
                .SetType(UIButtonType.Outline)
                .OnClick(nameof(ProductionController.ResetLayout))
                .SetVerticalAlignment(UIAlignment.Center)
            );

    private static TextComponent Caption(string title)
        => new TextComponent()
            .SetTitle(title)
            .SetTitleType(UITextAppearance.Body)
            .SetVerticalAlignment(UIAlignment.Center);

    private static ProductionGraphComponent CreateGraph()
        => new ProductionGraphComponent(ProductionController.CanvasId)
            .BindItems(nameof(ProductionController.Catalogue))
            .SetCanvasHeight(24)
            .SetHeight(UILayoutLength.Fill())
            .SetShowMinimap(true)
            // The layout is the viewer's until a save sends it; the catalogue is the server's and arrives as it changes.
            .SetFormId(ProductionController.CanvasForm)
            .BindValue(nameof(ProductionController.Layout), mode: UIBindingMode.OnSubmit)
            .BindDirection(nameof(ProductionController.Direction))
            .BindNodeShape(nameof(ProductionController.NodeShape))
            .BindEdgeShape(nameof(ProductionController.EdgeShape))
            .BindIsReadOnly(nameof(ProductionController.ReadOnly))
            .BindEditStructure(nameof(ProductionController.EditStructure))
            .SetCommandIcon(UIGraphCommands.AddNode, DemoNodeIcons.AddNode)
            .SetCommandIcon(UIGraphCommands.DeleteSelection, DemoNodeIcons.Delete)
            .SetCommandIcon(UIGraphCommands.DeleteEdge, DemoNodeIcons.Delete)
            .SetCommandIcon(UIGraphCommands.Amount, DemoNodeIcons.Rename)
            .SetCommandIcon(UIGraphCommands.CraftTime, DemoNodeIcons.Time)
            .SetCommandIcon(UIGraphCommands.GroupSelection, DemoNodeIcons.Group)
            .SetCommandIcon(UIGraphCommands.Arrange, DemoNodeIcons.Arrange)
            .SetCommandIcon(UIGraphCommands.Fit, DemoNodeIcons.Fit)
            .SetCommandIcon(UIGraphCommands.Save, DemoNodeIcons.Save)
            .SetCommandIcon(UIGraphCommands.Pin, DemoNodeIcons.Pin)
            .SetCommandIcon(UIGraphCommands.Rename, DemoNodeIcons.Rename)
            .SetCommandIcon(UIGraphCommands.Color, DemoNodeIcons.Color)
            .OnSave(nameof(ProductionController.Save))
            .OnNodeClick(nameof(ProductionController.EntryClicked));

    private static StackPanelComponent CreateForm()
        => new StackPanelComponent()
            .SetOrientation(UIOrientation.Horizontal)
            .SetSpacing(12)
            .SetMargin(UIThickness.All(0, 12, 0, 4))
            .AddChild(new ButtonComponent()
                .SetTitle("Add rocket fuel")
                .SetIcon(DemoNodeIcons.AddNode)
                .SetType(UIButtonType.Primary)
                .OnClick(nameof(ProductionController.AddRecipe))
                .SetVerticalAlignment(UIAlignment.Center)
            )
            .AddChild(new ButtonComponent()
                .SetTitle("Remove it")
                .SetType(UIButtonType.Outline)
                .OnClick(nameof(ProductionController.RemoveRecipe))
                .SetVerticalAlignment(UIAlignment.Center)
            );
}
