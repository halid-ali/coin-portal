using System.ComponentModel.DataAnnotations;
using System.Globalization;
using CoinPortal.Api.Contracts.Admin;
using CoinPortal.Api.Data;
using CoinPortal.Api.Photos;
using CoinPortal.Api.Publishing;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CoinPortal.Api.Controllers.Admin;

/// <summary>
/// Site-wide settings (SiteSettings, the panel's "General settings"). A change is written to the
/// audit log with its values before and after.
/// </summary>
[Route("api/admin/settings")]
public class AdminSettingsController(AppDbContext db, StorageWarnings storageWarnings) : AdminControllerBase
{
    [HttpGet]
    public async Task<AdminSettingsResponse> Get(CancellationToken ct)
    {
        var settings = await db.SiteSettings.AsNoTracking().SingleAsync(s => s.Id == SiteSettings.SingletonId, ct);
        return ToResponse(settings);
    }

    /// <summary>Each setting that changes gets its own audit entry, with the same note.</summary>
    [HttpPut]
    [ProducesResponseType<AdminSettingsResponse>(StatusCodes.Status200OK)]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<AdminSettingsResponse> Update(AdminSettingsRequest request, CancellationToken ct)
    {
        var settings = await db.SiteSettings.SingleAsync(s => s.Id == SiteSettings.SingletonId, ct);
        if (settings.MinPublicCoins != request.MinPublicCoins)
        {
            AuditChange(SiteSettings.MinPublicCoinsName, settings.MinPublicCoins, request.MinPublicCoins, request.Note);
            settings.MinPublicCoins = request.MinPublicCoins;
        }
        if (settings.UnverifiedMaxCoins != request.UnverifiedMaxCoins)
        {
            AuditChange(SiteSettings.UnverifiedMaxCoinsName, settings.UnverifiedMaxCoins, request.UnverifiedMaxCoins,
                request.Note);
            settings.UnverifiedMaxCoins = request.UnverifiedMaxCoins;
        }
        if (settings.UnverifiedLifetimeDays != request.UnverifiedLifetimeDays)
        {
            AuditChange(SiteSettings.UnverifiedLifetimeDaysName, settings.UnverifiedLifetimeDays,
                request.UnverifiedLifetimeDays, request.Note);
            // Turned on again: the lifetime counts from now, not from sign-ups while it was off
            if (settings.UnverifiedLifetimeDays == 0)
            {
                settings.UnverifiedLifetimeSinceUtc = DateTime.UtcNow;
            }
            settings.UnverifiedLifetimeDays = request.UnverifiedLifetimeDays;
        }
        var quotaChanged = settings.UserQuotaMegabytes != request.UserQuotaMegabytes;
        if (quotaChanged)
        {
            AuditChange(SiteSettings.UserQuotaMegabytesName, settings.UserQuotaMegabytes, request.UserQuotaMegabytes,
                request.Note);
            settings.UserQuotaMegabytes = request.UserQuotaMegabytes;
        }
        await db.SaveChangesAsync(ct);
        // A lower quota can pass users' thresholds, a higher one reset their warnings (user decision 2026-10-10)
        if (quotaChanged)
        {
            storageWarnings.CheckAfterQuotaChange();
        }
        return ToResponse(settings);
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

    /// <summary>
    /// How many users already store more than this photo storage. Nothing of theirs is removed;
    /// they cannot upload until they free space.
    /// </summary>
    [HttpGet("quota-impact")]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<AdminQuotaImpactResponse> QuotaImpact(
        [FromQuery, Range(SiteSettings.UserQuotaMegabytesMin, SiteSettings.UserQuotaMegabytesMax)] int userQuotaMegabytes,
        CancellationToken ct)
    {
        var limit = userQuotaMegabytes * PhotoQuota.BytesPerMegabyte;
        // Same sum as PhotoQuota: photos and covers
        var above = await db.Users.CountAsync(u =>
            (db.CoinPhotos.Where(p => p.Coin.OwnerId == u.Id).Sum(p => (long?)p.SizeBytes) ?? 0)
            + (db.Collections.Where(c => c.OwnerId == u.Id).Sum(c => (long?)c.CoverSizeBytes) ?? 0) > limit, ct);
        return new AdminQuotaImpactResponse(userQuotaMegabytes, above);
    }

    private static AdminSettingsResponse ToResponse(SiteSettings settings) =>
        new(settings.MinPublicCoins, settings.UnverifiedMaxCoins, settings.UnverifiedLifetimeDays,
            settings.UserQuotaMegabytes);

    private void AuditChange(string name, int oldValue, int newValue, string? note) =>
        Audit(db, AuditAction.SettingChanged, note: note, setting: (name,
            oldValue.ToString(CultureInfo.InvariantCulture), newValue.ToString(CultureInfo.InvariantCulture)));
}
