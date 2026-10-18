using System;
using System.IO;
using System.Security.Cryptography;
using System.Threading;
using System.Threading.Tasks;

namespace DemoApp.Graph.Planner;

/// <summary>
/// The resources' own pictures, served out of the planner's database through the framework's content endpoint. A picture's key holds
/// the hash of its bytes, so its address never changes what it shows: the browser keeps it for good, and a new picture is a new address.
/// </summary>
public sealed class PlannerPictures(PlannerStore store, IUIContentAddressResolver addresses) : IUIContentProvider
{
    /// <summary>What every key this provider answers starts with.</summary>
    public const string KeyPrefix = "planner/";

    /// <summary>The largest picture a resource wears: an icon, not a photograph.</summary>
    public const long MaxBytes = 2 * 1024 * 1024;

    /// <summary>Where a resource's picture is served, or nothing for one that wears its glyph.</summary>
    public string? AddressOf(ResourceRecord resource)
    {
        ArgumentNullException.ThrowIfNull(resource);

        return resource.ImageHash is { } hash ? addresses.AddressOf(KeyPrefix + resource.Id + "/" + hash) : null;
    }

    /// <summary>What a resource is shown by: its picture when it has one, its glyph otherwise.</summary>
    public string LookOf(ResourceRecord resource)
        => AddressOf(resource) ?? resource.Icon;

    /// <inheritdoc/>
    public Task<UIContent?> ResolveAsync(UIContentRequest request, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        // The resources are everyone's in this demo, so whoever may open the page may see their pictures.
        var parts = request.Key.StartsWith(KeyPrefix, StringComparison.Ordinal) ? request.Key[KeyPrefix.Length..].Split('/') : [];

        if (parts.Length != 2 || store.ReadPicture(parts[0], parts[1]) is not PictureRecord picture)
            return Task.FromResult<UIContent?>(null);

        return Task.FromResult<UIContent?>(new UIContent
        {
            Content = new MemoryStream(picture.Bytes, writable: false),
            ContentType = picture.ContentType,
            Immutable = true
        });
    }

    /// <summary>A short name for a picture's bytes, which keys its address.</summary>
    public static string Hash(byte[] bytes)
        => Convert.ToHexStringLower(SHA256.HashData(bytes))[..16];

    /// <summary>
    /// What a picture is, read off its first bytes (<see cref="UIPictureTypes.Sniff"/>): PNG, JPEG, GIF or WebP, and nothing else — a
    /// BMP is no picture a catalogue keeps, and an SVG would run its own script where the pictures are served.
    /// </summary>
    public static string? Sniff(ReadOnlySpan<byte> bytes)
        => UIPictureTypes.Sniff(bytes) is { } type && type != "image/bmp" ? type : null;
}
