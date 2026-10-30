namespace DemoApp.Nodes;

/// <summary>The kinds every catalogue carries: values, a text joined, a counter, and what shows a run.</summary>
internal sealed class CommonNodesView : NodesSheetView, IUIViewDefinition
{
    public static string ViewKey => "nodes.common";

    protected override string Route => NodesRoute;

    protected override string Header => "nodes.page.common";

    protected override string Description
        => "nodes.page.common.description";

    protected override string CanvasId => CommonNodesController.CanvasId;

    protected override string SheetName => "nodes.sheet.common";

    protected override UINodeCatalog Kinds => CommonNodesController.Kinds;
}

/// <summary>The calculator package's kinds beside the common ones.</summary>
internal sealed class CalculatorNodesView : NodesSheetView, IUIViewDefinition
{
    public static string ViewKey => "nodes.calculator";

    protected override string Route => CalculatorRoute;

    protected override string Header => "nodes.page.calculator";

    protected override string Description
        => "nodes.page.calculator.description";

    protected override string CanvasId => CalculatorNodesController.CanvasId;

    protected override string SheetName => "nodes.sheet.calculator";

    protected override UINodeCatalog Kinds => CalculatorNodesController.Kinds;
}

/// <summary>The picture package's kinds and the file kinds beside the common ones.</summary>
internal sealed class ImageNodesView : NodesSheetView, IUIViewDefinition
{
    public static string ViewKey => "nodes.image";

    protected override string Route => ImageRoute;

    protected override string Header => "nodes.page.image";

    protected override string Description
        => "nodes.page.image.description";

    protected override string CanvasId => ImageNodesController.CanvasId;

    protected override string SheetName => "nodes.sheet.image";

    protected override UINodeCatalog Kinds => ImageNodesController.Kinds;
}

/// <summary>Every node kind across all packages, grouped by category and colour.</summary>
internal sealed class AllNodesView : NodesSheetView, IUIViewDefinition
{
    public static string ViewKey => "nodes.all";

    protected override string Route => AllKindsRoute;

    protected override string Header => "nodes.page.all";

    protected override string Description
        => "nodes.page.all.description";

    protected override string CanvasId => AllNodesController.CanvasId;

    protected override string SheetName => "nodes.sheet.all";

    protected override UINodeCatalog Kinds => AllNodesController.Kinds;
}
