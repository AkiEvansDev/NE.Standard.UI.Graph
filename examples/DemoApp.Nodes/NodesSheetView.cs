namespace DemoApp.Nodes;

/// <summary>
/// A page of the demo: the canvas's settings above, the sheet filling the page, the answer and what the server holds below. A page
/// names its kinds, which are the picker's and the sheet's.
/// </summary>
internal abstract class NodesSheetView : NodesDemoView
{
    /// <summary>The entries a page appends to the canvas's own menus.</summary>
    public const string RunEntryKey = "run";

    // The canvas's least height, in rem; its row holds the same floor in pixels.
    private const double CanvasHeight = 24;

    // The parameters column beside the sheet, in px: a name and a field a row.
    private const double ParametersWidth = 280;

    /// <summary>The page's canvas, by the id its controller addresses it with.</summary>
    protected abstract string CanvasId { get; }

    /// <summary>The sheet's name in the canvas's corner menu.</summary>
    protected abstract string SheetName { get; }

    /// <summary>The kinds the page's canvas offers and draws a sheet with.</summary>
    protected abstract UINodeCatalog Kinds { get; }

    protected override DemoPage CreatePage()
        => Page(new ContainerComponent()
            .SetHeight(UILayoutLength.Fill())
            .SetRow(1, UIGridUnit.Auto())
            // The canvas takes what the page leaves and never less than its floor; where the rows and the floor do not fit, the page
            // grows past the screen (NodesDemoView.CreateContent) and scrolls, every row at its own height.
            .AddRow(UIGridUnit.Star(min: CanvasHeight * 16))
            .AddRow(UIGridUnit.Auto())
            .AddRow(UIGridUnit.Auto())
            // Every control in the row is one line tall and centred on the same line: a caption above a field would raise that
            // field's middle above its neighbours', so the select wears its caption inside it, as one line. The set wraps in even
            // columns, so a narrow page takes the switches and the button under it. Tonal, as a toolbar's fields are.
            .AddChild(new WrapPanelComponent()
                .SetSpacing(16)
                .SetLineSpacing(8)
                .SetItemMinWidth(240)
                .AddChildren(
                    new SelectComponent()
                        .SetTitle("nodes.edges")
                        .SetTitlePlacement(UIInputTitlePlacement.Inside)
                        .SetAppearance(UIInputAppearance.Tonal)
                        .SetOptions([
                            new OptionItem { Id = nameof(UIGraphEdgeShape.Bezier), Title = "nodes.edges.curved" },
                            new OptionItem { Id = nameof(UIGraphEdgeShape.Straight), Title = "nodes.edges.straight" },
                            new OptionItem { Id = nameof(UIGraphEdgeShape.Orthogonal), Title = "nodes.edges.stepped" }
                        ])
                        .BindValue(nameof(NodesSheetController.EdgeShape))
                        .SetVerticalAlignment(UIAlignment.Center),
                    new SelectComponent()
                        .SetTitle("nodes.corners")
                        .SetTitlePlacement(UIInputTitlePlacement.Inside)
                        .SetAppearance(UIInputAppearance.Tonal)
                        .SetOptions([
                            new OptionItem { Id = NodesSheetController.RoundedCorners, Title = "nodes.corners.rounded" },
                            new OptionItem { Id = NodesSheetController.SquareCorners, Title = "nodes.corners.square" }
                        ])
                        .BindValue(nameof(NodesSheetController.Corners))
                        .OnChange(nameof(NodesSheetController.CornersChosen))
                        .SetVerticalAlignment(UIAlignment.Center),
                    new SwitchComponent()
                        .SetTitle("nodes.snap")
                        .BindValue(nameof(NodesSheetController.SnapToGrid))
                        .SetVerticalAlignment(UIAlignment.Center),
                    new SwitchComponent()
                        .SetTitle("nodes.read-only")
                        .BindValue(nameof(NodesSheetController.ReadOnly))
                        .SetVerticalAlignment(UIAlignment.Center),
                    new ButtonComponent()
                        .SetTitle("nodes.reset")
                        .SetType(UIButtonType.Ghost)
                        .OnClick(nameof(NodesSheetController.Reset))
                        .SetHorizontalAlignment(UIAlignment.Start)
                        .SetVerticalAlignment(UIAlignment.Center)
                )
                .SetMargin(UIThickness.All(0, 0, 0, 12))
                .SetPlacement(1, 1, 24, 1)
            )
            // The sheet and its parameters beside it, a pane each: the viewer carries one onto the other's place by its grip, and the
            // browser keeps the order per page. The parameters keep their width on either side, the sheet taking the rest; on a phone
            // they stand under the sheet.
            .AddChild(new PaneContainerComponent($"{CanvasId}-panes")
                .SetHeight(UILayoutLength.Fill())
                .SetColumn(UIGridPlacement.GridColumns, UIGridUnit.Absolute(ParametersWidth))
                .AddRow(UIGridUnit.Auto())
                .SetSpacing(12)
                .AddPane("sheet", UIResponsive<UIGridPlacement>.Create(UIGridPlacement.At(1, 1, 24, 1), md: UIGridPlacement.At(1, 1, 23, 2)), CreateCanvas())
                .AddPane("parameters", UIResponsive<UIGridPlacement>.Create(UIGridPlacement.At(1, 2, 24, 1), md: UIGridPlacement.At(24, 1, 1, 2)), new NodesParametersComponent().SetCanvas(CanvasId), keepsSize: true)
                .SetPlacement(1, 2, 24, 1)
            )
            .AddChild(UIText.Subtitle()
                .BindTitle(nameof(NodesSheetController.Answer))
                .SetMargin(UIThickness.All(0, 8, 0, 0))
                .SetPlacement(1, 3, 24, 1)
            )
            .AddChild(UIText.Caption()
                .Muted()
                .BindTitle(nameof(NodesSheetController.Status))
                .SetTitleWrap(true)
                .SetPlacement(1, 4, 24, 1)
            )
        );

