using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Reflection;
using System.Text.Json;
using NE.Standard.UI.Abstractions.Items;
using NE.Standard.UI.Primitives.Text;

namespace NE.Standard.UI.Graph;

/// <summary>
/// The node kinds an application offers, read off its classes' <see cref="GraphNodeAttribute"/>, <see cref="GraphInputAttribute"/>
/// and <see cref="GraphOutputAttribute"/>.
/// </summary>
/// <remarks>Shared by the canvas that draws them and the code that materializes a saved document.</remarks>
public sealed class UINodeCatalog
{
    private readonly Dictionary<string, Type> _clrTypes;

    private UINodeCatalog(UINodeType[] types, Dictionary<string, Type> clrTypes)
    {
        Types = types;
        _clrTypes = clrTypes;
    }

    /// <summary>
    /// Gets the kinds, sorted by category and then by title — the order the picker lists them in.
    /// </summary>
    public IReadOnlyList<UINodeType> Types { get; }

    /// <summary>
    /// Reads a catalogue off the given classes, each carrying <see cref="GraphNodeAttribute"/> and a parameterless constructor.
    /// </summary>
    /// <remarks>The <see cref="RerouteNode"/> is added when the classes do not name it.</remarks>
    public static UINodeCatalog FromTypes(params Type[] types)
    {
        ArgumentNullException.ThrowIfNull(types);

        List<UINodeType> read = [];
        Dictionary<string, Type> clrTypes = new(StringComparer.Ordinal);

        // Every catalogue carries the reroute: a wire's menu puts one on the sheet whatever kinds the application named.
        Type[] all = Array.IndexOf(types, typeof(RerouteNode)) >= 0 ? types : [.. types, typeof(RerouteNode)];

        foreach (Type type in all)
        {
            ArgumentNullException.ThrowIfNull(type);

            UINodeType node = ReadType(type);

            if (!clrTypes.TryAdd(node.Key, type))
                throw new ArgumentException($"Two node kinds claim the key '{node.Key}': {clrTypes[node.Key].FullName} and {type.FullName}.", nameof(types));

            read.Add(node);
        }

        read.Sort(static (left, right) =>
        {
            var byCategory = string.Compare(left.Category ?? string.Empty, right.Category ?? string.Empty, StringComparison.OrdinalIgnoreCase);

            return byCategory != 0 ? byCategory : string.Compare(left.Title, right.Title, StringComparison.OrdinalIgnoreCase);
        });

        return new UINodeCatalog([.. read], clrTypes);
    }

    private static UINodeType ReadType(Type type)
    {
        GraphNodeAttribute? node = type.GetCustomAttribute<GraphNodeAttribute>()
            ?? throw new ArgumentException($"{type.FullName} is not a node kind: it carries no [GraphNode].", nameof(type));

        if (type.GetConstructor(Type.EmptyTypes) is null)
            throw new ArgumentException($"{type.FullName} needs a parameterless constructor: a new node starts from a fresh instance.", nameof(type));

        // The defaults are what the class itself says they are, read off one instance rather than declared twice on the attribute.
        var defaults = Activator.CreateInstance(type);

        List<PinPlace> inputList = [];
        List<PinPlace> outputList = [];

        foreach (PropertyInfo property in UINodeProperties.Own(type))
        {
            // A pin with no Order falls into its own place among its side's pins, in the same numbering Order uses.
            if (property.GetCustomAttribute<GraphInputAttribute>() is { } input)
                inputList.Add(new PinPlace(input.Order, inputList.Count + 1, ReadInput(property, input, defaults)));
            else if (property.GetCustomAttribute<GraphOutputAttribute>() is { } output)
                outputList.Add(new PinPlace(output.Order, outputList.Count + 1, ReadOutput(property, output)));
        }

        UINodePin[] inputs = Ordered(inputList);
        UINodePin[] outputs = Ordered(outputList);

        foreach (UINodePin output in outputs)
        {
            if (output.TypeOf is { } source && !inputs.Any(pin => string.Equals(pin.Name, source, StringComparison.Ordinal)))
                throw new ArgumentException($"{type.FullName}.{output.Name} follows the type of '{source}', which is not one of its inputs.", nameof(type));
        }

        foreach (UINodePin input in inputs)
        {
            if (input.VisibleWhen is not { } beside)
                continue;

            if (string.Equals(beside, input.Name, StringComparison.Ordinal))
                throw new ArgumentException($"{type.FullName}.{input.Name} is shown beside itself, so it could never appear.", nameof(type));

            if (!inputs.Any(pin => string.Equals(pin.Name, beside, StringComparison.Ordinal)))
                throw new ArgumentException($"{type.FullName}.{input.Name} is shown beside '{beside}', which is not one of its inputs.", nameof(type));
        }

        return new UINodeType(
            node.Key ?? type.Name,
            node.Title ?? UINaming.Humanize(type.Name),
            inputs,
            outputs,
            node.Category,
            node.Description,
            node.Icon,
            node.Color,
            double.IsNaN(node.MinWidth) ? null : node.MinWidth,
            node.ShowProgress,
            node.Resizable,
            node.Hidden,
            node.Compact);
    }

