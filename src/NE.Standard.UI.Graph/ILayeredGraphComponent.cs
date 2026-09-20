using NE.Standard.UI.Abstractions.Binding.Properties;
using NE.Standard.UI.Components.BuiltIns.Navigation;

namespace NE.Standard.UI.Graph;

/// <summary>
/// Shared by every canvas laid out in layers: layer direction, default node shape, whether structure may be edited, and the edge
/// menu.
/// </summary>
public interface ILayeredGraphComponent : IGraphCanvasComponent
{
    /// <summary>Gets the registered property key for <see cref="Direction"/>.</summary>
    static UIProperty DirectionProperty { get; } = new(nameof(Direction));

    /// <summary>Gets the registered property key for <see cref="NodeShape"/>.</summary>
    static UIProperty NodeShapeProperty { get; } = new(nameof(NodeShape));

    /// <summary>Gets the registered property key for <see cref="EditStructure"/>.</summary>
    static UIProperty EditStructureProperty { get; } = new(nameof(EditStructure));

    /// <summary>Gets the menu the right button opens on an edge.</summary>
    MenuComponent EdgeMenu { get; }

    /// <summary>Gets which way the layered layout runs.</summary>
    UIGraphDirection? Direction { get; }

    /// <summary>Gets how a node that names no shape of its own is drawn.</summary>
    UIGraphNodeShape? NodeShape { get; }

    /// <summary>Gets whether the viewer may change the nodes and their links beside moving them.</summary>
    bool? EditStructure { get; }
}
