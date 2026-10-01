using NE.Standard.UI.Abstractions.Binding.Properties;
using NE.Standard.UI.Authoring.Components;
using NE.Standard.UI.Components.BuiltIns.Navigation;

namespace NE.Standard.UI.Graph;

/// <summary>
/// What every canvas of the package has, whatever its kind draws on it: the view's settings, the corner menu and the empty surface's.
/// </summary>
public interface IGraphCanvasComponent : IInputComponent
{
    /// <summary>Gets the registered property key for <see cref="EdgeShape"/>.</summary>
    static UIProperty EdgeShapeProperty { get; } = new(nameof(EdgeShape));

    /// <summary>Gets the registered property key for <see cref="GridSize"/>.</summary>
    static UIProperty GridSizeProperty { get; } = new(nameof(GridSize));

    /// <summary>Gets the registered property key for <see cref="ShowGrid"/>.</summary>
    static UIProperty ShowGridProperty { get; } = new(nameof(ShowGrid));

    /// <summary>Gets the registered property key for <see cref="ShowFocusRing"/>.</summary>
    static UIProperty ShowFocusRingProperty { get; } = new(nameof(ShowFocusRing));

    /// <summary>Gets the registered property key for <see cref="ShowMenuButton"/>.</summary>
    static UIProperty ShowMenuButtonProperty { get; } = new(nameof(ShowMenuButton));

    /// <summary>Gets the registered property key for <see cref="ShowMinimap"/>.</summary>
    static UIProperty ShowMinimapProperty { get; } = new(nameof(ShowMinimap));

    /// <summary>Gets the registered property key for <see cref="HighlightOnHover"/>.</summary>
    static UIProperty HighlightOnHoverProperty { get; } = new(nameof(HighlightOnHover));

    /// <summary>Gets the registered property key for <see cref="AutoSave"/>.</summary>
    static UIProperty AutoSaveProperty { get; } = new(nameof(AutoSave));

    /// <summary>Gets the registered property key for <see cref="SnapToGrid"/>.</summary>
    static UIProperty SnapToGridProperty { get; } = new(nameof(SnapToGrid));

    /// <summary>Gets the registered property key for <see cref="MinZoom"/>.</summary>
    static UIProperty MinZoomProperty { get; } = new(nameof(MinZoom));

    /// <summary>Gets the registered property key for <see cref="MaxZoom"/>.</summary>
    static UIProperty MaxZoomProperty { get; } = new(nameof(MaxZoom));

    /// <summary>Gets the registered property key for <see cref="CanvasHeight"/>.</summary>
    static UIProperty CanvasHeightProperty { get; } = new(nameof(CanvasHeight));

    /// <summary>Gets the registered property key for <see cref="NodeActionBar"/>.</summary>
    static UIProperty NodeActionBarProperty { get; } = new(nameof(NodeActionBar));

    /// <summary>Gets the registered property key for <see cref="NodeActionBarRepeatInMore"/>.</summary>
    static UIProperty NodeActionBarRepeatInMoreProperty { get; } = new(nameof(NodeActionBarRepeatInMore));

    /// <summary>Gets the registered property key for <see cref="ColorChoices"/>.</summary>
    static UIProperty ColorChoicesProperty { get; } = new(nameof(ColorChoices));

    /// <summary>Gets the menu that slides out of the canvas's leading corner.</summary>
    MenuComponent Menu { get; }

    /// <summary>Gets the menu the right button opens on the canvas's empty surface.</summary>
    MenuComponent CanvasMenu { get; }

    /// <summary>Gets the shape every edge is drawn in.</summary>
    UIGraphEdgeShape? EdgeShape { get; }

    /// <summary>Gets the step of the grid behind the canvas, in canvas units.</summary>
    double? GridSize { get; }

    /// <summary>Gets whether the grid is drawn.</summary>
    bool? ShowGrid { get; }

    /// <summary>Gets whether the canvas shows a ring when it takes the keyboard.</summary>
    bool? ShowFocusRing { get; }

    /// <summary>Gets whether the canvas draws <see cref="Menu"/> in its leading corner.</summary>
    bool? ShowMenuButton { get; }

    /// <summary>Gets whether the canvas draws a map of the whole sheet in its corner.</summary>
    bool? ShowMinimap { get; }

    /// <summary>Gets whether the item under the pointer brings out what it is joined to and lets the rest step back.</summary>
    bool? HighlightOnHover { get; }

    /// <summary>Gets whether every edit is saved as it is made, as Ctrl+S would save it.</summary>
    bool? AutoSave { get; }

    /// <summary>
    /// Gets whether a node carries an action bar: the node menu's entries marked <c>InActionBar</c> as icons above the node the reader
    /// chose — pressed, tapped, or holding the keyboard — until a press elsewhere, Escape, or another node chosen.
    /// </summary>
    bool? NodeActionBar { get; }

    /// <summary>
    /// Gets whether the menu a node bar's "…" opens repeats the entries the bar shows; off, it holds the rest alone. A right-click and
    /// a long press open the whole menu either way.
    /// </summary>
    bool? NodeActionBarRepeatInMore { get; }

    /// <summary>Gets whether a moved item's position is rounded to the grid's step.</summary>
    bool? SnapToGrid { get; }

    /// <summary>Gets how far the canvas may be zoomed out.</summary>
    double? MinZoom { get; }

    /// <summary>Gets how far the canvas may be zoomed in.</summary>
    double? MaxZoom { get; }

    /// <summary>Gets the least height the canvas stands at, in rem.</summary>
    double? CanvasHeight { get; }

    /// <summary>Gets the colours an item's or a group's menu offers, in their order.</summary>
    UIGraphColorChoice[]? ColorChoices { get; }
}
