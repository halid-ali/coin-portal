using System.Buffers.Binary;
using System.IO.Compression;
using System.Text;
using CoinPortal.Api.Data;

namespace CoinPortal.Api.DevData;

/// <summary>
/// Stand-in coin photos for the dev seed: a flat disc in the coin's metal colors on a light
/// background, written as a PNG by hand (the image library stays behind IImageProcessor, which
/// turns it into the stored WebP files like any upload).
/// </summary>
public static class SeedPhotos
{
    private const int Size = 400;

    private static readonly byte[] Background = [241, 245, 249];
    private static readonly byte[] Copper = [184, 115, 51];
    private static readonly byte[] Gold = [212, 160, 23];
    private static readonly byte[] Silver = [176, 184, 194];

    public static byte[] Png(Denomination denomination)
    {
        var (ring, core) = denomination switch
        {
            Denomination.Cent1 or Denomination.Cent2 or Denomination.Cent5 => (Copper, Copper),
            Denomination.Euro1 => (Gold, Silver),
            Denomination.Euro2 => (Silver, Gold),
            _ => (Gold, Gold),
        };

        var stride = 1 + Size * 3;
        var raw = new byte[Size * stride];
        const double center = (Size - 1) / 2.0, outer = Size * 0.42, inner = outer * 0.64;
        for (var y = 0; y < Size; y++)
        {
            // raw[y * stride] = 0: no row filter
            for (var x = 0; x < Size; x++)
            {
                var distance = Math.Sqrt((x - center) * (x - center) + (y - center) * (y - center));
                var color = distance <= inner ? core : distance <= outer ? ring : Background;
                color.CopyTo(raw, y * stride + 1 + x * 3);
            }
        }

        using var compressed = new MemoryStream();
        using (var zlib = new ZLibStream(compressed, CompressionLevel.Fastest, leaveOpen: true))
        {
            zlib.Write(raw);
        }

        var header = new byte[13];
        BinaryPrimitives.WriteInt32BigEndian(header, Size);
        BinaryPrimitives.WriteInt32BigEndian(header.AsSpan(4), Size);
        header[8] = 8; // bit depth
        header[9] = 2; // color type: RGB

        using var png = new MemoryStream();
        png.Write([137, 80, 78, 71, 13, 10, 26, 10]);
        WriteChunk(png, "IHDR", header);
        WriteChunk(png, "IDAT", compressed.ToArray());
        WriteChunk(png, "IEND", []);
        return png.ToArray();
    }

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
