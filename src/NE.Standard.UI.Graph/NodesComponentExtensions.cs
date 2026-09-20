using System;
using System.Collections.Generic;
using NE.Standard.UI.Abstractions.Interaction;
using NE.Standard.UI.Authoring.Components;

namespace NE.Standard.UI.Graph;

public static class NodesComponentExtensions
{
    /// <summary>
    /// Runs <paramref name="command"/> when a file chosen on a picture pin is uploaded, passing the node, pin, selection and file
    /// name (see <see cref="UIGraphArguments"/>).
    /// </summary>
    /// <remarks>
    /// The pin shows nothing until the command replies with a <see cref="SetNodeValueEffect"/> carrying the stored address; storage
    /// itself is the application's responsibility.
    /// </remarks>
    public static T OnImageUpload<T>(this T canvas, string command)
        where T : NodesComponent<T>, IUIComponentDefinition
    {
        ArgumentNullException.ThrowIfNull(canvas);

        return canvas.On(
            GraphEvents.ImageUpload,
            command,
            UIGraphArguments.Node("node"),
            UIGraphArguments.Pin("pin"),
            UIGraphArguments.Selection("selection"),
            UIGraphArguments.FileName("fileName"));
    }

    /// <inheritdoc cref="OnImageUpload{T}(T, string)"/>
    public static T OnImageUpload<T>(this T canvas, string command, params KeyValuePair<string, UIActionArgument>[] arguments)
        where T : NodesComponent<T>, IUIComponentDefinition
    {
        ArgumentNullException.ThrowIfNull(canvas);
        return canvas.On(GraphEvents.ImageUpload, command, arguments);
    }
}