    /// <summary>The page's canvas: the sheet, its run panel, and the page's own entries in its menus.</summary>
    private NodesComponent CreateCanvas()
        => new NodesComponent(CanvasId)
            .SetCatalog(Kinds)
            .SetSheetName(SheetName)
            .SetCanvasHeight(CanvasHeight)
            .SetHeight(UILayoutLength.Fill())
            .SetShowMinimap(true)
            // Out past the default quarter: a sheet of three columns is wider than a phone's canvas at a quarter of its size.
            .SetZoomRange(0.1, 2.5)
            // Run, Run all and Stop in the canvas's top corner; the save command hands a run's save to the package's UINodeRuns.
            .SetShowRunPanel(true)
            // A node's frequent entries as icons in a bar above the node pressed: the node menu's own, a press on one its entry's
            // press; a long press on a phone opens the menu with them atop it.
            .SetNodeActionBar()
            .OnStop(nameof(NodesSheetController.Stop))
            // Held in the browser until a save sends it: the sheet is the viewer's until then.
            .SetFormId(NodesSheetController.CanvasForm)
            .BindValue(nameof(NodesSheetController.Sheet), mode: UIBindingMode.OnSubmit)
            .BindEdgeShape(nameof(NodesSheetController.EdgeShape))
            .BindSnapToGrid(nameof(NodesSheetController.SnapToGrid))
            .BindIsReadOnly(nameof(NodesSheetController.ReadOnly))
            .BindNodeCornerRadius(nameof(NodesSheetController.NodeCornerRadius))
            .AddMenuEntries(new MenuItem { Id = RunEntryKey, Title = "nodes.run-sheet", Icon = NodesIcons.Run })
            .OnMenuEntry(nameof(NodesSheetController.MenuEntry), UIGraphArguments.Entry("key"))
            .OnSave(nameof(NodesSheetController.SaveAsync), UIGraphArguments.Reason("reason"))
            .OnImageUpload(nameof(NodesSheetController.ImageUploadedAsync))
            .OnNodeClick(nameof(NodesSheetController.NodeClicked));
}
