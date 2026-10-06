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

    /// <summary>
    /// PNG with an eXIf chunk: orientation 6 (the camera was turned, rotate 90° clockwise to show)
    /// and a GPS position, like a phone photo. The API must apply the orientation and drop both.
    /// </summary>
    public static byte[] PngWithExif(int width, int height)
    {
        var png = Png(width, height);
        // Little-endian TIFF: header, IFD0 (Orientation, GPS IFD pointer), GPS IFD (latitude ref)
        byte[] exif =
        [
            0x49, 0x49, 0x2A, 0x00, 0x08, 0x00, 0x00, 0x00, // "II", 42, IFD0 at 8
            0x02, 0x00, // two entries
            0x12, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00, 0x06, 0x00, 0x00, 0x00, // Orientation SHORT 6
            0x25, 0x88, 0x04, 0x00, 0x01, 0x00, 0x00, 0x00, 0x26, 0x00, 0x00, 0x00, // GPS IFD LONG at 38
            0x00, 0x00, 0x00, 0x00, // no next IFD
            0x01, 0x00, // GPS IFD: one entry
            0x01, 0x00, 0x02, 0x00, 0x02, 0x00, 0x00, 0x00, (byte)'N', 0x00, 0x00, 0x00, // GPSLatitudeRef "N"
            0x00, 0x00, 0x00, 0x00,
        ];
        // After IHDR (8 signature + 25 chunk bytes), before the image data
        using var result = new MemoryStream();
        result.Write(png, 0, 33);
        WriteChunk(result, "eXIf", exif);
        result.Write(png, 33, png.Length - 33);
        return result.ToArray();
    }

    /// <summary>
    /// GIF header and a tiny frame, claiming the given size: identifiable as a GIF of that size,
    /// so only its format is wrong for the API.
    /// </summary>
    public static byte[] Gif(int width, int height)
    {
        var gif = new List<byte>();
        gif.AddRange("GIF89a"u8.ToArray());
        gif.AddRange([(byte)width, (byte)(width >> 8), (byte)height, (byte)(height >> 8)]);
        gif.AddRange([0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0xFF]); // 2-color table
        gif.AddRange([0x2C, 0x00, 0x00, 0x00, 0x00]); // image at 0,0
        gif.AddRange([(byte)width, (byte)(width >> 8), (byte)height, (byte)(height >> 8), 0x00]);
        gif.AddRange([0x02, 0x02, 0x44, 0x01, 0x00, 0x3B]); // a few pixels of data, end
        return gif.ToArray();
    }

    /// <summary>
    /// Size and chunk names of a WebP file (RIFF container), e.g. to check that no EXIF or XMP
    /// chunk was written.
    /// </summary>
    public static (int Width, int Height, IReadOnlyList<string> Chunks) ReadWebp(byte[] webp)
    {
        Assert.Equal("RIFF", Encoding.ASCII.GetString(webp, 0, 4));
        Assert.Equal("WEBP", Encoding.ASCII.GetString(webp, 8, 4));
        var chunks = new List<string>();
        (int, int)? size = null;
        for (var at = 12; at + 8 <= webp.Length;)
        {
            var name = Encoding.ASCII.GetString(webp, at, 4);
            var length = BinaryPrimitives.ReadInt32LittleEndian(webp.AsSpan(at + 4));
            var data = webp.AsSpan(at + 8, length);
            chunks.Add(name);
            size ??= name switch
            {
                // Canvas size minus one, 24 bits each
                "VP8X" => ((data[4] | data[5] << 8 | data[6] << 16) + 1, (data[7] | data[8] << 8 | data[9] << 16) + 1),
                // Lossy key frame: 3 bytes tag, 3 bytes start code, then 14-bit width and height
                "VP8 " => (BinaryPrimitives.ReadUInt16LittleEndian(data[6..]) & 0x3FFF,
                    BinaryPrimitives.ReadUInt16LittleEndian(data[8..]) & 0x3FFF),
                // Lossless: signature byte, then 14-bit width and height minus one
                "VP8L" => ((data[1] | (data[2] & 0x3F) << 8) + 1,
                    ((data[2] >> 6 | data[3] << 2 | (data[4] & 0x0F) << 10)) + 1),
                _ => null,
            };
            at += 8 + length + (length & 1);
        }
        Assert.NotNull(size);
        return (size.Value.Item1, size.Value.Item2, chunks);
    }

    /// <summary>Bytes that are no image at all.</summary>
    public static byte[] NotAnImage() => Encoding.UTF8.GetBytes("This is not an image, just text.");

    /// <summary>An SVG with a script: an image to a browser, but never one the API may store.</summary>
    public static byte[] SvgWithScript() => Encoding.UTF8.GetBytes(
        """<svg xmlns="http://www.w3.org/2000/svg" width="200" height="160"><script>alert(1)</script></svg>""");

    /// <summary>An HTML page with a script.</summary>
    public static byte[] Html() => Encoding.UTF8.GetBytes(
        "<!DOCTYPE html><html><body><script>alert(1)</script></body></html>");

    /// <summary>
    /// A valid PNG that carries <paramref name="payload"/> twice: in a text chunk and after its end
    /// (a polyglot). The stored image must hold neither.
    /// </summary>
    public static byte[] PngWithPayload(int width, int height, string payload)
    {
        var png = Png(width, height);
        using var stream = new MemoryStream();
        // Everything up to IEND (its 12 bytes: length, type, CRC), a tEXt chunk, IEND, then the payload
        stream.Write(png, 0, png.Length - 12);
        WriteChunk(stream, "tEXt", Encoding.Latin1.GetBytes("Comment\0" + payload));
        WriteChunk(stream, "IEND", []);
        stream.Write(Encoding.UTF8.GetBytes(payload));
        return stream.ToArray();
    }

    /// <summary>
    /// A PNG of a few hundred bytes whose header claims <paramref name="width"/> x
    /// <paramref name="height"/> pixels (a decompression bomb's header): decoding it would need
    /// gigabytes, so the size must be refused from the header alone.
    /// </summary>
    public static byte[] PngClaimingSize(int width, int height)
    {
        var header = new byte[13];
        BinaryPrimitives.WriteInt32BigEndian(header, width);
        BinaryPrimitives.WriteInt32BigEndian(header.AsSpan(4), height);
        header[8] = 8; // bit depth
        header[9] = 2; // color type: RGB

        using var compressed = new MemoryStream();
        using (var zlib = new ZLibStream(compressed, CompressionLevel.Fastest, leaveOpen: true))
        {
            zlib.Write(new byte[1 + width * 3]); // a single row of the claimed width
        }

        using var png = new MemoryStream();
        png.Write(Signature);
        WriteChunk(png, "IHDR", header);
        WriteChunk(png, "IDAT", compressed.ToArray());
        WriteChunk(png, "IEND", []);
        return png.ToArray();
    }

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
