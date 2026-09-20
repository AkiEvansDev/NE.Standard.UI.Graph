using System.Collections.Generic;
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
/// The dependency graph: the graph's settings above, the modules filling the page, a form that adds a module below, and what the
/// server last heard under it.
/// </summary>
internal sealed class GraphView : GraphDemoView, IUIViewDefinition
{
    public static string ViewKey => "graph.graph";

    protected override string Route => GraphRoute;

    public override string Title => "Graph";

    protected override string Description
        => "The modules of an application and what uses what: drag from a module's dot to link it, right-click a link to caption it, Ctrl+S to apply.";

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
                .BindTitle(nameof(DependenciesController.Status))
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
                .BindValue(nameof(DependenciesController.Direction))
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
                .BindValue(nameof(DependenciesController.EdgeShape))
                .SetWidth(UILayoutLength.Absolute(160))
                .SetVerticalAlignment(UIAlignment.Center)
            )
            .AddChild(Caption("Nodes"))
            .AddChild(new SelectComponent()
                .SetOptions([
                    new OptionItem { Id = nameof(UIGraphNodeShape.Card), Title = "Cards" },
                    new OptionItem { Id = nameof(UIGraphNodeShape.Icon), Title = "Circles" }
                ])
                .BindValue(nameof(DependenciesController.NodeShape))
                .SetWidth(UILayoutLength.Absolute(120))
                .SetVerticalAlignment(UIAlignment.Center)
            )
            .AddChild(new SwitchComponent()
                .SetTitle("Edit structure")
                .BindValue(nameof(DependenciesController.EditStructure))
                .SetVerticalAlignment(UIAlignment.Center)
            )
            .AddChild(new SwitchComponent()
                .SetTitle("Read only")
                .BindValue(nameof(DependenciesController.ReadOnly))
                .SetVerticalAlignment(UIAlignment.Center)
            )
            .AddChild(new ButtonComponent()
                .SetTitle("Forget the layout")
                .SetType(UIButtonType.Outline)
                .OnClick(nameof(DependenciesController.ResetLayout))
                .SetVerticalAlignment(UIAlignment.Center)
            );

    private static TextComponent Caption(string title)
        => new TextComponent()
            .SetTitle(title)
            .SetTitleType(UITextAppearance.Body)
            .SetVerticalAlignment(UIAlignment.Center);

    private static GraphComponent CreateGraph()
        => new GraphComponent(DependenciesController.CanvasId)
            .BindItems(nameof(DependenciesController.Modules))
            .SetCanvasHeight(24)
            .SetHeight(UILayoutLength.Fill())
            .SetShowMinimap(true)
            // The layout is the viewer's until a save sends it; the modules are the server's and arrive as they change.
            .SetFormId(DependenciesController.CanvasForm)
            .BindValue(nameof(DependenciesController.Layout), mode: UIBindingMode.OnSubmit)
            .BindDirection(nameof(DependenciesController.Direction))
            .BindNodeShape(nameof(DependenciesController.NodeShape))
            .BindEdgeShape(nameof(DependenciesController.EdgeShape))
            .BindIsReadOnly(nameof(DependenciesController.ReadOnly))
            .BindEditStructure(nameof(DependenciesController.EditStructure))
            .SetCommandIcon(UIGraphCommands.AddNode, DemoNodeIcons.AddNode)
            .SetCommandIcon(UIGraphCommands.DeleteSelection, DemoNodeIcons.Delete)
            .SetCommandIcon(UIGraphCommands.DeleteEdge, DemoNodeIcons.Delete)
            .SetCommandIcon(UIGraphCommands.Caption, DemoNodeIcons.Rename)
            .SetCommandIcon(UIGraphCommands.GroupSelection, DemoNodeIcons.Group)
            .SetCommandIcon(UIGraphCommands.Arrange, DemoNodeIcons.Arrange)
            .SetCommandIcon(UIGraphCommands.Fit, DemoNodeIcons.Fit)
            .SetCommandIcon(UIGraphCommands.Save, DemoNodeIcons.Save)
            .SetCommandIcon(UIGraphCommands.Pin, DemoNodeIcons.Pin)
            .SetCommandIcon(UIGraphCommands.Rename, DemoNodeIcons.Rename)
            .SetCommandIcon(UIGraphCommands.Color, DemoNodeIcons.Color)
            .OnSave(nameof(DependenciesController.Save))
            .OnNodeClick(nameof(DependenciesController.ModuleClicked));

    private static StackPanelComponent CreateForm()
    {
        List<OptionItem> used = [];

        foreach ((var id, var title) in DependenciesController.Choices)
            used.Add(new OptionItem { Id = id, Title = title });

        return new StackPanelComponent()
            .SetOrientation(UIOrientation.Horizontal)
            .SetSpacing(12)
            .SetMargin(UIThickness.All(0, 12, 0, 4))
            .AddChild(new TextInputComponent()
                .SetTitle("Module")
                .SetTitlePlacement(UIInputTitlePlacement.Inside)
                .BindValue(nameof(DependenciesController.NewModule))
                .SetWidth(UILayoutLength.Absolute(200))
                .SetVerticalAlignment(UIAlignment.Center)
            )
            .AddChild(new SelectComponent()
                .SetTitle("Built on")
                .SetTitlePlacement(UIInputTitlePlacement.Inside)
                .SetOptions(used)
                .BindValue(nameof(DependenciesController.UsedModule))
                .SetWidth(UILayoutLength.Absolute(220))
                .SetVerticalAlignment(UIAlignment.Center)
            )
            .AddChild(new ButtonComponent()
                .SetTitle("Add module")
                .SetIcon(DemoNodeIcons.AddNode)
                .SetType(UIButtonType.Primary)
                .OnClick(nameof(DependenciesController.AddModule))
                .SetVerticalAlignment(UIAlignment.Center)
            )
            .AddChild(new ButtonComponent()
                .SetTitle("Remove it")
                .SetType(UIButtonType.Outline)
                .OnClick(nameof(DependenciesController.RemoveAdded))
                .SetVerticalAlignment(UIAlignment.Center)
            );
    }
}
