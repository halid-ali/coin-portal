using CoinPortal.Api.Contracts.Coins;
using CoinPortal.Api.Data;
using CoinPortal.Api.Photos;
using CoinPortal.Api.Publishing;
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
/// Photos of the signed-in user's own coins: one per side (national, common), each stored in
/// three sizes. Nested under the coin, so it does not follow the api/[controller] route.
/// Errors carry a "code" extension (invalid_image, file_too_large, ...) for client messages.
/// </summary>
[ApiController]
[Route("api/coins/{coinId:int}/photos")]
[Authorize]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
public class CoinPhotosController(
    AppDbContext db,
    UserManager<ApplicationUser> userManager,
    IImageProcessor imageProcessor,
    IPhotoStorage photoStorage,
    PhotoQuota photoQuota,
    PublicationGuard publication,
    IOptions<PhotoOptions> photoOptions,
    ILogger<CoinPhotosController> logger) : ControllerBase
{
    private string CurrentUserId => userManager.GetUserId(User)!;

    /// <summary>Uploads or replaces the photo of one side (multipart, field "file").</summary>
    [HttpPut("{side:alpha}")]
    [RequestSizeLimit(ImageUploadExtensions.MaxRequestBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = ImageUploadExtensions.MaxRequestBytes)]
    [ProducesResponseType<CoinResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<CoinResponse>> Upload(
        int coinId, CoinSide side, IFormFile? file, CancellationToken ct)
    {
        var coin = await FindOwnedCoinAsync(coinId, ct);
        if (coin is null)
        {
            return NotFound();
        }

        var (files, problem) = await this.ProcessCoinPhotoAsync(file, imageProcessor, photoOptions.Value, ct);
        if (problem is not null)
        {
            return problem;
        }

        var existing = coin.Photos.FirstOrDefault(p => p.Side == side);
        var sizeBytes = files!.Values.Sum(f => (long)f.Length);

        // The photo being replaced does not count against the quota
        if (!await photoQuota.FitsAsync(coin.OwnerId, sizeBytes, existing?.Id, ct))
        {
            return this.QuotaExceeded(photoQuota.LimitBytes);
        }

        // Files first, then the row: a failed save removes the new files again
        var photo = new CoinPhoto
        {
            Id = Guid.NewGuid(),
            CoinId = coin.Id,
            Side = side,
            SizeBytes = sizeBytes,
            CreatedAtUtc = DateTime.UtcNow,
        };
        await photoStorage.SaveAsync(coin.OwnerId, photo.Id, files, ct);

        try
        {
            if (existing is not null)
            {
                coin.Photos.Remove(existing);
                db.CoinPhotos.Remove(existing);
            }
            coin.Photos.Add(photo);
            coin.UpdatedAtUtc = photo.CreatedAtUtc;
            // Not the request token: once the files exist, finish or clean up deliberately
            await db.SaveChangesAsync(CancellationToken.None);
        }
        catch (DbUpdateException e) when (ImageUploadExtensions.IsConcurrentChange(e))
        {
            await photoStorage.DeleteAsync(coin.OwnerId, photo.Id);
            logger.LogWarning(e, "Photo {Side} of coin {CoinId} was changed at the same time", side, coin.Id);
            return this.ChangedAtTheSameTime();
        }
        catch
        {
            await photoStorage.DeleteAsync(coin.OwnerId, photo.Id);
            throw;
        }

        if (existing is not null)
        {
            await photoStorage.DeleteAsync(coin.OwnerId, existing.Id);
        }

        return CoinResponse.From(coin);
    }

    /// <summary>
    /// Removes the photo of one side. Without the photos a public collection needs, its coin breaks
    /// the rule (409 would_unpublish); with <paramref name="unpublish"/> the collection becomes Unlisted.
    /// </summary>
    [HttpDelete("{side:alpha}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(int coinId, CoinSide side, [FromQuery] bool unpublish, CancellationToken ct)
    {
        var coin = await FindOwnedCoinAsync(coinId, ct);
        var photo = coin?.Photos.FirstOrDefault(p => p.Side == side);
        if (coin is null || photo is null)
        {
            return NotFound();
        }

        var losesPhotos = PublicationRules.HasPhotos(coin)
            && !PublicationRules.HasPhotos(coin.Photos.Where(p => p != photo).Select(p => p.Side));
        var broken = await publication.BrokenByAsync(
            [new CollectionChange(coin.CollectionId, AddsUnphotographed: losesPhotos)], ct);
        if (broken.Count > 0 && !unpublish)
        {
            return this.WouldUnpublish(broken);
        }

        var now = DateTime.UtcNow;
        PublicationGuard.Unpublish(broken, now);
        db.CoinPhotos.Remove(photo);
        coin.UpdatedAtUtc = now;
        await db.SaveChangesAsync(ct);
        await photoStorage.DeleteAsync(coin.OwnerId, photo.Id);

        return NoContent();
    }

    /// <summary>
    /// Serves one size as WebP. <paramref name="v"/> is the photo id from the coin response;
    /// an outdated one returns 404, so an immutable cache entry never holds another photo.
    /// Without it the current photo is served, but not cached for good.
    /// Visible to the owner, to everyone for public collections, and with the share link
    /// secret (<paramref name="s"/>) for unlisted ones; anything else is a 404.
    /// </summary>
    [HttpGet("{side:alpha}/{size:alpha}")]
    [AllowAnonymous]
    [EnableRateLimiting(RateLimitPolicies.Photos)]
    [ProducesResponseType<FileStreamResult>(StatusCodes.Status200OK, "image/webp")]
    [ProducesResponseType(StatusCodes.Status304NotModified)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Get(
        int coinId, CoinSide side, PhotoSize size, [FromQuery] Guid? v, [FromQuery] string? s,
        CancellationToken ct)
    {
        // Null when signed out
        var userId = userManager.GetUserId(User);
        var photo = await db.CoinPhotos.AsNoTracking()
            .Where(p => p.CoinId == coinId && p.Side == side)
            .Where(CollectionAccess.CanView<CoinPhoto>(p => p.Coin.Collection, userId, s))
            .Select(p => new { p.Id, p.Coin.OwnerId })
            .FirstOrDefaultAsync(ct);
        if (photo is null || (v is not null && v != photo.Id))
        {
            return NotFound();
        }

        var stream = photoStorage.OpenRead(photo.OwnerId, photo.Id, size.FileName());
        if (stream is null)
        {
            logger.LogWarning("Photo file missing: {PhotoId} {Size}", photo.Id, size);
            return NotFound();
        }

        Response.Headers.CacheControl = ImageUploadExtensions.ImageCacheControl(v);
        return File(stream, "image/webp", lastModified: null,
            entityTag: new EntityTagHeaderValue($"\"{photo.Id:N}-{size}\""));
    }

    private Task<Coin?> FindOwnedCoinAsync(int coinId, CancellationToken ct)
    {
        var userId = CurrentUserId;
        return db.Coins.Include(c => c.Photos)
            .FirstOrDefaultAsync(c => c.Id == coinId && c.OwnerId == userId, ct);
    }
}
