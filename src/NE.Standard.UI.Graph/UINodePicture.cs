using System.Text.Json.Serialization;

namespace NE.Standard.UI.Graph;

/// <summary>
/// A picture's address marked as a picture, with the size to draw it at if it has one: what a display draws as a picture inside a
/// record or a list.
/// </summary>
/// <remarks>
/// A display draws a text as a picture only when its pin's type says so — a picture's pin, or one an output of a picture feeds —
/// never by what the text looks like. A record's field or a list's item has no pin of its own, so a value there says so itself by
/// being one of these. It travels as <c>{ "$picture": address, "width": …, "height": … }</c>.
/// </remarks>
[JsonConverter(typeof(UINodePictureJsonConverter))]
public sealed record UINodePicture(string Address, double? Width = null, double? Height = null)
{
    /// <summary>The key a picture's address travels under; a property of a class written as JSON never takes it.</summary>
    public const string WireKey = "$picture";
}
