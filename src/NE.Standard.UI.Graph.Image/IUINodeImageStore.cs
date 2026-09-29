using System;
using System.Threading;
using System.Threading.Tasks;

namespace NE.Standard.UI.Graph.Image;

/// <summary>Where the picture kinds read the pictures that reach them and keep the ones they make.</summary>
/// <remarks>
/// The application's own decision — a blob store, a folder or memory; all the canvas ever holds is the address this answers with.
/// </remarks>
public interface IUINodeImageStore
{
    /// <summary>
    /// The picture one address names, or null for an address this store did not give out.
    /// </summary>
    ValueTask<UINodeImageFile?> ReadAsync(string address, CancellationToken cancellationToken = default);

    /// <summary>
    /// Keeps one picture and answers the address it is served at.
    /// </summary>
    ValueTask<string> WriteAsync(UINodeImageFile file, CancellationToken cancellationToken = default);
}

/// <summary>
/// A picture's bytes as a store keeps them: the encoded file, what kind of file it is, and the name it came with, if any.
/// </summary>
public sealed class UINodeImageFile
{
    /// <summary>
    /// Creates the file of one picture.
    /// </summary>
    public UINodeImageFile(ReadOnlyMemory<byte> bytes, string contentType, string? fileName = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(contentType);

        Bytes = bytes;
        ContentType = contentType;
        FileName = fileName;
    }

    /// <summary>Gets the encoded file.</summary>
    public ReadOnlyMemory<byte> Bytes { get; }

    /// <summary>Gets the file's media type — <c>image/png</c>, <c>image/jpeg</c>.</summary>
    public string ContentType { get; }

    /// <summary>Gets the name the file came with, if any.</summary>
    public string? FileName { get; }
}
