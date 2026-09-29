namespace CoinPortal.Api.Photos;

/// <summary>Stored renditions of a photo. All of them are square WebP images.</summary>
public enum PhotoSize
{
    Thumb,    // list thumbnails
    Preview,  // form and detail view
    Full      // fullscreen view
}

public static class PhotoSizes
{
    public static readonly IReadOnlyList<PhotoSize> All = Enum.GetValues<PhotoSize>();

    /// <summary>Edge length in pixels. Full is a maximum: smaller sources are not upscaled.</summary>
    public static int Pixels(this PhotoSize size) => size switch
    {
        PhotoSize.Thumb => 150,
        PhotoSize.Preview => 600,
        PhotoSize.Full => 1600,
        _ => throw new ArgumentOutOfRangeException(nameof(size), size, null)
    };

    public static string FileName(this PhotoSize size) => size.ToString().ToLowerInvariant() + ".webp";
}
