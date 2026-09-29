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
/// the page on every run.
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
            _ when IsScalar(value) => value,
            // A dictionary is a record's fields to the display, not a list of pairs.
            IDictionary => Sendable(value),
            IEnumerable items => ShortenList(items),
            _ => Sendable(value)
        };

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

    /// <summary>The value itself when it travels as JSON within the bound, or its own text: a cycle or an unwritable member would break the connection it is sent over.</summary>
    private static object? Sendable(object value)
    {
        try
        {
            var json = JsonSerializer.SerializeToUtf8Bytes(value, value.GetType(), JsonSerializerOptions.Web);

            return json.Length <= MostBytes ? value : ShortenText(Convert.ToString(value, CultureInfo.InvariantCulture) ?? string.Empty);
        }
        catch (Exception exception) when (exception is JsonException or NotSupportedException or InvalidOperationException)
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
