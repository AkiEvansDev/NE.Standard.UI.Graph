using NE.Standard.UI.Graph;

namespace NE.Standard.UI.Web.Graph;

/// <summary>
/// The value converter names this package registers on the client; a renderer names one in a <c>WebDomOperation</c>, and the
/// engine's registration matches it.
/// </summary>
public static class GraphConverters
{
    /// <summary>An edge shape as its attribute name.</summary>
    public const string EdgeShapeAttribute = "graph-edge-shape";

    /// <summary>A number as a length in rem.</summary>
    public const string RemCss = "graph-rem";

    /// <summary>A layout direction as its attribute name.</summary>
    public const string DirectionAttribute = "graph-direction";

    /// <summary>A node shape as its attribute name.</summary>
    public const string NodeShapeAttribute = "graph-node-shape";

    /// <summary>A production graph's mode as its attribute name.</summary>
    public const string ProductionModeAttribute = "graph-production-mode";

    /// <summary>The attribute value one edge shape is written as; the client's converter writes the same names.</summary>
    public static string EdgeShapeName(UIGraphEdgeShape shape)
        => shape switch
        {
            UIGraphEdgeShape.Bezier => "bezier",
            UIGraphEdgeShape.Straight => "straight",
            _ => "orthogonal"
        };

    /// <summary>The attribute value one layout direction is written as; the client's converter writes the same names.</summary>
    public static string DirectionName(UIGraphDirection direction)
        => direction switch
        {
            UIGraphDirection.TopToBottom => "down",
            UIGraphDirection.RightToLeft => "left",
            UIGraphDirection.BottomToTop => "up",
            _ => "right"
        };

    /// <summary>The attribute value one node shape is written as; the client's converter writes the same names.</summary>
    public static string NodeShapeName(UIGraphNodeShape shape)
        => shape == UIGraphNodeShape.Icon ? "icon" : "card";

    /// <summary>The attribute value one production mode is written as; the client's converter writes the same names.</summary>
    public static string ProductionModeName(UIProductionMode mode)
        => mode == UIProductionMode.Plan ? "plan" : "constructor";
}