    /// <summary>The pins in the order the attributes ask for, ties kept in the order the class declares them.</summary>
    private static UINodePin[] Ordered(List<PinPlace> pins)
    {
        // OrderBy, not List.Sort: must be stable, or equal-order pins could swap between runs; an asked-for place precedes one only fallen into.
        List<PinPlace> sorted = [.. pins.OrderBy(static pin => pin.Place).ThenBy(static pin => pin.Asked ? 0 : 1)];
        UINodePin[] ordered = new UINodePin[sorted.Count];

        for (var i = 0; i < sorted.Count; i++)
            ordered[i] = sorted[i].Pin;

        return ordered;
    }

    /// <summary>Where one pin stands: the place it asked for through <c>Order</c>, or the one it was declared in.</summary>
    private readonly struct PinPlace(int order, int declared, UINodePin pin)
    {
        public bool Asked { get; } = order != 0;

        public int Place { get; } = order != 0 ? order : declared;

        public UINodePin Pin { get; } = pin;
    }

    private static UINodePin ReadInput(PropertyInfo property, GraphInputAttribute input, object? defaults)
    {
        if (input.PinOnly && input.NoPin)
            throw new ArgumentException($"{property.DeclaringType?.FullName}.{property.Name} is both PinOnly and NoPin: it would carry neither a pin nor an editor.", nameof(input));

        if (input.Display && input.NoPin)
            throw new ArgumentException($"{property.DeclaringType?.FullName}.{property.Name} is both Display and NoPin: nothing could ever reach it.", nameof(input));

        if (input.State && (input.PinOnly || input.Display || input.Multiple))
            throw new ArgumentException($"{property.DeclaringType?.FullName}.{property.Name} is a State with a pin: what the node keeps is its own, never fed.", nameof(input));

        if (input.Hidden && !input.State)
            throw new ArgumentException($"{property.DeclaringType?.FullName}.{property.Name} is Hidden without being a State: nothing could ever set it.", nameof(input));

        var pinType = UINodePinTypes.FromClrType(property.PropertyType);
        UIChoice[] choices = ReadAuthoredChoices(property, input);

        // A text with a list of values is a combo box, and one holding a picture's address shows the picture; both stay text pins.
        // A collection with a list of values stays a list, a combo box a row.
        UINodeEditor editor = input.Display
            ? UINodeEditor.Display
            : input.PinOnly ? UINodeEditor.None
            : choices.Length > 0 && !UINodePinTypes.IsArray(pinType) ? UINodeEditor.Choice
            : input.Image && UINodePinTypes.IsTextLike(pinType) ? UINodeEditor.Image
            : EditorFor(property.PropertyType, pinType);

        if (input.Image && UINodePinTypes.IsTextLike(pinType))
            pinType = UINodePinTypes.Image;

        if (choices.Length == 0)
            choices = EnumChoices(property.PropertyType, editor);

        if (input.Large && editor != UINodeEditor.Image)
            throw new ArgumentException($"{property.DeclaringType?.FullName}.{property.Name} is Large without being a picture: only a picture editor is drawn large.", nameof(input));

        // A Multiple pin is typed by its element — one edge carries one element, gathering into the property's collection; the editor
        // stays the collection's own.
        if (input.Multiple)
        {
            if (input.NoPin)
                throw new ArgumentException($"{property.DeclaringType?.FullName}.{property.Name} is both Multiple and NoPin: it would take no connections at all.", nameof(input));

            if (!UINodePinTypes.TryGetElementType(Nullable.GetUnderlyingType(property.PropertyType) ?? property.PropertyType, out Type element))
                throw new ArgumentException($"{property.DeclaringType?.FullName}.{property.Name} is Multiple without being a collection: several connections would have nowhere to gather.", nameof(input));

            pinType = UINodePinTypes.FromClrType(element);
        }

        // A whole number steps by one unless the author says otherwise: the editor has no other way to tell int from double.
        double? step = double.IsNaN(input.Step)
            ? (UINodePinTypes.IsWholeNumber(property.PropertyType) ? 1d : null)
            : input.Step;

        return new UINodePin(
            property.Name,
            input.Title ?? UINaming.Humanize(property.Name),
            pinType,
            editor,
            editor is UINodeEditor.None or UINodeEditor.Display ? null : ReadDefault(property, defaults),
            choices,
            double.IsNaN(input.Min) ? null : input.Min,
            double.IsNaN(input.Max) ? null : input.Max,
            step,
            input.MaxLines > 0 ? input.MaxLines : null,
            input.MaxLength > 0 ? input.MaxLength : null,
            hasPin: !input.NoPin && !input.State,
            height: double.IsNaN(input.Height) ? null : input.Height,
            large: input.Large,
            required: input.Required,
            multiple: input.Multiple,
            description: input.Description,
            visibleWhen: input.VisibleWhen,
            visibleValues: input.VisibleValues,
            unit: input.Unit,
            format: input.Format,
            state: input.State,
            hidden: input.Hidden,
            typeTitle: TypeTitleOf(property.PropertyType));
    }

