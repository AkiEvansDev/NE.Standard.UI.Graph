using System;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace NE.Standard.UI.Graph;

/// <summary>Writes a <see cref="UINodePicture"/> as the display reads one, and reads it back.</summary>
public sealed class UINodePictureJsonConverter : JsonConverter<UINodePicture>
{
    /// <inheritdoc/>
    public override UINodePicture? Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        using JsonDocument document = JsonDocument.ParseValue(ref reader);
        JsonElement root = document.RootElement;

        return root.ValueKind == JsonValueKind.Object && root.TryGetProperty(UINodePicture.WireKey, out JsonElement address) && address.ValueKind == JsonValueKind.String && address.GetString() is { } text
            ? new UINodePicture(text, SizeOf(root, "width"), SizeOf(root, "height"))
            : null;
    }

    private static double? SizeOf(JsonElement root, string name)
        => root.TryGetProperty(name, out JsonElement size) && size.ValueKind == JsonValueKind.Number ? size.GetDouble() : null;

    /// <inheritdoc/>
    public override void Write(Utf8JsonWriter writer, UINodePicture value, JsonSerializerOptions options)
    {
        ArgumentNullException.ThrowIfNull(writer);
        ArgumentNullException.ThrowIfNull(value);

        writer.WriteStartObject();
        writer.WriteString(UINodePicture.WireKey, value.Address);

        // A size JSON cannot spell is no size: the picture is drawn at its own.
        if (value.Width is double width && double.IsFinite(width))
            writer.WriteNumber("width", width);

        if (value.Height is double height && double.IsFinite(height))
            writer.WriteNumber("height", height);

        writer.WriteEndObject();
    }
}
