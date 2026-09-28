using NE.Standard.UI.Abstractions.Binding.Properties;

namespace NE.Standard.UI.Graph;

/// <summary>
/// Shared by every canvas laid out in layers: layer direction, default node shape, and whether structure may be edited.
/// </summary>
public interface ILayeredGraphComponent : IGraphCanvasComponent
{
    /// <summary>Gets the registered property key for <see cref="Direction"/>.</summary>
    static UIProperty DirectionProperty { get; } = new(nameof(Direction));

    /// <summary>Gets the registered property key for <see cref="NodeShape"/>.</summary>
    static UIProperty NodeShapeProperty { get; } = new(nameof(NodeShape));

    /// <summary>Gets the registered property key for <see cref="EditStructure"/>.</summary>
    static UIProperty EditStructureProperty { get; } = new(nameof(EditStructure));

    /// <summary>Gets which way the layered layout runs.</summary>
    UIGraphDirection? Direction { get; }

    /// <summary>Gets how a node that names no shape of its own is drawn.</summary>
    UIGraphNodeShape? NodeShape { get; }

    /// <summary>Gets whether the viewer may change the nodes and their links beside moving them.</summary>
    bool? EditStructure { get; }
}
