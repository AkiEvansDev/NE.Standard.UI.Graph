namespace DemoApp.Nodes;

/// <summary>The kinds every catalogue carries: values, a text joined, a counter, and what shows a run.</summary>
internal sealed class CommonNodesView : NodesSheetView, IUIViewDefinition
{
    public static string ViewKey => "nodes.common";

    protected override string Route => NodesRoute;

    public override string Title => "nodes.page.common";

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

    public override string Title => "nodes.page.calculator";

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

    public override string Title => "nodes.page.image";

    protected override string Description
        => "nodes.page.image.description";

    protected override string CanvasId => ImageNodesController.CanvasId;

    protected override string SheetName => "nodes.sheet.image";

    protected override UINodeCatalog Kinds => ImageNodesController.Kinds;
}
