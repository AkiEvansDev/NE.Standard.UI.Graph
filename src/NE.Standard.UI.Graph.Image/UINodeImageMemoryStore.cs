using System;
using System.Collections.Generic;
using System.IO;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using NE.Standard.UI.Shell.Files;

namespace NE.Standard.UI.Graph.Image;

/// <summary>
/// An in-memory picture store that also serves what it keeps — for a demo or a tool whose pictures need not outlive the process.
/// </summary>
/// <remarks>
/// Kept by the hash of what it is, so the same file written twice is one picture at one address, and <see cref="UINodeRunCache"/>
/// hands the nodes below it on rather than running them. Past <see cref="MaxBytes"/> it lets go of the pictures used longest ago.
/// An application keeping its pictures elsewhere, or for longer, implements <see cref="IUINodeImageStore"/> on its own store.
/// </remarks>
public sealed class UINodeImageMemoryStore : IUINodeImageStore, IUIContentProvider
{
    /// <summary>The most bytes of pictures the store keeps unless the application says otherwise: 256 MB.</summary>
    public const long DefaultMaxBytes = 256L * 1024 * 1024;

    private readonly Lock _sync = new();
    // Every picture by its key, each holding its place in the order of use: the least recently used goes first under a cap.
    private readonly Dictionary<string, LinkedListNode<Kept>> _files = new(StringComparer.Ordinal);
    private readonly LinkedList<Kept> _used = new();
    private readonly IUIContentAddressResolver _addresses;
    private long _bytes;

    /// <summary>
    /// Creates a store that answers addresses from the platform's content endpoint.
    /// </summary>
    public UINodeImageMemoryStore(IUIContentAddressResolver addresses)
    {
        ArgumentNullException.ThrowIfNull(addresses);

        _addresses = addresses;
    }

    /// <summary>
    /// Gets the most bytes the store keeps, past which the pictures used longest ago are let go; null keeps every picture until the
    /// process ends.
    /// </summary>
    /// <remarks>
    /// Every upload and every picture a run makes lands here, from anyone viewing a page, so the store is bounded unless the
    /// application says otherwise. A runner's <see cref="UINodeRunCache"/> hands on a node's last outputs without asking the store,
    /// so a picture let go can still be handed on by address; the kind below it fails on it, and the next run makes everything
    /// above it afresh. Where the cap is tight, run without a cache.
    /// </remarks>
    public long? MaxBytes { get; init; } = DefaultMaxBytes;

    /// <summary>Gets how many pictures the store keeps.</summary>
    public int Count
    {
        get
        {
            lock (_sync)
                return _files.Count;
        }
    }

    /// <inheritdoc/>
    public ValueTask<UINodeImageFile?> ReadAsync(string address, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(address))
            return ValueTask.FromResult<UINodeImageFile?>(null);

        // The key is the address's last segment, since that is what the resolver made of it.
        var key = Uri.UnescapeDataString(address[(address.LastIndexOf('/') + 1)..]);

        return ValueTask.FromResult(Find(key));
    }

    private UINodeImageFile? Find(string key)
    {
        lock (_sync)
        {
            if (!_files.TryGetValue(key, out LinkedListNode<Kept>? node))
                return null;

            Touch(node);

            return node.Value.File;
        }
    }

    private void Touch(LinkedListNode<Kept> node)
    {
        _used.Remove(node);
        _used.AddFirst(node);
    }

    /// <inheritdoc/>
    public ValueTask<string> WriteAsync(UINodeImageFile file, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(file);

        var key = KeyOf(file);

        lock (_sync)
        {
            if (_files.TryGetValue(key, out LinkedListNode<Kept>? known))
            {
                Touch(known);
            }
            else
            {
                _files[key] = _used.AddFirst(new Kept(key, file));
                _bytes += file.Bytes.Length;
                Evict();
            }
        }

        return ValueTask.FromResult(_addresses.AddressOf(key));
    }

    /// <summary>The key a picture is kept under: the hash of its bytes, its type and its name.</summary>
    /// <remarks>
    /// The name counts because a save takes the name the picture came with, so two files alike but for their names are two
    /// pictures.
    /// </remarks>
    private static string KeyOf(UINodeImageFile file)
    {
        using IncrementalHash hash = IncrementalHash.CreateHash(HashAlgorithmName.SHA256);

        hash.AppendData(Encoding.UTF8.GetBytes(file.ContentType));
        hash.AppendData([0]);
        hash.AppendData(Encoding.UTF8.GetBytes(file.FileName ?? string.Empty));
        hash.AppendData([0]);
        hash.AppendData(file.Bytes.Span);

        return Convert.ToHexStringLower(hash.GetHashAndReset());
    }

    /// <summary>Lets go of the pictures used longest ago while the store holds more than its cap; the one just written stays.</summary>
    private void Evict()
    {
        if (MaxBytes is not long most)
            return;

        while (_bytes > most && _used.Count > 1 && _used.Last is { } oldest)
        {
            _used.RemoveLast();
            _ = _files.Remove(oldest.Value.Key);
            _bytes -= oldest.Value.File.Bytes.Length;
        }
    }

    /// <inheritdoc/>
    public Task<UIContent?> ResolveAsync(UIContentRequest request, CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(request);

        if (Find(request.Key) is not { } file)
            return Task.FromResult<UIContent?>(null);

        // Served from the bytes kept, not a copy of them: a picture is read far more often than it is written.
        MemoryStream content = MemoryMarshal.TryGetArray(file.Bytes, out ArraySegment<byte> kept) && kept.Array is not null
            ? new MemoryStream(kept.Array, kept.Offset, kept.Count, writable: false)
            : new MemoryStream(file.Bytes.ToArray(), writable: false);

        return Task.FromResult<UIContent?>(new UIContent
        {
            Content = content,
            ContentType = file.ContentType,
            Immutable = true
        });
    }

    private sealed record Kept(string Key, UINodeImageFile File);
}
