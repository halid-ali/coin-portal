using System.Text.Json;
using CoinPortal.Api.Accounts;
using CoinPortal.Api.Contracts.Coins;
using CoinPortal.Api.Contracts.Common;
using CoinPortal.Api.Data;
using CoinPortal.Api.Photos;
using CoinPortal.Api.Publishing;
using CoinPortal.Api.Querying;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace CoinPortal.Api.Controllers;

/// <summary>
/// CRUD for the signed-in user's own coins. Coins of other users are reported
/// as 404 (not 403) so their existence is not revealed. Changes that would break the rule of a
/// Public collection (PublicationRules) are refused with 409 would_unpublish unless sent with
/// ?unpublish=true, which makes that collection Unlisted.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
public class CoinsController(
    AppDbContext db,
    UserManager<ApplicationUser> userManager,
    IPhotoStorage photoStorage,
    IImageProcessor imageProcessor,
    PhotoQuota photoQuota,
    PublicationGuard publication,
    IOptions<PhotoOptions> photoOptions,
    IOptions<JsonOptions> jsonOptions,
    IOptions<UserLimitOptions> limits) : ControllerBase
{
    /// <summary>Two photos in one request.</summary>
    private const long MaxCreateRequestBytes = 2 * ImageUploadExtensions.MaxRequestBytes;

    private string CurrentUserId => userManager.GetUserId(User)!;

    [HttpGet]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PagedResponse<CoinResponse>>> List(
        [FromQuery] CoinListQuery query, CancellationToken ct)
    {
        var userId = CurrentUserId;
        var coins = db.Coins.AsNoTracking().Include(c => c.Photos).Where(c => c.OwnerId == userId);

        if (query.CollectionId is { } collectionId)
        {
            // Someone else's collection looks the same as a missing one
            if (!await db.Collections.AnyAsync(c => c.Id == collectionId && c.OwnerId == userId, ct))
            {
                return NotFound();
            }
            coins = coins.Where(c => c.CollectionId == collectionId);
        }

        return await coins.ToPagedAsync(query, CoinResponse.From, ct);
    }

    /// <summary>Counts over all of the user's collections, for the home page.</summary>
    [HttpGet("summary")]
    public async Task<CoinSummaryResponse> Summary(CancellationToken ct)
    {
        var userId = CurrentUserId;
        var coins = db.Coins.Where(c => c.OwnerId == userId);
        return new CoinSummaryResponse(
            await coins.CountAsync(ct),
            await coins.Select(c => c.CountryCode).Distinct().CountAsync(ct),
            await coins.CountAsync(c => c.IsCommemorative, ct));
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CoinResponse>> Get(int id, CancellationToken ct)
    {
        var coin = await FindOwnedAsync(id, ct);
        return coin is null ? NotFound() : CoinResponse.From(coin);
    }

    /// <summary>Creates a coin without photos.</summary>
    [HttpPost]
    [ProducesResponseType<CoinResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public Task<ActionResult<CoinResponse>> Create(CoinUpsertRequest request, [FromQuery] bool unpublish,
        CancellationToken ct) =>
        CreateAsync(request, [], unpublish, ct);

    /// <summary>
    /// Creates a coin together with its photos (multipart: field "coin" holds the
    /// <see cref="CoinUpsertRequest"/> as JSON, files "national" and "common" are optional). The
    /// coin is saved with all its photos or not at all, so a coin can join a Public collection
    /// without breaking its rule. Photo errors carry the "side" besides their code.
    /// </summary>
    [HttpPost("with-photos")]
    [Consumes("multipart/form-data")]
    [RequestSizeLimit(MaxCreateRequestBytes)]
    [RequestFormLimits(MultipartBodyLengthLimit = MaxCreateRequestBytes)]
    [ProducesResponseType<CoinResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<CoinResponse>> CreateWithPhotos([FromForm] string? coin, IFormFile? national,
        IFormFile? common, [FromQuery] bool unpublish, CancellationToken ct)
    {
        CoinUpsertRequest? request = null;
        try
        {
            request = string.IsNullOrWhiteSpace(coin)
                ? null
                : JsonSerializer.Deserialize<CoinUpsertRequest>(coin, jsonOptions.Value.JsonSerializerOptions);
        }
        catch (JsonException)
        {
        }
        if (request is null)
        {
            ModelState.AddModelError(nameof(coin), "The coin is missing or not valid JSON.");
            return ValidationProblem(ModelState);
        }
        if (!TryValidateModel(request))
        {
            return ValidationProblem(ModelState);
        }

        List<(CoinSide, IFormFile)> photos = [];
        if (national is not null)
        {
            photos.Add((CoinSide.National, national));
        }
        if (common is not null)
        {
            photos.Add((CoinSide.Common, common));
        }
        return await CreateAsync(request, photos, unpublish, ct);
    }

    private async Task<ActionResult<CoinResponse>> CreateAsync(CoinUpsertRequest request,
        IReadOnlyList<(CoinSide Side, IFormFile File)> uploads, bool unpublish, CancellationToken ct)
    {
        var userId = CurrentUserId;
        if (await db.Coins.CountAsync(c => c.OwnerId == userId, ct) >= limits.Value.MaxCoins)
        {
            return this.CodedProblem("coin_limit", "You have reached the maximum number of coins.");
        }

        var countryCode = await ValidateCountryAsync(request.CountryCode, ct);
        var collectionValid = await ValidateCollectionAsync(request.CollectionId!.Value, ct);
        if (countryCode is null || !collectionValid)
        {
            return ValidationProblem(ModelState);
        }

        // Before the images are processed: whether they are given decides, not what they show
        var broken = await publication.BrokenByAsync(
            [new CollectionChange(request.CollectionId!.Value,
                AddsUnphotographed: !PublicationRules.HasPhotos(uploads.Select(u => u.Side)))], ct);
        if (broken.Count > 0 && !unpublish)
        {
            return this.WouldUnpublish(broken);
        }

        var now = DateTime.UtcNow;
        List<(CoinPhoto Photo, IReadOnlyDictionary<string, byte[]> Files)> photos = [];
        foreach (var (side, file) in uploads)
        {
            var (files, problem) = await this.ProcessCoinPhotoAsync(file, imageProcessor, photoOptions.Value, ct);
            if (problem is not null)
            {
                ((ProblemDetails)problem.Value!).Extensions["side"] = side.ToString();
                return problem;
            }
            var photo = new CoinPhoto
            {
                Id = Guid.NewGuid(),
                Side = side,
                SizeBytes = files!.Values.Sum(f => (long)f.Length),
                CreatedAtUtc = now,
            };
            photos.Add((photo, files));
        }
        if (photos.Count > 0
            && !await photoQuota.FitsAsync(userId, photos.Sum(p => p.Photo.SizeBytes), null, ct))
        {
            return this.QuotaExceeded(photoQuota.LimitBytes);
        }

        var coin = new Coin { OwnerId = userId, CreatedAtUtc = now };
        Apply(coin, request, countryCode, now);
        coin.Photos.AddRange(photos.Select(p => p.Photo));
        db.Coins.Add(coin);
        publication.Unpublish(broken, now);

        // Files first, then the rows: a failed save removes the new files again
        try
        {
            foreach (var (photo, files) in photos)
            {
                await photoStorage.SaveAsync(userId, photo.Id, files, ct);
            }
            // Not the request token: once files exist, finish or clean up deliberately
            await db.SaveChangesAsync(CancellationToken.None);
        }
        catch
        {
            foreach (var (photo, _) in photos)
            {
                await photoStorage.DeleteAsync(userId, photo.Id);
            }
            throw;
        }

        return CreatedAtAction(nameof(Get), new { id = coin.Id }, CoinResponse.From(coin));
    }

    /// <summary>
    /// Updates a coin; another collection moves it. Moving can break the rule of the Public
    /// collection it leaves (minimum) or joins (photos).
    /// </summary>
    [HttpPut("{id:int}")]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<ActionResult<CoinResponse>> Update(int id, CoinUpsertRequest request, [FromQuery] bool unpublish,
        CancellationToken ct)
    {
        var coin = await FindOwnedAsync(id, ct);
        if (coin is null)
        {
            return NotFound();
        }

        // A collection hidden by an admin keeps its coins until the lock is lifted: moving them out
        // would publish the hidden content again
        if (request.CollectionId != coin.CollectionId
            && await db.Collections.AnyAsync(c => c.Id == coin.CollectionId && c.ModerationLockedAtUtc != null, ct))
        {
            return this.CodedProblem("moderation_locked", "An administrator has hidden this collection.",
                StatusCodes.Status403Forbidden);
        }

        var countryCode = await ValidateCountryAsync(request.CountryCode, ct);
        var collectionValid = await ValidateCollectionAsync(request.CollectionId!.Value, ct);
        if (countryCode is null || !collectionValid)
        {
            return ValidationProblem(ModelState);
        }

        List<Collection> broken = [];
        if (request.CollectionId != coin.CollectionId)
        {
            var photographed = PublicationRules.HasPhotos(coin);
            broken = await publication.BrokenByAsync(
                [
                    new CollectionChange(coin.CollectionId, RemovesPhotographed: photographed ? 1 : 0),
                    new CollectionChange(request.CollectionId!.Value, AddsUnphotographed: !photographed),
                ], ct);
            if (broken.Count > 0 && !unpublish)
            {
                return this.WouldUnpublish(broken);
            }
        }

        var now = DateTime.UtcNow;
        publication.Unpublish(broken, now);
        Apply(coin, request, countryCode, now);
        await db.SaveChangesAsync(ct);

        return CoinResponse.From(coin);
    }

    /// <summary>
    /// Deletes a coin and its photos. Taking a photographed coin away can put a Public collection
    /// below the minimum.
    /// </summary>
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(int id, [FromQuery] bool unpublish, CancellationToken ct)
    {
        var coin = await FindOwnedAsync(id, ct);
        if (coin is null)
        {
            return NotFound();
        }

        var broken = await publication.BrokenByAsync(
            [new CollectionChange(coin.CollectionId, RemovesPhotographed: PublicationRules.HasPhotos(coin) ? 1 : 0)], ct);
        if (broken.Count > 0 && !unpublish)
        {
            return this.WouldUnpublish(broken);
        }
        publication.Unpublish(broken, DateTime.UtcNow);

        var photoIds = coin.Photos.Select(p => p.Id).ToList();
        db.Coins.Remove(coin);
        await db.SaveChangesAsync(ct);

        // Photo rows went with the coin (cascade); files only after the delete succeeded
        foreach (var photoId in photoIds)
        {
            await photoStorage.DeleteAsync(coin.OwnerId, photoId);
        }

        return NoContent();
    }

    // Tracked query; the ownership filter is part of the lookup itself
    private Task<Coin?> FindOwnedAsync(int id, CancellationToken ct)
    {
        var userId = CurrentUserId;
        return db.Coins.Include(c => c.Photos)
            .FirstOrDefaultAsync(c => c.Id == id && c.OwnerId == userId, ct);
    }

    // Returns the normalized code, or null after adding a model error
    private async Task<string?> ValidateCountryAsync(string rawCode, CancellationToken ct)
    {
        var code = CoinListing.NormalizeCountryCode(rawCode);
        if (await db.Countries.AnyAsync(c => c.Code == code, ct))
        {
            return code;
        }

        ModelState.AddModelError(nameof(CoinUpsertRequest.CountryCode), "Unknown country code.");
        return null;
    }

    // Must be the current user's: a coin never belongs to someone else's collection
    private async Task<bool> ValidateCollectionAsync(int collectionId, CancellationToken ct)
    {
        var userId = CurrentUserId;
        if (await db.Collections.AnyAsync(c => c.Id == collectionId && c.OwnerId == userId, ct))
        {
            return true;
        }

        ModelState.AddModelError(nameof(CoinUpsertRequest.CollectionId), "Unknown collection.");
        return false;
    }

    private static void Apply(Coin coin, CoinUpsertRequest request, string countryCode, DateTime now)
    {
        coin.CollectionId = request.CollectionId!.Value;
        coin.Title = request.Title.Trim();
        coin.Description = NullIfBlank(request.Description);
        coin.Denomination = request.Denomination!.Value;
        coin.CountryCode = countryCode;
        coin.Year = request.Year!.Value;
        coin.MintMark = NullIfBlank(request.MintMark);
        coin.IsCommemorative = request.IsCommemorative;
        coin.Quantity = request.Quantity;
        coin.UpdatedAtUtc = now;
    }

    private static string? NullIfBlank(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
