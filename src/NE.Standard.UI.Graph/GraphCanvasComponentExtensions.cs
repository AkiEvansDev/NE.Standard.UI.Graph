using System;
using System.Collections.Generic;
using NE.Standard.UI.Abstractions.Interaction;
using NE.Standard.UI.Authoring.Components;
using NE.Standard.UI.Components.BuiltIns.Navigation;
using NE.Standard.UI.Components.Foundation;
using NE.Standard.UI.Primitives.Interaction;

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
    /// Runs <paramref name="command"/> on Ctrl+S or the menu's Save with literal argument values, after the document has reached the
    /// server, as with every form.
    /// </summary>
    public static T OnSaveLiteral<T>(this T canvas, string command, params KeyValuePair<string, object?>[] arguments)
        where T : VisualComponentBase<T>, IGraphCanvasComponent, IUIComponentDefinition
    {
        ArgumentNullException.ThrowIfNull(canvas);
        return canvas.OnLiteral(GraphEvents.Save, command, arguments);
    }

    /// <summary>
    /// Runs <paramref name="command"/> when an entry the application put into any of the canvas's menus is clicked; the entry's id
    /// is the command's key.
    /// </summary>
    /// <remarks>
    /// The pick is raised on the entry as its menu's own event, so the server runs it only for an entry that menu holds, enabled and
    /// shown. The canvas's own entries are done in the browser and never raise it.
    /// </remarks>
    public static T OnMenuEntry<T>(this T canvas, string command, string argumentName = "key")
        where T : VisualComponentBase<T>, IGraphCanvasComponent, IUIComponentDefinition
        => canvas.OnMenuEntry(command, UIGraphArguments.Entry(argumentName));

    /// <summary>
    /// The same, naming what the command takes: <see cref="UIGraphArguments.Entry"/>, <see cref="UIGraphArguments.TargetKind"/> and
    /// <see cref="UIGraphArguments.Target"/>.
    /// </summary>
    /// <remarks>The target is named for an entry of an item's, a group's or an edge's menu.</remarks>
    public static T OnMenuEntry<T>(this T canvas, string command, params KeyValuePair<string, UIActionArgument>[] arguments)
        where T : VisualComponentBase<T>, IGraphCanvasComponent, IUIComponentDefinition
    {
        ArgumentNullException.ThrowIfNull(canvas);
        ArgumentException.ThrowIfNullOrWhiteSpace(command);
        ArgumentNullException.ThrowIfNull(arguments);

        foreach ((MenuComponent menu, var target) in EntryMenus(canvas))
        {
            KeyValuePair<string, UIActionArgument>[] read = ReadFromEntry(arguments, target);

            menu.OnClickableItemTemplates(template => _ = template.On(GraphEvents.MenuEntry, command, read));
        }

        return canvas;
    }

    /// <summary>Every menu an application's entries stand in, with what each is opened on.</summary>
    private static (MenuComponent Menu, string Target)[] EntryMenus(IGraphCanvasComponent canvas)
        =>
        [
            (canvas.Menu, UIGraphMenuTargets.Canvas),
            (canvas.CanvasMenu, UIGraphMenuTargets.Canvas),
            (canvas.NodeMenu, UIGraphMenuTargets.Node),
            (canvas.GroupMenu, UIGraphMenuTargets.Group),
            (canvas.EdgeMenu, UIGraphMenuTargets.Edge)
        ];

    /// <summary>
    /// The event's three keys as the entry's menu reads them: the entry's own key, what the menu is opened on, and the target's id
    /// the canvas raises after the entry's keys; any other argument as given.
    /// </summary>
    private static KeyValuePair<string, UIActionArgument>[] ReadFromEntry(KeyValuePair<string, UIActionArgument>[] arguments, string target)
    {
        KeyValuePair<string, UIActionArgument>[] read = new KeyValuePair<string, UIActionArgument>[arguments.Length];

        for (var i = 0; i < arguments.Length; i++)
        {
            UIActionArgument argument = arguments[i].Value;
            UIActionArgument? entryArgument = argument.Kind != UIActionArgumentKind.EventKey
                ? null
                : argument.Value switch
                {
                    UIGraphArguments.EntryKey => UIActionArgument.CurrentItemKey(),
                    UIGraphArguments.TargetKindKey => UIActionArgument.Literal(target),
                    UIGraphArguments.TargetKey => UIActionArgument.EventValue(),
                    _ => null
                };

            read[i] = new(arguments[i].Key, entryArgument ?? argument);
        }

        return read;
    }

    /// <summary>
    /// Runs <paramref name="command"/> when an entry the application put into the canvas's menus is clicked, with literal argument
    /// values in place of the entry's key and its target: for a canvas whose menus carry one entry of the application's.
    /// </summary>
    public static T OnMenuEntryLiteral<T>(this T canvas, string command, params KeyValuePair<string, object?>[] arguments)
        where T : VisualComponentBase<T>, IGraphCanvasComponent, IUIComponentDefinition
        => canvas.OnMenuEntry(command, UIActionArgument.Literals(arguments));

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

    /// <summary>
    /// Runs <paramref name="command"/> when an item is clicked, with literal argument values in place of the item's id: for a command
    /// that needs no item.
    /// </summary>
    public static T OnNodeClickLiteral<T>(this T canvas, string command, params KeyValuePair<string, object?>[] arguments)
        where T : VisualComponentBase<T>, IGraphCanvasComponent, IUIComponentDefinition
    {
        ArgumentNullException.ThrowIfNull(canvas);
        return canvas.OnLiteral(GraphEvents.NodeClick, command, arguments);
    }
}
