using System;
using System.Collections.Generic;
using NE.Standard.UI.Abstractions.Interaction;
using NE.Standard.UI.Authoring.Components;
using NE.Standard.UI.Components.Foundation;

namespace NE.Standard.UI.Graph;

public static class GraphCanvasComponentExtensions
{
    /// <summary>
    /// Runs <paramref name="command"/> on Ctrl+S or the menu's Save, after the document has reached the server.
    /// </summary>
    public static T OnSave<T>(this T canvas, string command)
        where T : VisualComponentBase<T>, IGraphCanvasComponent, IUIComponentDefinition
    {
        ArgumentNullException.ThrowIfNull(canvas);
        return canvas.On(GraphEvents.Save, command);
    }

    /// <inheritdoc cref="OnSave{T}(T, string)"/>
    public static T OnSave<T>(this T canvas, string command, params KeyValuePair<string, UIActionArgument>[] arguments)
        where T : VisualComponentBase<T>, IGraphCanvasComponent, IUIComponentDefinition
    {
        ArgumentNullException.ThrowIfNull(canvas);
        return canvas.On(GraphEvents.Save, command, arguments);
    }

    /// <summary>
    /// Runs <paramref name="command"/> when an entry the application put into any of the canvas's menus is clicked; the entry's id
    /// is the command's key.
    /// </summary>
    /// <remarks>The canvas's own entries never reach it.</remarks>
    public static T OnMenuEntry<T>(this T canvas, string command, string argumentName = "key")
        where T : VisualComponentBase<T>, IGraphCanvasComponent, IUIComponentDefinition
    {
        ArgumentNullException.ThrowIfNull(canvas);
        return canvas.On(GraphEvents.MenuEntry, command, UIGraphArguments.Entry(argumentName));
    }

    /// <summary>
    /// The same, naming what the command takes: <see cref="UIGraphArguments.Entry"/>, <see cref="UIGraphArguments.TargetKind"/> and
    /// <see cref="UIGraphArguments.Target"/>.
    /// </summary>
    /// <remarks>The target is named for an entry of an item's, a group's or an edge's menu.</remarks>
    public static T OnMenuEntry<T>(this T canvas, string command, params KeyValuePair<string, UIActionArgument>[] arguments)
        where T : VisualComponentBase<T>, IGraphCanvasComponent, IUIComponentDefinition
    {
        ArgumentNullException.ThrowIfNull(canvas);
        return canvas.On(GraphEvents.MenuEntry, command, arguments);
    }

    /// <summary>
    /// Runs <paramref name="command"/> when an item is clicked; the clicked item's id is the command's key.
    /// </summary>
    public static T OnNodeClick<T>(this T canvas, string command, string argumentName = "node")
        where T : VisualComponentBase<T>, IGraphCanvasComponent, IUIComponentDefinition
    {
        ArgumentNullException.ThrowIfNull(canvas);
        return canvas.On(GraphEvents.NodeClick, command, UIGraphArguments.Node(argumentName));
    }

    /// <inheritdoc cref="OnNodeClick{T}(T, string, string)"/>
    public static T OnNodeClick<T>(this T canvas, string command, params KeyValuePair<string, UIActionArgument>[] arguments)
        where T : VisualComponentBase<T>, IGraphCanvasComponent, IUIComponentDefinition
    {
        ArgumentNullException.ThrowIfNull(canvas);
        return canvas.On(GraphEvents.NodeClick, command, arguments);
    }
}
