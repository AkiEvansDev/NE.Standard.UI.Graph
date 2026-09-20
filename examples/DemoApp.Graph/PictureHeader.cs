using System;
using System.Buffers.Binary;

namespace DemoApp.Graph;

/// <summary>
/// The pixel size of a picture, read off the first bytes of the file rather than by decoding it. Four formats is every one a
/// browser will hand over, and a header read is a dozen bytes against a decoder and a dependency.
/// </summary>
internal static class PictureHeader
{
    public static bool TryReadSize(ReadOnlySpan<byte> bytes, out int width, out int height)
    {
        width = 0;
        height = 0;

        if (bytes.Length < 16)
            return false;

        // PNG: the IHDR chunk is always the first, and its two dimensions are the eight bytes after its name.
        ReadOnlySpan<byte> png = [0x89, (byte)'P', (byte)'N', (byte)'G', 0x0D, 0x0A, 0x1A, 0x0A];

        if (bytes[..8].SequenceEqual(png))
        {
            width = BinaryPrimitives.ReadInt32BigEndian(bytes[16..]);
            height = BinaryPrimitives.ReadInt32BigEndian(bytes[20..]);

            return width > 0 && height > 0;
        }

        if (bytes[0] == (byte)'G' && bytes[1] == (byte)'I' && bytes[2] == (byte)'F')
        {
            width = BinaryPrimitives.ReadUInt16LittleEndian(bytes[6..]);
            height = BinaryPrimitives.ReadUInt16LittleEndian(bytes[8..]);

            return width > 0 && height > 0;
        }

        if (bytes[0] == (byte)'B' && bytes[1] == (byte)'M' && bytes.Length >= 26)
        {
            width = Math.Abs(BinaryPrimitives.ReadInt32LittleEndian(bytes[18..]));
            height = Math.Abs(BinaryPrimitives.ReadInt32LittleEndian(bytes[22..]));

            return width > 0 && height > 0;
        }

        return bytes[0] == 0xFF && bytes[1] == 0xD8 && TryReadJpeg(bytes, out width, out height);
    }

    /// <summary>JPEG carries its size in whichever start-of-frame marker the encoder wrote, so the markers are walked until one turns up.</summary>
    private static bool TryReadJpeg(ReadOnlySpan<byte> bytes, out int width, out int height)
    {
        width = 0;
        height = 0;

        var at = 2;

        while (at + 9 < bytes.Length)
        {
            if (bytes[at] != 0xFF)
            {
                at++;
                continue;
            }

            var marker = bytes[at + 1];
            var length = BinaryPrimitives.ReadUInt16BigEndian(bytes[(at + 2)..]);

            // The frame markers, minus the four that carry something else entirely (0xC4, 0xC8, 0xCC, and the restart pair).
            if (marker is >= 0xC0 and <= 0xCF and not (0xC4 or 0xC8 or 0xCC))
            {
                height = BinaryPrimitives.ReadUInt16BigEndian(bytes[(at + 5)..]);
                width = BinaryPrimitives.ReadUInt16BigEndian(bytes[(at + 7)..]);

                return width > 0 && height > 0;
            }

            if (length < 2)
                return false;

            at += 2 + length;
        }

        return false;
    }
}
