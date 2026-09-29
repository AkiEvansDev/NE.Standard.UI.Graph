using System;
using System.Collections;
using System.Collections.Generic;
using System.Reflection;
using NE.Standard.UI.Abstractions.Recursive;

namespace NE.Standard.UI.Graph;

/// <summary>
/// One rule for putting a value onto a node's property, whether it came off the document or off the pin feeding it.
/// </summary>
internal static class UINodeProperties
{
    /// <summary>
    /// The public instance property of that name, most-derived, to avoid <c>GetProperty</c>'s ambiguous-match error when a class
    /// hides its base's with <c>new</c>.
    /// </summary>
    public static PropertyInfo? Find(Type type, string name)
    {
        for (Type? current = type; current is not null; current = current.BaseType)
        {
            if (current.GetProperty(name, BindingFlags.Public | BindingFlags.Instance | BindingFlags.DeclaredOnly) is { } property)
                return property;
        }

        return null;
    }

    /// <summary>The public instance properties, one per name: a property a class hides is the class's own, not its base's.</summary>
    public static PropertyInfo[] Own(Type type)
    {
        Dictionary<string, int> places = new(StringComparer.Ordinal);
        List<PropertyInfo> own = [];

        foreach (PropertyInfo property in type.GetProperties(BindingFlags.Public | BindingFlags.Instance))
        {
            if (!places.TryGetValue(property.Name, out var place))
            {
                places[property.Name] = own.Count;
                own.Add(property);
            }
            else if (own[place].DeclaringType!.IsAssignableFrom(property.DeclaringType))
            {
                own[place] = property;
            }
        }

        return [.. own];
    }

    /// <summary>Sets <paramref name="value"/> on <paramref name="property"/>, coerced to its declared type.</summary>
    /// <remarks>Nothing is written if the value can't be coerced or a non-nullable value type can't hold it.</remarks>
    public static void Set(PropertyInfo property, object instance, object? value)
    {
        if (value is null)
        {
            if (!property.PropertyType.IsValueType || Nullable.GetUnderlyingType(property.PropertyType) is not null)
                property.SetValue(instance, null);
        }
        else if (property.PropertyType.IsInstanceOfType(value))
        {
            property.SetValue(instance, value);
        }
        else if (value is IEnumerable items and not string && Collect(property.PropertyType, items) is { } collected)
        {
            property.SetValue(instance, collected);
        }
        else if (RecursiveValueCoercion.TryCoerce(value, property.PropertyType, out var coerced))
        {
            property.SetValue(instance, coerced);
        }
    }

    /// <summary>
    /// Builds the collection a property declares from several values, each coerced to the element type; null if the type isn't
    /// buildable.
    /// </summary>
    /// <remarks>A value that fails coercion becomes the element's default rather than being dropped.</remarks>
    public static object? Collect(Type collectionType, IEnumerable values)
    {
        Type underlying = Nullable.GetUnderlyingType(collectionType) ?? collectionType;

        if (!UINodePinTypes.TryGetElementType(underlying, out Type element))
            return null;

        List<object?> items = [];

        foreach (var value in values)
            items.Add(value);

        Array collected = Array.CreateInstance(element, items.Count);

        for (var i = 0; i < items.Count; i++)
        {
            if (Coerce(items[i], element) is { } item)
                collected.SetValue(item, i);
        }

        if (underlying.IsInstanceOfType(collected))
            return collected;

        // A List<T> and its kin take the array through their IEnumerable<T> constructor.
        return underlying.GetConstructor([typeof(IEnumerable<>).MakeGenericType(element)]) is { } constructor ? constructor.Invoke([collected]) : null;
    }

    /// <summary>
    /// One value as the given type, by the same rule: itself when it already is one, the coercion when there is one, and nothing
    /// when there is not.
    /// </summary>
    public static object? Coerce(object? value, Type targetType)
    {
        if (value is null || targetType.IsInstanceOfType(value))
            return value;

        return RecursiveValueCoercion.TryCoerce(value, targetType, out var coerced) ? coerced : null;
    }
}
