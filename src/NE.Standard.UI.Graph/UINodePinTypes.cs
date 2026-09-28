using System;
using System.Collections.Generic;

namespace NE.Standard.UI.Graph;

/// <summary>
/// The pin type ids a connection is matched on. Not a closed set: a developer's class is its own pin type, connecting to its own
/// kind or to <see cref="Any"/>.
/// </summary>
public static class UINodePinTypes
{
    /// <summary>The universal type: an edge is allowed to or from it whatever stands at the other end.</summary>
    public const string Any = "any";

    /// <summary>An array of anything — the universal array, which an array pin of any element type accepts; an <c>object[]</c> property's pin.</summary>
    public const string Array = "array";

    public const string Text = "text";

    /// <summary>Every number, whole or not: an integer output feeds a decimal input and the other way round.</summary>
    public const string Number = "number";

    public const string Boolean = "boolean";

    /// <summary>A picture's address — a text pin by another name, so the two connect.</summary>
    public const string Image = "image";

    public const string Date = "date";
    public const string Time = "time";
    /// <summary>A date and a time together. Not named <c>DateTime</c>: the constant would shadow the type this file compares against.</summary>
    public const string DateAndTime = "datetime";

    /// <summary>What an array pin's id starts with; what follows is the element type's id.</summary>
    public const string ArrayPrefix = "array:";

    /// <summary>What an enum pin's id starts with; what follows is the enum type's name.</summary>
    public const string EnumPrefix = "enum:";

    /// <summary>
    /// The pin type id one CLR type stands for.
    /// </summary>
    public static string FromClrType(Type type)
    {
        ArgumentNullException.ThrowIfNull(type);

        Type underlying = Nullable.GetUnderlyingType(type) ?? type;

        if (underlying == typeof(object))
            return Any;

        if (underlying == typeof(string))
            return Text;

        if (underlying == typeof(bool))
            return Boolean;

        if (IsNumber(underlying))
            return Number;

        if (underlying == typeof(DateOnly))
            return Date;

        if (underlying == typeof(TimeOnly) || underlying == typeof(TimeSpan))
            return Time;

        if (underlying == typeof(DateTime) || underlying == typeof(DateTimeOffset))
            return DateAndTime;

        if (underlying.IsEnum)
            return EnumPrefix + underlying.Name;

        // An array of anything is the universal array, or no typed array could ever feed it.
        if (TryGetElementType(underlying, out Type? element))
            return element == typeof(object) ? Array : ArrayPrefix + FromClrType(element);

        return underlying.Name;
    }

    /// <summary>
    /// Whether a CLR type is one of the numbers, whole or not.
    /// </summary>
    public static bool IsNumber(Type type)
    {
        ArgumentNullException.ThrowIfNull(type);

        Type underlying = Nullable.GetUnderlyingType(type) ?? type;

        return underlying == typeof(byte) || underlying == typeof(sbyte) || underlying == typeof(short) || underlying == typeof(ushort)
            || underlying == typeof(int) || underlying == typeof(uint) || underlying == typeof(long) || underlying == typeof(ulong)
            || underlying == typeof(float) || underlying == typeof(double) || underlying == typeof(decimal);
    }

    /// <summary>
    /// Whether a CLR type is a whole number, which a number editor steps by one.
    /// </summary>
    public static bool IsWholeNumber(Type type)
    {
        ArgumentNullException.ThrowIfNull(type);

        Type underlying = Nullable.GetUnderlyingType(type) ?? type;

        return underlying == typeof(byte) || underlying == typeof(sbyte) || underlying == typeof(short) || underlying == typeof(ushort)
            || underlying == typeof(int) || underlying == typeof(uint) || underlying == typeof(long) || underlying == typeof(ulong);
    }

    /// <summary>
    /// The element type of an array or list type, or none when the type is neither.
    /// </summary>
    public static bool TryGetElementType(Type type, out Type elementType)
    {
        ArgumentNullException.ThrowIfNull(type);

        if (type.IsArray && type.GetElementType() is { } array)
        {
            elementType = array;
            return true;
        }

        if (type.IsGenericType && type != typeof(string))
        {
            Type definition = type.GetGenericTypeDefinition();

            if (definition == typeof(List<>) || definition == typeof(IList<>) || definition == typeof(IReadOnlyList<>) || definition == typeof(IEnumerable<>) || definition == typeof(ICollection<>))
            {
                elementType = type.GetGenericArguments()[0];
                return true;
            }
        }

        elementType = typeof(object);
        return false;
    }

    /// <summary>
    /// Whether an edge may run from an output of <paramref name="from"/> into an input of <paramref name="to"/>.
    /// </summary>
    /// <remarks>Kept here because the client answers the same question while a connection is being dragged.</remarks>
    public static bool CanConnect(string from, string to)
    {
        if (string.IsNullOrEmpty(from) || string.IsNullOrEmpty(to))
            return false;

        if (string.Equals(from, to, StringComparison.Ordinal))
            return true;

        if (string.Equals(from, Any, StringComparison.Ordinal) || string.Equals(to, Any, StringComparison.Ordinal))
            return true;

        // A picture is an address: it goes into a text pin and a text goes into it.
        if (IsTextLike(from) && IsTextLike(to))
            return true;

        // The universal array takes any array and is taken by any array pin.
        var fromArray = IsArray(from);
        var toArray = IsArray(to);

        return fromArray && toArray && (string.Equals(from, Array, StringComparison.Ordinal) || string.Equals(to, Array, StringComparison.Ordinal));
    }

    /// <summary>
    /// Whether the pin type is text or a picture's address, which are the same thing on the wire.
    /// </summary>
    public static bool IsTextLike(string type)
        => string.Equals(type, Text, StringComparison.Ordinal) || string.Equals(type, Image, StringComparison.Ordinal);

    /// <summary>
    /// Whether the pin type is an array — the universal one or an array of something.
    /// </summary>
    public static bool IsArray(string type)
        => string.Equals(type, Array, StringComparison.Ordinal) || (type is not null && type.StartsWith(ArrayPrefix, StringComparison.Ordinal));
}
