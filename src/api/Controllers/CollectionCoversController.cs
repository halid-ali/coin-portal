using CoinPortal.Api.Contracts.Collections;
using CoinPortal.Api.Data;
using CoinPortal.Api.Photos;
using CoinPortal.Api.Querying;
using CoinPortal.Api.Hosting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.Net.Http.Headers;

namespace CoinPortal.Api.Controllers;

/// <summary>
/// Uploaded cover of one of the signed-in user's collections (16:9 WebP, see CoverImage).
/// Same error codes as coin photos. Without a cover the client shows its default picture.
/// </summary>
[ApiController]
[Route("api/collections/{collectionId:int}/cover")]
[Authorize]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
public class CollectionCoversController(
    AppDbContext db,
    UserManager<ApplicationUser> userManager,
    IImageProcessor imageProcessor,
    IPhotoStorage photoStorage,
    PhotoQuota photoQuota,
    IOptions<PhotoOptions> photoOptions,
    ILogger<CollectionCoversController> logger) : ControllerBase
{
    private string CurrentUserId => userManager.GetUserId(User)!;

    /// <summary>Uploads or replaces the cover (multipart, field "file"). Returns the collection id and new cover id.</summary>
    [HttpPut]
    [RequestSizeLimit(ImageUploadExtensions.MaxRequestBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = ImageUploadExtensions.MaxRequestBytes)]
    [ProducesResponseType<CollectionCoverImageResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<CollectionCoverImageResponse>> Upload(
        int collectionId, IFormFile? file, CancellationToken ct)
    {
        var collection = await FindOwnedAsync(collectionId, ct);
        if (collection is null)
        {
            return NotFound();
        }

        var (buffer, problem) = await this.BufferUploadAsync(file, photoOptions.Value, ct);
        if (problem is not null)
        {
            return problem;
        }

        byte[] cover;
        try
        {
            await using (buffer)
            {
                cover = await imageProcessor.ProcessCoverAsync(buffer!, ct);
            }
        }
        catch (InvalidImageException e)
        {
            return this.CodedProblem("invalid_image", e.Message);
        }

        // The cover being replaced does not count against the quota
        var oldCoverId = collection.CoverImageId;
        if (await photoQuota.ExceededLimitAsync(collection.OwnerId, cover.Length, oldCoverId, ct) is { } limit)
        {
            return this.QuotaExceeded(limit);
        }

        // File first, then the row; a failed save removes the new file again
        var coverId = Guid.NewGuid();
        await photoStorage.SaveAsync(collection.OwnerId, coverId,
            new Dictionary<string, byte[]> { [CoverImage.FileName] = cover }, ct);
        int updated;
        try
        {
            // Only if the cover is still the one read above: of two uploads at the same time one
            // wins, the other removes its file (it would be in no row) and reports a conflict.
            // Not the request token: once the file exists, finish or clean up deliberately
            updated = await SetCoverAsync(collection.Id, oldCoverId, coverId, cover.Length, CancellationToken.None);
        }
        catch
        {
            await photoStorage.DeleteAsync(collection.OwnerId, coverId);
            throw;
        }
        if (updated == 0)
        {
            await photoStorage.DeleteAsync(collection.OwnerId, coverId);
            return this.ChangedAtTheSameTime();
        }

        if (oldCoverId is { } old)
        {
            await photoStorage.DeleteAsync(collection.OwnerId, old);
        }

        return new CollectionCoverImageResponse(collection.Id, coverId);
    }

    /// <summary>Removes the uploaded cover; the client shows its default picture again.</summary>
    [HttpDelete]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(int collectionId, CancellationToken ct)
    {
        var collection = await FindOwnedAsync(collectionId, ct);
        if (collection?.CoverImageId is not { } coverId)
        {
            return NotFound();
        }

        // Only if no upload replaced it meanwhile; that cover's file would be left in no row
        if (await SetCoverAsync(collection.Id, coverId, null, 0, ct) == 0)
        {
            return this.ChangedAtTheSameTime();
        }
        await photoStorage.DeleteAsync(collection.OwnerId, coverId);

        return NoContent();
    }

    /// <summary>
    /// Serves the cover as WebP. <paramref name="v"/> is the cover id from the collection
    /// response; an outdated one returns 404, so an immutable cache entry is never stale (without
    /// it the current cover is served, but not cached for good).
    /// Same visibility rules as coin photos (owner, public, or share link secret <paramref name="s"/>).
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.Photos)]
    [ProducesResponseType<FileStreamResult>(StatusCodes.Status200OK, "image/webp")]
    [ProducesResponseType(StatusCodes.Status304NotModified)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(int collectionId, [FromQuery] Guid? v, [FromQuery] string? s,
        CancellationToken ct)
    {
        // Null when signed out
        var userId = userManager.GetUserId(User);
        var cover = await db.Collections.AsNoTracking()
            .Where(c => c.Id == collectionId && c.CoverImageId != null)
            .Where(CollectionAccess.CanView<Collection>(c => c, userId, s))
            .Select(c => new { c.OwnerId, CoverImageId = c.CoverImageId!.Value })
            .FirstOrDefaultAsync(ct);
        if (cover is null || (v is not null && v != cover.CoverImageId))
        {
            return NotFound();
        }

        var stream = photoStorage.OpenRead(cover.OwnerId, cover.CoverImageId, CoverImage.FileName);
        if (stream is null)
        {
            logger.LogWarning("Cover file missing: {CoverImageId}", cover.CoverImageId);
            return NotFound();
        }

        Response.Headers.CacheControl = ImageUploadExtensions.ImageCacheControl(v);
        return File(stream, "image/webp", lastModified: null,
            entityTag: new EntityTagHeaderValue($"\"{cover.CoverImageId:N}\""));
    }

    // Conditional on the current cover (null: none); returns 0 if it changed meanwhile
    private Task<int> SetCoverAsync(int collectionId, Guid? expected, Guid? coverId, long sizeBytes,
        CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        return db.Collections
            .Where(c => c.Id == collectionId && c.CoverImageId == expected)
            .ExecuteUpdateAsync(s => s
                .SetProperty(c => c.CoverImageId, coverId)
                .SetProperty(c => c.CoverSizeBytes, sizeBytes)
                .SetProperty(c => c.UpdatedAtUtc, now), ct);
    }

    private Task<Collection?> FindOwnedAsync(int id, CancellationToken ct)
    {
        var userId = CurrentUserId;
        return db.Collections.FirstOrDefaultAsync(c => c.Id == id && c.OwnerId == userId, ct);
    }
}
