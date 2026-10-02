using System.ComponentModel.DataAnnotations;

namespace CoinPortal.Api.Photos;

/// <summary>
/// Configuration section "PhotoStorage". Hosting overrides RootPath with an absolute path
/// outside the app folder (e.g. environment variable PhotoStorage__RootPath), so publishing
/// never touches the stored photos.
/// </summary>
public class PhotoOptions
{
    public const string SectionName = "PhotoStorage";

    /// <summary>Absolute, or relative to the content root (the project folder in development).</summary>
    [Required]
    public string RootPath { get; set; } = "App_Data/photos";

    /// <summary>Largest accepted upload.</summary>
    [Range(1, 50 * 1024 * 1024)]
    public long MaxUploadBytes { get; set; } = 10 * 1024 * 1024;

    /// <summary>
    /// Largest accepted source width or height; guards against decompression bombs. The client sends
    /// at most 1600 px (crop output); 4000 px decodes to about 64 MB.
    /// </summary>
    [Range(1600, 12000)]
    public int MaxSourceDimension { get; set; } = 4000;

    /// <summary>Images decoded at the same time; more uploads wait. Bounds the memory they take.</summary>
    [Range(1, 16)]
    public int MaxConcurrentDecodes { get; set; } = 2;

    /// <summary>Stored bytes allowed per user, all sizes of all photos together.</summary>
    [Range(1, long.MaxValue)]
    public long UserQuotaBytes { get; set; } = 300L * 1024 * 1024;

    /// <summary>Lossy WebP quality, 0-100.</summary>
    [Range(1, 100)]
    public int WebpQuality { get; set; } = 80;
}
