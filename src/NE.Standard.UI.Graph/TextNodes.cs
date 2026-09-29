using System;
using System.ComponentModel;
using System.Globalization;
using System.Linq;
using System.Text.RegularExpressions;
using NE.Standard.UI.Primitives.Constants;

namespace NE.Standard.UI.Graph;

/// <summary>
/// Where a <see cref="ContainsNode"/> looks for its part.
/// </summary>
public enum UITextMatch
{
    Anywhere,
    [Description("At the start")]
    AtStart,
    [Description("At the end")]
    AtEnd
}

/// <summary>
/// The case a <see cref="ChangeCaseNode"/> writes a text in.
/// </summary>
public enum UITextCase
{
    [Description("UPPER")]
    Upper,
    [Description("lower")]
    Lower,
    [Description("Title Case")]
    Title
}

/// <summary>
/// Which ends of a text a <see cref="TrimNode"/> takes the spaces off.
/// </summary>
public enum UITextEnds
{
    [Description("Both ends")]
    Both,
    [Description("The start")]
    Start,
    [Description("The end")]
    End
}

/// <summary>
/// Every value wired in, written out as text and joined: by the separator, or into the places of a template — <c>{0} - {1}</c>.
/// </summary>
[GraphNode(Key = NodeKey, Category = UINodeKinds.TextCategory, Title = "Join", Description = "Joins the values wired in, or puts them into a template.", Icon = UIGlyphs.Merge, Color = UINodeKinds.TextColor)]
public sealed class JoinNode : IGraphNode
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "graph.join";

    /// <summary>Gets or sets the values to join, in the order the connections were made.</summary>
    [GraphInput(Title = "Values", Multiple = true, Description = "Every value wired in, in the order the connections were made.")]
    public object?[] Values { get; set; } = [];

    /// <summary>Gets or sets the text the values are put into by their places, <c>{0}</c> for the first; empty, they are joined.</summary>
    [GraphInput(Title = "Template", MaxLength = 400, Description = "{0} for the first value, {1} for the second; empty, the values are joined by the separator.")]
    public string Template { get; set; } = string.Empty;

    /// <summary>Gets or sets what stands between two values joined without a template.</summary>
    [GraphInput(Title = "Separator", MaxLength = 40)]
    public string Separator { get; set; } = ", ";

    /// <summary>Gets or sets the text made.</summary>
    [GraphOutput(Title = "Text")]
    public string Text { get; set; } = string.Empty;

    /// <inheritdoc/>
    public void Execute(UINodeRunContext context)
    {
        var texts = new object[Values.Length];

        for (var i = 0; i < Values.Length; i++)
            texts[i] = Convert.ToString(Values[i], CultureInfo.InvariantCulture) ?? string.Empty;

        if (Template.Length == 0)
        {
            Text = string.Join(Separator, texts);
            return;
        }

        try
        {
            Text = string.Format(CultureInfo.InvariantCulture, Template, texts);
        }
        catch (FormatException)
        {
            throw new InvalidOperationException($"The template asks for a value that is not wired in ({Values.Length} reach it, the first is {{0}}), or holds a lone brace — a brace itself is written {{{{ or }}}}.");
        }
    }
}

/// <summary>
/// A text cut into its parts at every separator, each part trimmed unless asked otherwise.
/// </summary>
[GraphNode(Key = NodeKey, Category = UINodeKinds.TextCategory, Title = "Split", Description = "Cuts a text into its parts at a separator.", Icon = UIGlyphs.Split, Color = UINodeKinds.TextColor)]
public sealed class SplitNode : IGraphNode
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "graph.split";

    /// <summary>Gets or sets the text to cut.</summary>
    [GraphInput(Title = "Text")]
    public string Text { get; set; } = string.Empty;

    /// <summary>Gets or sets what the text is cut at; empty, the text is one part.</summary>
    [GraphInput(Title = "Separator", MaxLength = 40)]
    public string Separator { get; set; } = ",";

    /// <summary>Gets or sets whether each part loses the spaces around it.</summary>
    [GraphInput(Title = "Trim", NoPin = true, Description = "Take the spaces off both ends of each part.")]
    public bool Trim { get; set; } = true;

    /// <summary>Gets or sets the parts, in the order they stood.</summary>
    [GraphOutput(Title = "Parts")]
    public string[] Parts { get; set; } = [];

    /// <summary>Gets or sets how many parts there are.</summary>
    [GraphOutput(Title = "Count")]
    public int Count { get; set; }

    /// <inheritdoc/>
    public void Execute(UINodeRunContext context)
    {
        StringSplitOptions options = Trim ? StringSplitOptions.TrimEntries : StringSplitOptions.None;

        Parts = Separator.Length == 0 ? [Trim ? Text.Trim() : Text] : Text.Split(Separator, options);
        Count = Parts.Length;
    }
}

