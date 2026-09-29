namespace CoinPortal.Api.Photos;

/// <summary>Collection cover: one 16:9 WebP, the shape of the collection cards.</summary>
public static class CoverImage
{
    public const int AspectWidth = 16;
    public const int AspectHeight = 9;

    /// <summary>Largest stored width; the height follows the aspect ratio (675).</summary>
    public const int Width = 1200;

    public const int MinWidth = 320;

    public const string FileName = "cover.webp";

    public static int HeightFor(int width) => width * AspectHeight / AspectWidth;
}
