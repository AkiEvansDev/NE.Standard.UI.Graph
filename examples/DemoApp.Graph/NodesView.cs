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
/// The calculator: the canvas's settings above, the sheet filling the page, the answer and what the server holds below.
/// </summary>
internal sealed class NodesView : GraphDemoView, IUIViewDefinition
{
    /// <summary>The one entry this page appends to the canvas's own menu.</summary>
    public const string RunEntryKey = "run";
    public const string DescribeEntryKey = "describe";

    public static string ViewKey => "graph.nodes";

    protected override string Route => NodesRoute;

    public override string Title => "Nodes";

    protected override string Description
        => "A calculator on the node canvas: double-click the background to add a node, drag from a pin to wire one, the corner button or the right button for the menu, Ctrl+S to save, Ctrl+Z to undo.";

    protected override IVisualComponent CreatePage()
        => new ContainerComponent()
            .SetHeight(UILayoutLength.Fill())
            .SetRow(1, UIGridUnit.Auto())
            .AddRow(UIGridUnit.Star())
            .AddRow(UIGridUnit.Auto())
            .AddRow(UIGridUnit.Auto())
            .AddChild(CreateSettings().SetPlacement(1, 1, 24, 1))
            .AddChild(CreateCanvas().SetPlacement(1, 2, 24, 1))
            .AddChild(new TextComponent()
                .BindTitle(nameof(GraphController.Answer))
                .SetTitleType(UITextAppearance.Subtitle)
                .SetMargin(UIThickness.All(0, 8, 0, 0))
                .SetPlacement(1, 3, 24, 1)
            )
            .AddChild(new TextComponent()
                .BindTitle(nameof(GraphController.Status))
                .SetTitleType(UITextAppearance.Caption)
                .SetTitleColor(UIThemeColor.FromStyle(UIColorStyle.Muted))
                .SetPlacement(1, 4, 24, 1)
            );

    // Every control in the row is one line tall and centred on the same line: a caption above a field would raise that field's
    // middle above its neighbours', so the select wears its caption beside it, as the switches do.
    private static StackPanelComponent CreateSettings()
        => new StackPanelComponent()
            .SetOrientation(UIOrientation.Horizontal)
            .SetSpacing(16)
            .SetMargin(UIThickness.All(0, 0, 0, 12))
            .AddChild(new TextComponent()
                .SetTitle("Edges")
                .SetTitleType(UITextAppearance.Body)
                .SetVerticalAlignment(UIAlignment.Center)
            )
            .AddChild(new SelectComponent()
                .SetOptions([
                    new OptionItem { Id = nameof(UIGraphEdgeShape.Bezier), Title = "Curved" },
                    new OptionItem { Id = nameof(UIGraphEdgeShape.Straight), Title = "Straight" },
                    new OptionItem { Id = nameof(UIGraphEdgeShape.Orthogonal), Title = "Stepped" }
                ])
                .BindValue(nameof(GraphController.EdgeShape))
                .SetWidth(UILayoutLength.Absolute(160))
                .SetVerticalAlignment(UIAlignment.Center)
            )
            .AddChild(new SwitchComponent()
                .SetTitle("Snap to grid")
                .BindValue(nameof(GraphController.SnapToGrid))
                .SetVerticalAlignment(UIAlignment.Center)
            )
            .AddChild(new SwitchComponent()
                .SetTitle("Read only")
                .BindValue(nameof(GraphController.ReadOnly))
                .SetVerticalAlignment(UIAlignment.Center)
            )
            .AddChild(new ButtonComponent()
                .SetTitle("Run")
                .SetIcon(DemoNodeIcons.Run)
                .SetType(UIButtonType.Primary)
                .OnClick(nameof(GraphController.Run))
                .SetVerticalAlignment(UIAlignment.Center)
            )
            .AddChild(new ButtonComponent()
                .SetTitle("Reset")
                .SetType(UIButtonType.Outline)
                .OnClick(nameof(GraphController.Reset))
                .SetVerticalAlignment(UIAlignment.Center)
            );

    private static NodesComponent CreateCanvas()
        => new NodesComponent(GraphController.CanvasId)
            .SetCatalog(GraphController.Catalog)
            .SetCanvasHeight(24)
            .SetHeight(UILayoutLength.Fill())
            .SetShowMinimap(true)
            // Held in the browser until a save sends it: the sheet is the viewer's until then.
            .SetFormId(GraphController.CanvasForm)
            .BindValue(nameof(GraphController.Sheet), mode: UIBindingMode.OnSubmit)
            .BindEdgeShape(nameof(GraphController.EdgeShape))
            .BindSnapToGrid(nameof(GraphController.SnapToGrid))
            .BindIsReadOnly(nameof(GraphController.ReadOnly))
            .SetCommandIcon(UIGraphCommands.AddNode, DemoNodeIcons.AddNode)
            .SetCommandIcon(UIGraphCommands.DeleteSelection, DemoNodeIcons.Delete)
            .SetCommandIcon(UIGraphCommands.GroupSelection, DemoNodeIcons.Group)
            .SetCommandIcon(UIGraphCommands.Arrange, DemoNodeIcons.Arrange)
            .SetCommandIcon(UIGraphCommands.Fit, DemoNodeIcons.Fit)
            .SetCommandIcon(UIGraphCommands.Save, DemoNodeIcons.Save)
            .SetCommandIcon(UIGraphCommands.Pin, DemoNodeIcons.Pin)
            .SetCommandIcon(UIGraphCommands.Rename, DemoNodeIcons.Rename)
            .SetCommandIcon(UIGraphCommands.Color, DemoNodeIcons.Color)
            .AddMenuEntries(new MenuItem { Id = RunEntryKey, Title = "Run the sheet", Icon = DemoNodeIcons.Run })
            // An entry of the page's own in a node's menu, under the canvas's: the command hears which node.
            .AddNodeMenuEntries(new MenuItem { Id = DescribeEntryKey, Title = "Describe", Icon = DemoNodeIcons.Describe })
            .OnMenuEntry(nameof(GraphController.MenuEntry), UIGraphArguments.Entry("key"), UIGraphArguments.Target("target"))
            .OnSave(nameof(GraphController.SaveAsync), UIGraphArguments.Reason("reason"))
            .OnImageUpload(nameof(GraphController.ImageUploadedAsync))
            .OnNodeClick(nameof(GraphController.NodeClicked));
}
