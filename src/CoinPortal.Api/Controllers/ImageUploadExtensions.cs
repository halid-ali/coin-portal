using CoinPortal.Api.Photos;
using Microsoft.AspNetCore.Mvc;

namespace CoinPortal.Api.Controllers;

/// <summary>Shared steps of the image upload endpoints (coin photos, collection covers).</summary>
public static class ImageUploadExtensions
{
    // Hard transport limit for [RequestSizeLimit]; PhotoOptions.MaxUploadBytes is checked in code
    public const long MaxRequestBytes = 50 * 1024 * 1024;

    /// <summary>
    /// Checks presence and size, then buffers the upload so the image processor can read the
    /// header first and the pixels afterwards. Returns either the buffer or a coded problem.
    /// </summary>
    public static async Task<(MemoryStream? Buffer, ObjectResult? Problem)> BufferUploadAsync(
        this ControllerBase controller, IFormFile? file, PhotoOptions options, CancellationToken ct)
    {
        if (file is null || file.Length == 0)
        {
            return (null, controller.CodedProblem("file_missing", "No file was uploaded."));
        }
        if (file.Length > options.MaxUploadBytes)
        {
            return (null, controller.CodedProblem("file_too_large",
                $"The file must not be larger than {options.MaxUploadBytes / (1024.0 * 1024):0.##} MB."));
        }

        var buffer = new MemoryStream((int)file.Length);
        await file.CopyToAsync(buffer, ct);
        buffer.Position = 0;
        return (buffer, null);
    }

    public static ObjectResult QuotaExceeded(this ControllerBase controller, long limitBytes) =>
        controller.CodedProblem("quota_exceeded",
            $"Photo storage limit of {limitBytes / (1024.0 * 1024):0.##} MB reached.");
}
