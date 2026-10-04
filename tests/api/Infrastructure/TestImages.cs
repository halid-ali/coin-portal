using System.Buffers.Binary;
using System.IO.Compression;
using System.Text;

namespace CoinPortal.Api.Tests.Infrastructure;

/// <summary>
/// Minimal PNG encoder for upload tests. The tests do not reference the image library: the API
/// keeps it behind IImageProcessor, and a hand-written file also checks that any valid PNG works.
/// </summary>
public static class TestImages
{
    private static readonly byte[] Signature = [137, 80, 78, 71, 13, 10, 26, 10];

    /// <summary>8-bit RGB PNG with a gradient, so the encoded photo is not trivially small.</summary>
    public static byte[] Png(int width, int height)
    {
        var stride = 1 + width * 3;
        var raw = new byte[height * stride];
        for (var y = 0; y < height; y++)
        {
            // raw[y * stride] = 0: no row filter
            for (var x = 0; x < width; x++)
            {
                var i = y * stride + 1 + x * 3;
                raw[i] = (byte)(x * 255 / width);
                raw[i + 1] = (byte)(y * 255 / height);
                raw[i + 2] = 128;
            }
        }

        using var compressed = new MemoryStream();
        using (var zlib = new ZLibStream(compressed, CompressionLevel.Fastest, leaveOpen: true))
        {
            zlib.Write(raw);
        }

        var header = new byte[13];
        BinaryPrimitives.WriteInt32BigEndian(header, width);
        BinaryPrimitives.WriteInt32BigEndian(header.AsSpan(4), height);
        header[8] = 8; // bit depth
        header[9] = 2; // color type: RGB

        using var png = new MemoryStream();
        png.Write(Signature);
        WriteChunk(png, "IHDR", header);
        WriteChunk(png, "IDAT", compressed.ToArray());
        WriteChunk(png, "IEND", []);
        return png.ToArray();
    }

    /// <summary>Bytes that are no image at all.</summary>
    public static byte[] NotAnImage() => Encoding.UTF8.GetBytes("This is not an image, just text.");

    /// <summary>
    /// The header of a lossless JPEG (SOF3, 200x160, one component): a real JPEG kind that image
    /// libraries recognize but do not decode.
    /// </summary>
    public static byte[] LosslessJpeg() =>
    [
        0xFF, 0xD8, // start of image
        0xFF, 0xC3, 0x00, 0x0B, // SOF3, segment length 11
        0x08, 0x00, 0xA0, 0x00, 0xC8, // 8 bit, height 160, width 200
        0x01, 0x01, 0x11, 0x00, // one component: id 1, no subsampling, table 0
        0xFF, 0xD9, // end of image
    ];

    private static void WriteChunk(Stream stream, string type, byte[] data)
    {
        Span<byte> number = stackalloc byte[4];
        BinaryPrimitives.WriteInt32BigEndian(number, data.Length);
        stream.Write(number);

        var typeAndData = new byte[4 + data.Length];
        Encoding.ASCII.GetBytes(type, typeAndData);
        data.CopyTo(typeAndData, 4);
        stream.Write(typeAndData);

        BinaryPrimitives.WriteUInt32BigEndian(number, Crc32(typeAndData));
        stream.Write(number);
    }

    private static readonly uint[] CrcTable = Enumerable.Range(0, 256).Select(n =>
    {
        var c = (uint)n;
        for (var k = 0; k < 8; k++)
        {
            c = (c & 1) != 0 ? 0xEDB88320u ^ (c >> 1) : c >> 1;
        }
        return c;
    }).ToArray();

    private static uint Crc32(byte[] bytes)
    {
        var crc = 0xFFFFFFFFu;
        foreach (var b in bytes)
        {
            crc = CrcTable[(crc ^ b) & 0xFF] ^ (crc >> 8);
        }
        return crc ^ 0xFFFFFFFFu;
    }
}