/// <summary>
/// A text with every occurrence of one part put in the place of another.
/// </summary>
[GraphNode(Key = NodeKey, Category = UINodeKinds.TextCategory, Title = "Replace", Description = "Puts one text in the place of another everywhere it stands.", Icon = UIGlyphs.Replace, Color = UINodeKinds.TextColor)]
public sealed class ReplaceNode : IGraphNode
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "graph.replace";

    /// <summary>Gets or sets the text to change.</summary>
    [GraphInput(Title = "Text")]
    public string Text { get; set; } = string.Empty;

    /// <summary>Gets or sets the part to look for; empty, nothing changes.</summary>
    [GraphInput(Title = "Find")]
    public string Find { get; set; } = string.Empty;

    /// <summary>Gets or sets what stands where the part stood.</summary>
    [GraphInput(Title = "With")]
    public string With { get; set; } = string.Empty;

    /// <summary>Gets or sets whether a capital and a small letter count as one.</summary>
    [GraphInput(Title = "Ignore case", NoPin = true)]
    public bool IgnoreCase { get; set; }

    /// <summary>Gets or sets the text changed.</summary>
    [GraphOutput(Title = "Result")]
    public string Result { get; set; } = string.Empty;

    /// <inheritdoc/>
    public void Execute(UINodeRunContext context)
        => Result = Find.Length == 0 ? Text : Text.Replace(Find, With, IgnoreCase ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal);
}

/// <summary>
/// How many characters a text holds.
/// </summary>
[GraphNode(Key = NodeKey, Category = UINodeKinds.TextCategory, Title = "Length", Description = "How many characters a text holds.", Icon = UIGlyphs.Numbers, Color = UINodeKinds.TextColor)]
public sealed class TextLengthNode : IGraphNode
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "graph.text-length";

    /// <summary>Gets or sets the text to measure.</summary>
    [GraphInput(Title = "Text")]
    public string Text { get; set; } = string.Empty;

    /// <summary>Gets or sets how many characters it holds.</summary>
    [GraphOutput(Title = "Length")]
    public int Length { get; set; }

    /// <inheritdoc/>
    public void Execute(UINodeRunContext context)
        => Length = Text.Length;
}

/// <summary>
/// Whether a text holds a part: anywhere in it, at its start or at its end.
/// </summary>
[GraphNode(Key = NodeKey, Category = UINodeKinds.TextCategory, Title = "Contains", Description = "Whether a text holds a part, anywhere or at one end.", Icon = UIGlyphs.Search, Color = UINodeKinds.TextColor)]
public sealed class ContainsNode : IGraphNode
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "graph.contains";

    /// <summary>Gets or sets the text to look in.</summary>
    [GraphInput(Title = "Text")]
    public string Text { get; set; } = string.Empty;

    /// <summary>Gets or sets the part to look for.</summary>
    [GraphInput(Title = "Part")]
    public string Part { get; set; } = string.Empty;

    /// <summary>Gets or sets where the part has to stand.</summary>
    [GraphInput(Title = "Where", NoPin = true)]
    public UITextMatch Where { get; set; }

    /// <summary>Gets or sets whether a capital and a small letter count as one.</summary>
    [GraphInput(Title = "Ignore case", NoPin = true)]
    public bool IgnoreCase { get; set; }

    /// <summary>Gets or sets whether the part stands there.</summary>
    [GraphOutput(Title = "Result")]
    public bool Result { get; set; }

    /// <inheritdoc/>
    public void Execute(UINodeRunContext context)
    {
        StringComparison comparison = IgnoreCase ? StringComparison.OrdinalIgnoreCase : StringComparison.Ordinal;

        Result = Where switch
        {
            UITextMatch.Anywhere => Text.Contains(Part, comparison),
            UITextMatch.AtStart => Text.StartsWith(Part, comparison),
            UITextMatch.AtEnd => Text.EndsWith(Part, comparison),
            _ => throw new InvalidOperationException($"'{Where}' is not a place in a text.")
        };
    }
}

