using System;
using System.Collections.Concurrent;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using NE.Standard.UI.Shell.Files;

namespace DemoApp.Graph;

/// <summary>
/// Where this demo keeps the pictures its canvas uploads: in memory, keyed by a name of its own, and served back through the
/// framework's content endpoint. An application would put them in a blob store or on disk — the canvas never knows, since all
/// it is ever given is the address this answers with.
/// </summary>
internal sealed class PictureStore(IUIContentAddressResolver addresses) : IUIContentProvider
{
    private readonly ConcurrentDictionary<string, Picture> _pictures = new(StringComparer.Ordinal);

    /// <summary>Keeps one picture and answers the address it is served at.</summary>
    public string Add(byte[] bytes, string contentType, string fileName)
    {
        ArgumentNullException.ThrowIfNull(bytes);

        var key = Guid.NewGuid().ToString("N");

        _pictures[key] = new Picture(bytes, string.IsNullOrWhiteSpace(contentType) ? "application/octet-stream" : contentType, fileName);

        return addresses.AddressOf(key);
    }

    /// <summary>The pixel size of a picture this store holds, read off the file's own header; zero for one it does not.</summary>
    public (int Width, int Height) SizeOf(string? address)
    {
        return TryFind(address, out Picture? picture) && picture is not null && PictureHeader.TryReadSize(picture.Bytes, out var width, out var height)
            ? (width, height)
            : (0, 0);
    }

    /// <inheritdoc/>
    public Task<UIContent?> ResolveAsync(UIContentRequest request, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        if (!_pictures.TryGetValue(request.Key, out Picture? picture))
            return Task.FromResult<UIContent?>(null);

        return Task.FromResult<UIContent?>(new UIContent
        {
            Content = new MemoryStream(picture.Bytes, writable: false),
            ContentType = picture.ContentType,
            Immutable = true
        });
    }

    /// <summary>The picture one address names: the key is its last segment, since that is what the resolver made it.</summary>
    private bool TryFind(string? address, out Picture? picture)
    {
        picture = null;

        if (string.IsNullOrWhiteSpace(address))
            return false;

        var key = Uri.UnescapeDataString(address[(address.LastIndexOf('/') + 1)..]);

        return _pictures.TryGetValue(key, out picture);
    }

    private sealed record Picture(byte[] Bytes, string ContentType, string FileName);
}