    /// <summary>
    /// How a person reads an application's own pin type — an enum or a class, a list's element's — humanized from its name; none for
    /// a built-in one.
    /// </summary>
    private static string? TypeTitleOf(Type clrType)
    {
        Type underlying = Nullable.GetUnderlyingType(clrType) ?? clrType;

        if (UINodePinTypes.TryGetElementType(underlying, out Type element))
            return TypeTitleOf(element);

        var id = UINodePinTypes.FromClrType(underlying);
        var own = id.StartsWith(UINodePinTypes.EnumPrefix, StringComparison.Ordinal) || string.Equals(id, underlying.Name, StringComparison.Ordinal);

        return own ? UINaming.Humanize(underlying.Name) : null;
    }

    /// <summary>The choices the attribute names, either as a list on it or from a member of the node's own class.</summary>
    private static UIChoice[] ReadAuthoredChoices(PropertyInfo property, GraphInputAttribute input)
    {
        if (input.Choices is { Length: > 0 } listed)
        {
            UIChoice[] choices = new UIChoice[listed.Length];

            for (var i = 0; i < listed.Length; i++)
                choices[i] = new UIChoice(listed[i], listed[i]);

            return choices;
        }

        if (string.IsNullOrWhiteSpace(input.ChoicesFrom))
            return [];

        IEnumerable<object?> source = ReadChoiceSource(property.DeclaringType!, input.ChoicesFrom)
            ?? throw new ArgumentException($"{property.DeclaringType?.FullName}.{property.Name} takes its choices from '{input.ChoicesFrom}', which is not a public static property or method returning values.", nameof(input));

        List<UIChoice> read = [];

        foreach (var value in source)
        {
            if (value is UIChoice choice)
                read.Add(choice);
            else if (value is not null)
                read.Add(new UIChoice(value.ToString() ?? string.Empty, value.ToString() ?? string.Empty));
        }

        return [.. read];
    }