/// <summary>
/// A text written again in capitals, in small letters, or with each word's first letter a capital — and trimmed if asked.
/// </summary>
[GraphNode(Key = NodeKey, Category = UINodeKinds.TextCategory, Title = "Change case", Description = "Writes a text in capitals, in small letters or as a title.", Icon = UIGlyphs.TextFields, Color = UINodeKinds.TextColor)]
public sealed class ChangeCaseNode : IGraphNode
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "graph.change-case";

    /// <summary>Gets or sets the text to write again.</summary>
    [GraphInput(Title = "Text")]
    public string Text { get; set; } = string.Empty;

    /// <summary>Gets or sets the case it is written in.</summary>
    [GraphInput(Title = "Case", NoPin = true)]
    public UITextCase Case { get; set; }

    /// <summary>Gets or sets whether the spaces around the text go too.</summary>
    [GraphInput(Title = "Trim", NoPin = true, Description = "Take the spaces off both ends as well.")]
    public bool Trim { get; set; }

    /// <summary>Gets or sets the text written again.</summary>
    [GraphOutput(Title = "Result")]
    public string Result { get; set; } = string.Empty;

    /// <inheritdoc/>
    public void Execute(UINodeRunContext context)
    {
        var text = Trim ? Text.Trim() : Text;

        // The invariant culture, as every text kind writes: a sheet run on another server must not turn "i" into a dotted capital.
        Result = Case switch
        {
            UITextCase.Upper => text.ToUpperInvariant(),
            UITextCase.Lower => text.ToLowerInvariant(),
            UITextCase.Title => CultureInfo.InvariantCulture.TextInfo.ToTitleCase(text.ToLowerInvariant()),
            _ => throw new InvalidOperationException($"'{Case}' is not a case.")
        };
    }
}

/// <summary>
/// A text with the spaces taken off both its ends, or off one.
/// </summary>
[GraphNode(Key = NodeKey, Category = UINodeKinds.TextCategory, Title = "Trim", Description = "Takes the spaces off a text's ends.", Icon = UIGlyphs.Compress, Color = UINodeKinds.TextColor)]
public sealed class TrimNode : IGraphNode
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "graph.trim";

    /// <summary>Gets or sets the text to trim.</summary>
    [GraphInput(Title = "Text")]
    public string Text { get; set; } = string.Empty;

    /// <summary>Gets or sets which ends lose their spaces.</summary>
    [GraphInput(Title = "From", NoPin = true)]
    public UITextEnds From { get; set; }

    /// <summary>Gets or sets the text trimmed.</summary>
    [GraphOutput(Title = "Result")]
    public string Result { get; set; } = string.Empty;

    /// <inheritdoc/>
    public void Execute(UINodeRunContext context)
        => Result = From switch
        {
            UITextEnds.Both => Text.Trim(),
            UITextEnds.Start => Text.TrimStart(),
            UITextEnds.End => Text.TrimEnd(),
            _ => throw new InvalidOperationException($"'{From}' is not an end of a text.")
        };
}

/// <summary>A part cut out of a text: from a place, so many characters long.</summary>
/// <remarks>
/// A start below zero counts from the end; no length runs to the end; a start or a length past the text is held to it, so a slice
/// is never an error — at worst it is empty.
/// </remarks>
[GraphNode(Key = NodeKey, Category = UINodeKinds.TextCategory, Title = "Slice", Description = "Cuts a part out of a text, from a place.", Icon = UIGlyphs.Cut, Color = UINodeKinds.TextColor)]
public sealed class SliceNode : IGraphNode
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "graph.slice";

    /// <summary>Gets or sets the text to cut from.</summary>
    [GraphInput(Title = "Text")]
    public string Text { get; set; } = string.Empty;

    /// <summary>Gets or sets where the part starts: 0 the first character, below zero counted from the end.</summary>
    [GraphInput(Title = "Start", Description = "0 for the first character; below zero counts from the end, -1 for the last.")]
    public int Start { get; set; }

    /// <summary>Gets or sets how many characters the part takes; none, to the end.</summary>
    [GraphInput(Title = "Length", Min = 0, Description = "Empty, to the end of the text.")]
    public int? Length { get; set; }

    /// <summary>Gets or sets the part cut out.</summary>
    [GraphOutput(Title = "Result")]
    public string Result { get; set; } = string.Empty;

    /// <inheritdoc/>
    public void Execute(UINodeRunContext context)
    {
        // Widened, so int.MinValue counted from the end cannot wrap round into the text.
        var start = (int)Math.Clamp(Start < 0 ? (long)Text.Length + Start : Start, 0, Text.Length);
        var length = Math.Clamp(Length ?? Text.Length, 0, Text.Length - start);

        Result = Text.Substring(start, length);
    }
}

