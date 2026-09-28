namespace DemoApp.Nodes;

/// <summary>The kinds every catalogue carries: values, texts, counters and ranges, and what shows a run.</summary>
internal sealed class CommonNodesView : NodesSheetView, IUIViewDefinition
{
    public static string ViewKey => "nodes.common";

    protected override string Route => NodesRoute;

    public override string Title => "Common";

    protected override string Description
        => "The kinds every catalogue carries, on the node canvas: double-click the background to add a node, drag from a pin to wire one, the corner button or the right button for the menu, Ctrl+S to save, Ctrl+Z to undo; the panel in the top corner runs the sheet, once or until a counter runs out.";

    protected override UINodeCatalog Kinds => CommonNodesController.Kinds;
}

/// <summary>The calculator package's kinds beside the common ones.</summary>
internal sealed class CalculatorNodesView : NodesSheetView, IUIViewDefinition
{
    public static string ViewKey => "nodes.calculator";

    protected override string Route => CalculatorRoute;

    public override string Title => "Calculator";

    protected override string Description
        => "The calculator package's kinds, NE.Standard.UI.Graph.Calculator: operations, rounding, sums, comparisons and a result to read, worked out on the server by the same classes the canvas drew.";

    protected override UINodeCatalog Kinds => CalculatorNodesController.Kinds;
}

/// <summary>The picture package's kinds and the file kinds beside the common ones.</summary>
internal sealed class ImageNodesView : NodesSheetView, IUIViewDefinition
{
    public static string ViewKey => "nodes.image";

    protected override string Route => ImageRoute;

    public override string Title => "Image";

    protected override string Description
        => "The picture package's kinds, NE.Standard.UI.Graph.Image, with the file kinds: a picture chosen on the sheet and worked on the server, and a folder's pictures made thumbnails one a run.";

    protected override UINodeCatalog Kinds => ImageNodesController.Kinds;
}
