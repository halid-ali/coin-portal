using System.ComponentModel.DataAnnotations;
using System.Globalization;
using CoinPortal.Api.Contracts.Admin;
using CoinPortal.Api.Data;
using CoinPortal.Api.Publishing;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CoinPortal.Api.Controllers.Admin;

/// <summary>
/// Site-wide settings (SiteSettings, the panel's "General settings"). A change is written to the
/// audit log with its values before and after.
/// </summary>
[Route("api/admin/settings")]
public class AdminSettingsController(AppDbContext db) : AdminControllerBase
{
    [HttpGet]
    public async Task<AdminSettingsResponse> Get(CancellationToken ct)
    {
        var settings = await db.SiteSettings.AsNoTracking().SingleAsync(s => s.Id == SiteSettings.SingletonId, ct);
        return new AdminSettingsResponse(settings.MinPublicCoins);
    }

    [HttpPut]
    [ProducesResponseType<AdminSettingsResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<AdminSettingsResponse> Update(AdminSettingsRequest request, CancellationToken ct)
    {
        var settings = await db.SiteSettings.SingleAsync(s => s.Id == SiteSettings.SingletonId, ct);
        if (settings.MinPublicCoins != request.MinPublicCoins)
        {
            Audit(db, AuditAction.SettingChanged, note: request.Note, setting: (
                SiteSettings.MinPublicCoinsName,
                settings.MinPublicCoins.ToString(CultureInfo.InvariantCulture),
                request.MinPublicCoins.ToString(CultureInfo.InvariantCulture)));
            settings.MinPublicCoins = request.MinPublicCoins;
            await db.SaveChangesAsync(ct);
        }
        return new AdminSettingsResponse(settings.MinPublicCoins);
    }

    /// <summary>How many Public collections have fewer photographed coins than this minimum.</summary>
    [HttpGet("impact")]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<AdminSettingsImpactResponse> Impact(
        [FromQuery, Range(SiteSettings.MinPublicCoinsMin, SiteSettings.MinPublicCoinsMax)] int minPublicCoins,
        CancellationToken ct)
    {
        var below = await db.Collections
            .Where(c => c.Visibility == CollectionVisibility.Public)
            .CountAsync(c => c.Coins.AsQueryable().Count(PublicationRules.IsPhotographed) < minPublicCoins, ct);
        return new AdminSettingsImpactResponse(minPublicCoins, below);
    }
}
