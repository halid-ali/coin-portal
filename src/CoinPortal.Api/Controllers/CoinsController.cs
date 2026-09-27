using CoinPortal.Api.Contracts.Coins;
using CoinPortal.Api.Contracts.Common;
using CoinPortal.Api.Data;
using CoinPortal.Api.Photos;
using CoinPortal.Api.Querying;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CoinPortal.Api.Controllers;

/// <summary>
/// CRUD for the signed-in user's own coins. Coins of other users are reported
/// as 404 (not 403) so their existence is not revealed.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
public class CoinsController(
    AppDbContext db, UserManager<ApplicationUser> userManager, IPhotoStorage photoStorage) : ControllerBase
{
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

    [HttpGet("{id:int}")]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CoinResponse>> Get(int id, CancellationToken ct)
    {
        var coin = await FindOwnedAsync(id, ct);
        return coin is null ? NotFound() : CoinResponse.From(coin);
    }

    [HttpPost]
    [ProducesResponseType<CoinResponse>(StatusCodes.Status201Created)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<CoinResponse>> Create(CoinUpsertRequest request, CancellationToken ct)
    {
        var countryCode = await ValidateCountryAsync(request.CountryCode, ct);
        var collectionValid = await ValidateCollectionAsync(request.CollectionId!.Value, ct);
        if (countryCode is null || !collectionValid)
        {
            return ValidationProblem(ModelState);
        }

        var now = DateTime.UtcNow;
        var coin = new Coin { OwnerId = CurrentUserId, CreatedAtUtc = now };
        Apply(coin, request, countryCode, now);

        db.Coins.Add(coin);
        await db.SaveChangesAsync(ct);

        return CreatedAtAction(nameof(Get), new { id = coin.Id }, CoinResponse.From(coin));
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<CoinResponse>> Update(int id, CoinUpsertRequest request, CancellationToken ct)
    {
        var coin = await FindOwnedAsync(id, ct);
        if (coin is null)
        {
            return NotFound();
        }

        var countryCode = await ValidateCountryAsync(request.CountryCode, ct);
        var collectionValid = await ValidateCollectionAsync(request.CollectionId!.Value, ct);
        if (countryCode is null || !collectionValid)
        {
            return ValidationProblem(ModelState);
        }

        Apply(coin, request, countryCode, DateTime.UtcNow);
        await db.SaveChangesAsync(ct);

        return CoinResponse.From(coin);
    }

    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var coin = await FindOwnedAsync(id, ct);
        if (coin is null)
        {
            return NotFound();
        }

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