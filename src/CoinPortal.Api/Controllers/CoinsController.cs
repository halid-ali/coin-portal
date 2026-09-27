using CoinPortal.Api.Contracts.Coins;
using CoinPortal.Api.Contracts.Common;
using CoinPortal.Api.Data;
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
public class CoinsController(AppDbContext db, UserManager<ApplicationUser> userManager) : ControllerBase
{
    private string CurrentUserId => userManager.GetUserId(User)!;

    [HttpGet]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PagedResponse<CoinResponse>>> List(
        [FromQuery] CoinListQuery query, CancellationToken ct)
    {
        var userId = CurrentUserId;
        var coins = db.Coins.AsNoTracking().Where(c => c.OwnerId == userId);

        if (query.Denomination is { } denomination)
        {
            coins = coins.Where(c => c.Denomination == denomination);
        }
        if (!string.IsNullOrWhiteSpace(query.CountryCode))
        {
            var countryCode = NormalizeCountryCode(query.CountryCode);
            coins = coins.Where(c => c.CountryCode == countryCode);
        }
        if (query.Year is { } year)
        {
            coins = coins.Where(c => c.Year == year);
        }
        if (query.IsCommemorative is { } isCommemorative)
        {
            coins = coins.Where(c => c.IsCommemorative == isCommemorative);
        }
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            // SQL Server default collation is case-insensitive
            var term = query.Search.Trim();
            coins = coins.Where(c => c.Title.Contains(term)
                || (c.Description != null && c.Description.Contains(term)));
        }

        // Id as last key keeps paging stable when other keys are equal
        var ordered = query.Sort switch
        {
            CoinSort.Denomination => coins.OrderByDescending(c => c.Denomination)
                .ThenBy(c => c.CountryCode).ThenBy(c => c.Year).ThenBy(c => c.Id),
            CoinSort.Country => coins.OrderBy(c => c.CountryCode)
                .ThenByDescending(c => c.Denomination).ThenBy(c => c.Year).ThenBy(c => c.Id),
            CoinSort.Year => coins.OrderByDescending(c => c.Year)
                .ThenBy(c => c.CountryCode).ThenByDescending(c => c.Denomination).ThenBy(c => c.Id),
            _ => coins.OrderByDescending(c => c.CreatedAtUtc).ThenByDescending(c => c.Id)
        };

        var totalCount = await coins.CountAsync(ct);
        var items = await ordered
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync(ct);

        return new PagedResponse<CoinResponse>(
            items.Select(CoinResponse.From).ToList(), query.Page, query.PageSize, totalCount);
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
        if (countryCode is null)
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
        if (countryCode is null)
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

        db.Coins.Remove(coin);
        await db.SaveChangesAsync(ct);

        return NoContent();
    }

    // Tracked query; the ownership filter is part of the lookup itself
    private Task<Coin?> FindOwnedAsync(int id, CancellationToken ct)
    {
        var userId = CurrentUserId;
        return db.Coins.FirstOrDefaultAsync(c => c.Id == id && c.OwnerId == userId, ct);
    }

    // Returns the normalized code, or null after adding a model error
    private async Task<string?> ValidateCountryAsync(string rawCode, CancellationToken ct)
    {
        var code = NormalizeCountryCode(rawCode);
        if (await db.Countries.AnyAsync(c => c.Code == code, ct))
        {
            return code;
        }

        ModelState.AddModelError(nameof(CoinUpsertRequest.CountryCode), "Unknown country code.");
        return null;
    }

    private static void Apply(Coin coin, CoinUpsertRequest request, string countryCode, DateTime now)
    {
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

    private static string NormalizeCountryCode(string code) => code.Trim().ToUpperInvariant();

    private static string? NullIfBlank(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}