using CoinPortal.Api.Photos;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace CoinPortal.Api.Controllers;

/// <summary>Shared steps of the image endpoints (coin photos, collection covers).</summary>
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

    /// <summary>
    /// Buffers, checks and processes a coin photo upload: the files to store (by file name), or
    /// a coded problem (file_missing, file_too_large, invalid_image).
    /// </summary>
    public static async Task<(IReadOnlyDictionary<string, byte[]>? Files, ObjectResult? Problem)> ProcessCoinPhotoAsync(
        this ControllerBase controller, IFormFile? file, IImageProcessor imageProcessor, PhotoOptions options,
        CancellationToken ct)
    {
        var (buffer, problem) = await controller.BufferUploadAsync(file, options, ct);
        if (problem is not null)
        {
            return (null, problem);
        }

        try
        {
            await using (buffer)
            {
                var sizes = await imageProcessor.ProcessAsync(buffer!, ct);
                return (sizes.ToDictionary(s => s.Key.FileName(), s => s.Value), null);
            }
        }
        catch (InvalidImageException e)
        {
            return (null, controller.CodedProblem("invalid_image", e.Message));
        }
    }

    public static ObjectResult QuotaExceeded(this ControllerBase controller, long limitBytes) =>
        controller.CodedProblem("quota_exceeded",
            $"Photo storage limit of {limitBytes / (1024.0 * 1024):0.##} MB reached.");

    /// <summary>
    /// Cache-Control of a served image. With the version (v, the image id) the URL changes with
    /// every upload, so the browser may keep it for good; without it the same URL serves the next
    /// image too, so the browser revalidates (the ETag makes that a 304).
    /// </summary>
    public static string ImageCacheControl(Guid? version) =>
        version is null ? "private, no-cache" : "private, max-age=31536000, immutable";

    /// <summary>
    /// 409 "conflict": another request changed the same image at the same time (the client asks
    /// the user to try again).
    /// </summary>
    public static ObjectResult ChangedAtTheSameTime(this ControllerBase controller) =>
        controller.CodedProblem("conflict", "The image was changed at the same time. Try again.",
            StatusCodes.Status409Conflict);

    /// <summary>
    /// True if a save failed because another request got there first: the replaced row was gone
    /// already, or the same side was added twice (unique index). Anything else (the database is
    /// unreachable, a timeout) is a real error, not a conflict.
    /// </summary>
    public static bool IsConcurrentChange(DbUpdateException e) =>
        e is DbUpdateConcurrencyException || e.InnerException is SqlException { Number: 2601 or 2627 };
}
