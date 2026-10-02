using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.Text.Json;
using NE.Standard.UI.Primitives.Localization;

namespace NE.Standard.UI.Graph;

/// <summary>
/// What of a value a display pin is sent: a long text or list cut short, saying what was left out — a phrase of
/// <see cref="UIGraphWords.More"/> with its count, which the page writes in its own words — and a value JSON cannot carry sent as
/// its text.
/// </summary>
/// <remarks>
/// A display is read, not kept: a whole file's text or a list of a million lines would otherwise cross the connection and stand in
/// the page on every run. A value the canvas keeps — a node's state — is sent whole, by <see cref="Wire"/>, but for one JSON cannot
/// write: that one goes as its text, cut at <see cref="MostCharacters"/> with the same <see cref="UIGraphWords.More"/> phrase.
/// </remarks>
internal static class UINodeDisplayValue
{
    /// <summary>The most entries of a list a display shows.</summary>
    public const int MostItems = 200;

    /// <summary>The most characters of a text a display shows.</summary>
    public const int MostCharacters = 10_000;

    /// <summary>The most bytes of JSON one record may come to.</summary>
    private const int MostBytes = 256 * 1024;

    public static object? Shorten(object? value)
        => value switch
        {
            null => null,
            string text => ShortenText(text),
            _ when IsScalar(value) => Finite(value),
            // A dictionary is a record's fields to the display, not a list of pairs.
            IDictionary => Sendable(value, MostBytes),
            IEnumerable items => ShortenList(items),
            _ => Sendable(value, MostBytes)
        };

    /// <summary>
    /// A value the canvas keeps, as the wire can carry it whole: a number JSON cannot spell as its text, a list's items each so, and
    /// anything else JSON cannot write as its text; the value itself when nothing of it needs to change.
    /// </summary>
    public static object? Wire(object? value)
        => value switch
        {
            null or string => value,
            _ when IsScalar(value) => Finite(value),
            IDictionary => Sendable(value, int.MaxValue),
            IEnumerable items => WireList(items),
            _ => Sendable(value, int.MaxValue)
        };

    /// <summary>The list itself when every item travels as it is, or its items as the wire can carry them.</summary>
    private static object WireList(IEnumerable items)
    {
        List<object?> wired = [];
        var changed = false;

        foreach (var item in items)
        {
            var sent = Wire(item);

            changed |= !ReferenceEquals(sent, item);
            wired.Add(sent);
        }

        return changed ? wired : items;
    }

    /// <summary>A text as it is, or its first characters and then what was left out, as two lines.</summary>
    private static object ShortenText(string text)
    {
        if (text.Length <= MostCharacters)
            return text;

        List<object?> lines = [text[..MostCharacters], More(text.Length - MostCharacters)];

        return lines;
    }

    /// <summary>What was left out, as a word the page fills and chooses the plural form of.</summary>
    private static UIPhrase More(int count)
        => UIPhrase.Of(UIGraphWords.More, ("count", count));

    private static bool IsScalar(object value)
        => value.GetType().IsPrimitive || value is decimal or Enum or DateTime or DateTimeOffset or DateOnly or TimeOnly or TimeSpan or Guid;

    /// <summary>A NaN or an infinity as its text; any other scalar as it is.</summary>
    /// <remarks>JSON has no NaN or infinity: the hub's writer throws on one and drops the connection it was sending over.</remarks>
    private static object Finite(object value)
        => value switch
        {
            double number when !double.IsFinite(number) => number.ToString(CultureInfo.InvariantCulture),
            float number when !float.IsFinite(number) => number.ToString(CultureInfo.InvariantCulture),
            _ => value
        };

    /// <summary>
    /// The value itself when it travels as JSON within the bound, or its own text: a cycle, an unwritable member or a number JSON
    /// cannot spell would break the connection it is sent over.
    /// </summary>
    private static object? Sendable(object value, int mostBytes)
    {
        try
        {
            var json = JsonSerializer.SerializeToUtf8Bytes(value, value.GetType(), JsonSerializerOptions.Web);

            return json.Length <= mostBytes ? value : ShortenText(Convert.ToString(value, CultureInfo.InvariantCulture) ?? string.Empty);
        }
        // A NaN or an infinity is an ArgumentException from the writer, not a JsonException.
        catch (Exception exception) when (exception is JsonException or NotSupportedException or InvalidOperationException or ArgumentException)
        {
            return ShortenText(Convert.ToString(value, CultureInfo.InvariantCulture) ?? string.Empty);
        }
    }

    private static List<object?> ShortenList(IEnumerable items)
    {
        List<object?> shown = [];
        var left = 0;

        foreach (var item in items)
        {
            if (shown.Count < MostItems)
                shown.Add(Shorten(item));
            else
                left++;
        }

        if (left > 0)
            shown.Add(More(left));

        return shown;
    }
}
