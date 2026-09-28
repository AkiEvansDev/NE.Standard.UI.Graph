namespace DemoApp.Nodes;

/// <summary>
/// A page of the demo: the canvas's settings above, the sheet filling the page, the answer and what the server holds below. A page
/// names its kinds, which are the picker's and the sheet's.
/// </summary>
internal abstract class NodesSheetView : NodesDemoView
{
    /// <summary>The entries a page appends to the canvas's own menus.</summary>
    public const string RunEntryKey = "run";
    public const string PositionEntryKey = "show-position";

    /// <summary>The kinds the page's canvas offers and draws a sheet with.</summary>
    protected abstract UINodeCatalog Kinds { get; }

    protected override DemoPage CreatePage()
        => Page(new ContainerComponent()
            .SetHeight(UILayoutLength.Fill())
            .SetRow(1, UIGridUnit.Auto())
            .AddRow(UIGridUnit.Star())
            .AddRow(UIGridUnit.Auto())
            .AddRow(UIGridUnit.Auto())
            // Every control in the row is one line tall and centred on the same line: a caption above a field would raise that
            // field's middle above its neighbours', so the select wears its caption beside it, as the switches do.
            .AddChild(new StackPanelComponent()
                .SetOrientation(UIOrientation.Horizontal)
                .SetSpacing(16)
                .SetMargin(UIThickness.All(0, 0, 0, 12))
                .AddChild(UIText.Body("Edges").SetVerticalAlignment(UIAlignment.Center))
                .AddChild(new SelectComponent()
                    .SetOptions([
                        new OptionItem { Id = nameof(UIGraphEdgeShape.Bezier), Title = "Curved" },
                        new OptionItem { Id = nameof(UIGraphEdgeShape.Straight), Title = "Straight" },
                        new OptionItem { Id = nameof(UIGraphEdgeShape.Orthogonal), Title = "Stepped" }
                    ])
                    .BindValue(nameof(NodesSheetController.EdgeShape))
                    .SetWidth(UILayoutLength.Absolute(160))
                    .SetVerticalAlignment(UIAlignment.Center)
                )
                .AddChild(new SwitchComponent()
                    .SetTitle("Snap to grid")
                    .BindValue(nameof(NodesSheetController.SnapToGrid))
                    .SetVerticalAlignment(UIAlignment.Center)
                )
                .AddChild(new SwitchComponent()
                    .SetTitle("Read only")
                    .BindValue(nameof(NodesSheetController.ReadOnly))
                    .SetVerticalAlignment(UIAlignment.Center)
                )
                .AddChild(new ButtonComponent()
                    .SetTitle("Reset")
                    .SetType(UIButtonType.Outline)
                    .OnClick(nameof(NodesSheetController.Reset))
                    .SetVerticalAlignment(UIAlignment.Center)
                )
                .SetPlacement(1, 1, 24, 1)
            )
            .AddChild(new NodesComponent(NodesSheetController.CanvasId)
                .SetCatalog(Kinds)
                .SetCanvasHeight(24)
                .SetHeight(UILayoutLength.Fill())
                .SetShowMinimap(true)
                // Run, Run all and Stop in the canvas's top corner; the save command hands a run's save to the package's UINodeRuns.
                .SetShowRunPanel(true)
                .OnStop(nameof(NodesSheetController.Stop))
                // Held in the browser until a save sends it: the sheet is the viewer's until then.
                .SetFormId(NodesSheetController.CanvasForm)
                .BindValue(nameof(NodesSheetController.Sheet), mode: UIBindingMode.OnSubmit)
                .BindEdgeShape(nameof(NodesSheetController.EdgeShape))
                .BindSnapToGrid(nameof(NodesSheetController.SnapToGrid))
                .BindIsReadOnly(nameof(NodesSheetController.ReadOnly))
                .SetCommandIcon(UIGraphCommands.AddNode, NodesIcons.AddNode)
                .SetCommandIcon(UIGraphCommands.DeleteSelection, NodesIcons.Delete)
                .SetCommandIcon(UIGraphCommands.GroupSelection, NodesIcons.Group)
                .SetCommandIcon(UIGraphCommands.Arrange, NodesIcons.Arrange)
                .SetCommandIcon(UIGraphCommands.Fit, NodesIcons.Fit)
                .SetCommandIcon(UIGraphCommands.Save, NodesIcons.Save)
                .SetCommandIcon(UIGraphCommands.Pin, NodesIcons.Pin)
                .SetCommandIcon(UIGraphCommands.Rename, NodesIcons.Rename)
                .SetCommandIcon(UIGraphCommands.Color, NodesIcons.Color)
                .SetCommandIcon(UIGraphCommands.DeleteEdge, NodesIcons.Delete)
                .SetCommandIcon(UIGraphCommands.AddReroute, NodesIcons.Reroute)
                .SetCommandIcon(UIGraphCommands.ResetState, NodesIcons.Reset)
                .AddMenuEntries(new MenuItem { Id = RunEntryKey, Title = "Run the sheet", Icon = NodesIcons.Run })
                // An entry of the page's own in a node's menu, under the canvas's: the command hears which node.
                .AddNodeMenuEntries(new MenuItem { Id = PositionEntryKey, Title = "[test] Show node position", Icon = NodesIcons.Position })
                .OnMenuEntry(nameof(NodesSheetController.MenuEntry), UIGraphArguments.Entry("key"), UIGraphArguments.Target("target"))
                .OnSave(nameof(NodesSheetController.SaveAsync), UIGraphArguments.Reason("reason"))
                .OnImageUpload(nameof(NodesSheetController.ImageUploadedAsync))
                .OnNodeClick(nameof(NodesSheetController.NodeClicked))
                .SetPlacement(1, 2, 24, 1)
            )
            .AddChild(UIText.Subtitle(string.Empty)
                .BindTitle(nameof(NodesSheetController.Answer))
                .SetMargin(UIThickness.All(0, 8, 0, 0))
                .SetPlacement(1, 3, 24, 1)
            )
            .AddChild(UIText.Caption(string.Empty)
                .Muted()
                .BindTitle(nameof(NodesSheetController.Status))
                .SetPlacement(1, 4, 24, 1)
            )
        );
}
