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
/// The production graph's second use: a plan over the battery and the drink's catalogue. The page's own part is the switch between the two
/// uses and the read-only one; the targets, the period and what is made least are the canvas's own panel.
/// </summary>
internal sealed class PlanView : GraphDemoView, IUIViewDefinition
{
    public static string ViewKey => "graph.plan";

    protected override string Route => PlanRoute;

    public override string Title => "Battery and drink plan";

    protected override string Description
        => "How many runs of which recipe make the batteries and the drinks asked for: the sheet draws the plan with its totals, the panel says what is brought in, made, taken and left over.";

    protected override IVisualComponent CreatePage()
        => new ContainerComponent()
            .SetHeight(UILayoutLength.Fill())
            .SetRow(1, UIGridUnit.Auto())
            .AddRow(UIGridUnit.Star())
            .AddRow(UIGridUnit.Auto())
            .AddChild(CreateSettings().SetPlacement(1, 1, 24, 1))
            .AddChild(CreateGraph().SetPlacement(1, 2, 24, 1))
            .AddChild(new TextComponent()
                .BindTitle(nameof(PlanController.Status))
                .SetTitleType(UITextAppearance.Caption)
                .SetTitleColor(UIThemeColor.FromStyle(UIColorStyle.Muted))
                .SetMargin(UIThickness.All(0, 12, 0, 0))
                .SetPlacement(1, 3, 24, 1)
            );

    private static StackPanelComponent CreateSettings()
        => new StackPanelComponent()
            .SetOrientation(UIOrientation.Horizontal)
            .SetSpacing(16)
            .SetMargin(UIThickness.All(0, 0, 0, 12))
            .AddChild(new TextComponent()
                .SetTitle("The graph shows")
                .SetTitleType(UITextAppearance.Body)
                .SetVerticalAlignment(UIAlignment.Center)
            )
            .AddChild(new SelectComponent()
                .SetOptions([
                    new OptionItem { Id = nameof(UIProductionMode.Plan), Title = "The plan" },
                    new OptionItem { Id = nameof(UIProductionMode.Constructor), Title = "The recipes" }
                ])
                .BindValue(nameof(PlanController.Mode))
                .SetWidth(UILayoutLength.Absolute(160))
                .SetVerticalAlignment(UIAlignment.Center)
            )
            .AddChild(new SwitchComponent()
                .SetTitle("Read only")
                .BindValue(nameof(PlanController.ReadOnly))
                .SetVerticalAlignment(UIAlignment.Center)
            )
            .AddChild(new ButtonComponent()
                .SetTitle("Forget the plan")
                .SetType(UIButtonType.Outline)
                .OnClick(nameof(PlanController.Reset))
                .SetVerticalAlignment(UIAlignment.Center)
            );

    private static ProductionGraphComponent CreateGraph()
        => new ProductionGraphComponent(PlanController.CanvasId)
            .BindItems(nameof(PlanController.Catalogue))
            .SetCanvasHeight(24)
            .SetHeight(UILayoutLength.Fill())
            // The plan is the viewer's until a save sends it, as a layout is: the targets travel in the same document.
            .SetFormId(PlanController.CanvasForm)
            .BindValue(nameof(PlanController.Plan), mode: UIBindingMode.OnSubmit)
            .BindMode(nameof(PlanController.Mode))
            .BindIsReadOnly(nameof(PlanController.ReadOnly))
            .SetCommandIcon(UIGraphCommands.Target, DemoNodeIcons.Target)
            .SetCommandIcon(UIGraphCommands.GroupSelection, DemoNodeIcons.Group)
            .SetCommandIcon(UIGraphCommands.Arrange, DemoNodeIcons.Arrange)
            .SetCommandIcon(UIGraphCommands.Fit, DemoNodeIcons.Fit)
            .SetCommandIcon(UIGraphCommands.Save, DemoNodeIcons.Save)
            .SetCommandIcon(UIGraphCommands.Pin, DemoNodeIcons.Pin)
            .OnSave(nameof(PlanController.Save));
}