/// <summary>
/// A number read out of a text as the invariant culture writes one, so a sheet reads the same on a server of any culture.
/// </summary>
/// <remarks>
/// A point before the fraction, no separator between thousands, an exponent allowed; <see cref="Valid"/> says whether the text was
/// one.
/// </remarks>
[GraphNode(Key = NodeKey, Category = UINodeKinds.TextCategory, Title = "To number", Description = "Reads a number out of a text.", Icon = UIGlyphs.Digits, Color = UINodeKinds.TextColor)]
public sealed class ToNumberNode : IGraphNode
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "graph.to-number";

    /// <summary>Gets or sets the text to read.</summary>
    [GraphInput(Title = "Text", Description = "A number written with a point, as 12.5; spaces around it are allowed.")]
    public string Text { get; set; } = string.Empty;

    /// <summary>Gets or sets the number read; 0 when the text is none.</summary>
    [GraphOutput(Title = "Number")]
    public double Number { get; set; }

    /// <summary>Gets or sets whether the text was a number.</summary>
    [GraphOutput(Title = "Valid")]
    public bool Valid { get; set; }

    /// <inheritdoc/>
    public void Execute(UINodeRunContext context)
    {
        // Not the server's culture: a comma would read "1,5" one way on this server and another on the next, and never as the viewer means it.
        Valid = double.TryParse(Text, NumberStyles.Float, CultureInfo.InvariantCulture, out var number) && double.IsFinite(number);
        Number = Valid ? number : 0;
    }
}

/// <summary>Whether a text matches a regular expression, the first match, and the groups it caught.</summary>
/// <remarks>
/// A pattern that cannot be read fails the node saying why, and one that runs past a second on its text — a pattern that backtracks
/// without end — fails it rather than holding the run.
/// </remarks>
[GraphNode(Key = NodeKey, Category = UINodeKinds.TextCategory, Title = "Match", Description = "Whether a text matches a regular expression, and what it caught.", Icon = UIGlyphs.RegularExpression, Color = UINodeKinds.TextColor)]
public sealed class MatchNode : IGraphNode
{
    /// <summary>The kind's key in a saved sheet.</summary>
    public const string NodeKey = "graph.match";

    // The longest a pattern may take on its text: a pattern typed by a viewer must not hold the run.
    private static readonly TimeSpan Timeout = TimeSpan.FromSeconds(1);

    /// <summary>Gets or sets the text to look in.</summary>
    [GraphInput(Title = "Text")]
    public string Text { get; set; } = string.Empty;

    /// <summary>Gets or sets the regular expression, as .NET writes one.</summary>
    [GraphInput(Title = "Pattern", MaxLength = 400, Description = "A regular expression: (\\d+) catches a run of digits as a group.")]
    public string Pattern { get; set; } = string.Empty;

    /// <summary>Gets or sets whether a capital and a small letter count as one.</summary>
    [GraphInput(Title = "Ignore case", NoPin = true)]
    public bool IgnoreCase { get; set; }

    /// <summary>Gets or sets whether the pattern matched.</summary>
    [GraphOutput(Title = "Matched")]
    public bool Matched { get; set; }

    /// <summary>Gets or sets the first match; empty when there is none.</summary>
    [GraphOutput(Title = "Match")]
    public string Match { get; set; } = string.Empty;

    /// <summary>Gets or sets what the first match's groups caught, in the order they open; a group that caught nothing is empty.</summary>
    [GraphOutput(Title = "Groups")]
    public string[] Groups { get; set; } = [];

    /// <inheritdoc/>
    public void Execute(UINodeRunContext context)
    {
        RegexOptions options = RegexOptions.CultureInvariant | (IgnoreCase ? RegexOptions.IgnoreCase : RegexOptions.None);
        Regex regex;

        try
        {
            regex = new Regex(Pattern, options, Timeout);
        }
        catch (ArgumentException exception)
        {
            throw new InvalidOperationException($"The pattern is not a regular expression: {exception.Message}", exception);
        }

        try
        {
            Match found = regex.Match(Text);

            Matched = found.Success;
            Match = found.Success ? found.Value : string.Empty;
            // Group 0 is the match itself, already on its own pin.
            Groups = found.Success ? [.. found.Groups.Cast<Group>().Skip(1).Select(static group => group.Value)] : [];
        }
        catch (RegexMatchTimeoutException exception)
        {
            throw new InvalidOperationException($"The pattern took longer than {Timeout.TotalSeconds.ToString(CultureInfo.InvariantCulture)} s on the text: it likely backtracks without end.", exception);
        }
    }
}
