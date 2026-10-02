using CoinPortal.Api.Contracts.Countries;
using CoinPortal.Api.Data;
using CoinPortal.Api.Hosting;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace CoinPortal.Api.Controllers;

/// <summary>
/// Reference data, readable without login (also needed for public profile pages later).
/// </summary>
[ApiController]
[Route("api/[controller]")]
[AllowAnonymous]
[EnableRateLimiting(RateLimitPolicies.Public)]
public class CountriesController(AppDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IReadOnlyList<CountryResponse>> List(CancellationToken ct) =>
        await db.Countries
            .AsNoTracking()
            .OrderBy(c => c.Code)
            .Select(c => new CountryResponse(c.Code, c.Name))
            .ToListAsync(ct);
}