    private static IEnumerable<object?>? ReadChoiceSource(Type owner, string member)
    {
        var value = owner.GetProperty(member, BindingFlags.Public | BindingFlags.Static)?.GetValue(null)
            ?? owner.GetMethod(member, BindingFlags.Public | BindingFlags.Static, Type.EmptyTypes)?.Invoke(null, null);

        return value as IEnumerable<object?> ?? (value as IEnumerable)?.Cast<object?>();
    }

    private static UINodeEditor EditorFor(Type clrType, string pinType)
    {
        Type underlying = Nullable.GetUnderlyingType(clrType) ?? clrType;

        if (underlying.IsEnum)
            return UINodeEditor.Choice;

        if (UINodePinTypes.IsArray(pinType))
        {
            // A list of models is not something a dialog of simple fields can edit: it comes over a connection.
            _ = UINodePinTypes.TryGetElementType(underlying, out Type element);

            return EditorFor(element, UINodePinTypes.FromClrType(element)) == UINodeEditor.None ? UINodeEditor.None : UINodeEditor.List;
        }

        return pinType switch
        {
            UINodePinTypes.Text => UINodeEditor.Text,
            UINodePinTypes.Number => UINodeEditor.Number,
            UINodePinTypes.Boolean => UINodeEditor.Boolean,
            UINodePinTypes.Date => UINodeEditor.Date,
            UINodePinTypes.Time => UINodeEditor.Time,
            UINodePinTypes.DateAndTime => UINodeEditor.DateTime,
            _ => UINodeEditor.None
        };
    }

    /// <summary>An enum's members, for its own combo box or for each row of a list of it; none for any other editor.</summary>
    private static UIChoice[] EnumChoices(Type propertyType, UINodeEditor editor)
    {
        Type underlying = Nullable.GetUnderlyingType(propertyType) ?? propertyType;

        if (editor == UINodeEditor.Choice)
            return [.. UIChoices.FromEnum(underlying)];

        if (editor != UINodeEditor.List || !UINodePinTypes.TryGetElementType(underlying, out Type element))
            return [];

        element = Nullable.GetUnderlyingType(element) ?? element;

        return element.IsEnum ? [.. UIChoices.FromEnum(element)] : [];
    }

    private static object? ReadDefault(PropertyInfo property, object? defaults)
    {
        if (defaults is null || !property.CanRead)
            return null;

        var value = property.GetValue(defaults);

        // The wire's shapes, so a default and a value the viewer typed are the same thing to the client.
        return value switch
        {
            null => null,
            Enum choice => choice.ToString(),
            DateOnly date => date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            TimeOnly time => time.ToString("HH:mm:ss", CultureInfo.InvariantCulture),
            DateTime moment => moment.ToString("O", CultureInfo.InvariantCulture),
            _ => value
        };
    }

    private static UINodePin ReadOutput(PropertyInfo property, GraphOutputAttribute output)
    {
        var pinType = UINodePinTypes.FromClrType(property.PropertyType);

        if (output.Image && UINodePinTypes.IsTextLike(pinType))
            pinType = UINodePinTypes.Image;

        return new(property.Name, output.Title ?? UINaming.Humanize(property.Name), pinType, typeOf: output.TypeOf, description: output.Description, typeTitle: TypeTitleOf(property.PropertyType));
    }

    /// <summary>
    /// The kind one key names.
    /// </summary>
    public bool TryGetType(string key, out UINodeType nodeType)
    {
        for (var i = 0; i < Types.Count; i++)
        {
            if (string.Equals(Types[i].Key, key, StringComparison.Ordinal))
            {
                nodeType = Types[i];
                return true;
            }
        }

        nodeType = null!;
        return false;
    }

    /// <summary>
    /// Whether a parameter may stand: an input of a known node, with a field of its own, that no edge feeds and that its node shows now.
    /// </summary>
    /// <remarks>
    /// The canvas offers nothing else, and passes any other over; one whose input its node hides for now (<c>VisibleWhen</c>) stays in
    /// the document and stands again when the input shows.
    /// </remarks>
    public bool CanBeParameter(UINodeDocument document, UINodeParameter parameter)
    {
        ArgumentNullException.ThrowIfNull(document);
        ArgumentNullException.ThrowIfNull(parameter);

        UINode? node = Array.Find(document.Nodes, candidate => string.Equals(candidate.Id, parameter.Node, StringComparison.Ordinal));

        if (node is null || !TryGetType(node.Type, out UINodeType type))
            return false;

        UINodePin? pin = Array.Find(type.Inputs, candidate => string.Equals(candidate.Name, parameter.Pin, StringComparison.Ordinal));

        return pin is not null && CanBeParameter(pin) && !document.IsFed(node.Id, pin.Name) && IsShown(pin, node, type);
    }

    /// <summary>
    /// Whether a kind's input can be a parameter at all: one with a field of its own — not a picture, a list, a display or a hidden
    /// state.
    /// </summary>
    public static bool CanBeParameter(UINodePin pin)
    {
        ArgumentNullException.ThrowIfNull(pin);

        return !pin.Hidden && pin.Editor is not (UINodeEditor.None or UINodeEditor.Image or UINodeEditor.List or UINodeEditor.Display);
    }

    /// <summary>Whether a node draws an input, by the canvas's rule.</summary>
    /// <remarks>
    /// One shown beside another appears only while that one holds one of the named values, or any value but an empty one — the
    /// node's own, else the kind's default.
    /// </remarks>
    private static bool IsShown(UINodePin pin, UINode node, UINodeType type)
    {
        if (pin.Hidden)
            return false;

        if (pin.VisibleWhen is not { Length: > 0 } beside)
            return true;

        var value = node.Values.TryGetValue(beside, out var held) && !IsNull(held)
            ? held
            : Array.Find(type.Inputs, candidate => string.Equals(candidate.Name, beside, StringComparison.Ordinal))?.DefaultValue;
        var text = TextOf(value);

        if (pin.VisibleValues.Length > 0)
            return Array.Exists(pin.VisibleValues, candidate => string.Equals(candidate, text, StringComparison.Ordinal));

        return text.Length > 0 && value is not false && value is not JsonElement { ValueKind: JsonValueKind.False };
    }

    private static bool IsNull(object? value)
        => value is null or JsonElement { ValueKind: JsonValueKind.Null or JsonValueKind.Undefined };

    /// <summary>A value as the canvas compares it: its text, the wire's spelling for a boolean, nothing for nothing.</summary>
    private static string TextOf(object? value)
        => value switch
        {
            null => string.Empty,
            bool flag => flag ? "true" : "false",
            JsonElement { ValueKind: JsonValueKind.String } element => element.GetString() ?? string.Empty,
            JsonElement { ValueKind: JsonValueKind.True } => "true",
            JsonElement { ValueKind: JsonValueKind.False } => "false",
            JsonElement { ValueKind: JsonValueKind.Null or JsonValueKind.Undefined } => string.Empty,
            JsonElement element => element.GetRawText(),
            IFormattable formattable => formattable.ToString(null, CultureInfo.InvariantCulture),
            _ => value.ToString() ?? string.Empty
        };

    /// <summary>
    /// The document's parameters that may stand (<see cref="CanBeParameter(UINodeDocument, UINodeParameter)"/>), in their order.
    /// </summary>
    /// <remarks>A document off the wire carries what the browser sent, so a sheet's parameters are read through here.</remarks>
    public UINodeParameter[] ParametersOf(UINodeDocument document)
    {
        ArgumentNullException.ThrowIfNull(document);

        return Array.FindAll(document.Parameters, parameter => CanBeParameter(document, parameter));
    }

    /// <summary>
    /// Turns a saved document back into a typed network: an instance of the developer's class per node, with the viewer's values,
    /// and the edges between them.
    /// </summary>
    /// <remarks>
    /// A node of a kind this catalogue does not know is left out. The document may be the browser's, so a node with no id or no
    /// kind, a node whose id an earlier one took and an edge that names no pin are left out too.
    /// </remarks>
    public UINodeNetwork Materialize(UINodeDocument document)
    {
        ArgumentNullException.ThrowIfNull(document);

        List<UINodeInstance> nodes = [];
        Dictionary<string, UINodeInstance> byId = new(StringComparer.Ordinal);

        foreach (UINode node in document.Nodes)
        {
            if (string.IsNullOrEmpty(node.Id) || string.IsNullOrEmpty(node.Type) || byId.ContainsKey(node.Id))
                continue;

            if (!_clrTypes.TryGetValue(node.Type, out Type? clrType) || Activator.CreateInstance(clrType) is not { } instance)
                continue;

            ApplyValues(clrType, instance, node);

            UINodeInstance materialized = new(node.Id, node.Type, instance);

            nodes.Add(materialized);
            byId[node.Id] = materialized;
        }

        List<UINodeConnection> connections = [];

        foreach (UINodeEdge edge in document.Edges)
        {
            if (edge.FromNode is null || edge.ToNode is null || string.IsNullOrEmpty(edge.FromPin) || string.IsNullOrEmpty(edge.ToPin))
                continue;

            if (byId.TryGetValue(edge.FromNode, out UINodeInstance? from) && byId.TryGetValue(edge.ToNode, out UINodeInstance? to))
                connections.Add(new UINodeConnection(from, edge.FromPin, to, edge.ToPin));
        }

        return new UINodeNetwork([.. nodes], [.. connections]);
    }

    private static void ApplyValues(Type clrType, object instance, UINode node)
    {
        foreach (KeyValuePair<string, object?> value in node.Values)
        {
            PropertyInfo? property = UINodeProperties.Find(clrType, value.Key);

            if (property is null || !property.CanWrite || property.GetCustomAttribute<GraphInputAttribute>() is null)
                continue;

            // A collection is the node's own copy: a node may change it in place, and the document's must stand as it was until a
            // run is through with it — a run of all hands the state one run left to the next.
            var held = value.Value is IEnumerable items and not string ? UINodeProperties.Collect(property.PropertyType, items) ?? value.Value : value.Value;

            UINodeProperties.Set(property, instance, held);
        }
    }
}

/// <summary>
/// One node of a materialized network: its id in the document, its kind, and the instance of the developer's class.
/// </summary>
public sealed class UINodeInstance(string id, string type, object node)
{
    /// <summary>
    /// Gets the node's id in the document.
    /// </summary>
    public string Id { get; } = id;

    /// <summary>
    /// Gets the key of the node kind.
    /// </summary>
    public string Type { get; } = type;

    /// <summary>
    /// Gets the instance of the developer's class, with the viewer's values on it.
    /// </summary>
    public object Node { get; } = node;
}

/// <summary>
/// One connection of a materialized network, between two instances' pins.
/// </summary>
public sealed class UINodeConnection(UINodeInstance from, string fromPin, UINodeInstance to, string toPin)
{
    /// <summary>
    /// Gets the node the connection leaves.
    /// </summary>
    public UINodeInstance From { get; } = from;

    /// <summary>
    /// Gets the output pin the connection leaves.
    /// </summary>
    public string FromPin { get; } = fromPin;

    /// <summary>
    /// Gets the node the connection enters.
    /// </summary>
    public UINodeInstance To { get; } = to;

    /// <summary>
    /// Gets the input pin the connection enters.
    /// </summary>
    public string ToPin { get; } = toPin;
}

/// <summary>
/// A saved document as typed objects: the application runs this, not the JSON.
/// </summary>
public sealed class UINodeNetwork(UINodeInstance[] nodes, UINodeConnection[] connections)
{
    /// <summary>
    /// Gets the nodes.
    /// </summary>
    public UINodeInstance[] Nodes { get; } = nodes;

    /// <summary>
    /// Gets the connections.
    /// </summary>
    public UINodeConnection[] Connections { get; } = connections;

    /// <summary>
    /// The instance one node id stands for.
    /// </summary>
    public bool TryGetNode(string id, out UINodeInstance node)
    {
        for (var i = 0; i < Nodes.Length; i++)
        {
            if (string.Equals(Nodes[i].Id, id, StringComparison.Ordinal))
            {
                node = Nodes[i];
                return true;
            }
        }

        node = null!;
        return false;
    }
}
