using CoinPortal.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace CoinPortal.Api.Accounts;

/// <summary>
/// What an account may do before its e-mail address is confirmed (user decisions 2026-10-06): keep
/// the collection made at sign-up but open no other, hold at most
/// <see cref="SiteSettings.UnverifiedMaxCoins"/> coins (an admin setting), and share nothing new.
/// What the account had before stays. After <see cref="SiteSettings.UnverifiedLifetimeDays"/> it is
/// deleted (<see cref="UnverifiedLifetime"/>). Read from the database for each request: the cookie
/// does not carry the flag, and a confirmation must count at once.
/// </summary>
public sealed class UnverifiedAccounts(AppDbContext db)
{
    public Task<bool> IsConfirmedAsync(string userId, CancellationToken ct) =>
        db.Users.Where(u => u.Id == userId).Select(u => u.EmailConfirmed).SingleAsync(ct);

    public Task<int> MaxCoinsAsync(CancellationToken ct) =>
        db.SiteSettings.AsNoTracking()
            .Where(s => s.Id == SiteSettings.SingletonId)
            .Select(s => s.UnverifiedMaxCoins)
            .SingleAsync(ct);

    /// <summary>The limits of this user; null once the address is confirmed (none of their own).</summary>
    public async Task<UnverifiedLimits?> LimitsForAsync(ApplicationUser user, bool isAdmin, CancellationToken ct)
    {
        if (user.EmailConfirmed)
        {
            return null;
        }
        var settings = await db.SiteSettings.AsNoTracking().SingleAsync(s => s.Id == SiteSettings.SingletonId, ct);
        return new UnverifiedLimits(settings.UnverifiedMaxCoins,
            isAdmin ? null : UnverifiedLifetime.DueUtc(user, settings, DateTime.UtcNow));
    }
}

/// <param name="DeletionDueUtc">When the account is deleted unless verified; null when it never is
/// (lifetime 0, an admin, locked by an admin).</param>
public sealed record UnverifiedLimits(int MaxCoins, DateTime? DeletionDueUtc);

/// <summary>
/// When an unverified account is deleted (user decisions 2026-10-07): <see cref="SiteSettings.UnverifiedLifetimeDays"/>
/// after its sign-up, counted from <see cref="SiteSettings.UnverifiedLifetimeSinceUtc"/> at the
/// earliest, and never sooner than <see cref="MinNotice"/> after its first reminder was tried. A
/// reminder is tried, not promised: the date does not wait for one to arrive.
/// </summary>
public static class UnverifiedLifetime
{
    /// <summary>The first reminder, this long before the deletion.</summary>
    public static readonly TimeSpan ReminderLead = TimeSpan.FromDays(7);

    /// <summary>The last reminder, this long before the deletion.</summary>
    public static readonly TimeSpan FinalReminderLead = TimeSpan.FromDays(1);

    /// <summary>At least this long between the first reminder tried and the deletion (a shortened lifetime warns first).</summary>
    public static readonly TimeSpan MinNotice = TimeSpan.FromDays(1);

    /// <summary>
    /// Null when the account is never deleted for it: confirmed, locked by an admin or the lifetime
    /// is 0 (admins: the caller's check). Before the first reminder, "now" stands for it.
    /// </summary>
    public static DateTime? DueUtc(ApplicationUser user, SiteSettings settings, DateTime nowUtc) =>
        DueUtc(user.EmailConfirmed, user.LockedAtUtc, user.CreatedAtUtc, user.DeletionReminderTriedAtUtc,
            settings, nowUtc);

    /// <summary>The same from the user's fields (the admin panel reads them in its own projection).</summary>
    public static DateTime? DueUtc(bool emailConfirmed, DateTime? lockedAtUtc, DateTime createdAtUtc,
        DateTime? reminderTriedAtUtc, SiteSettings settings, DateTime nowUtc)
    {
        if (emailConfirmed || lockedAtUtc is not null || settings.UnverifiedLifetimeDays <= 0)
        {
            return null;
        }
        var start = createdAtUtc > settings.UnverifiedLifetimeSinceUtc ? createdAtUtc : settings.UnverifiedLifetimeSinceUtc;
        var deadline = start.AddDays(settings.UnverifiedLifetimeDays);
        var notice = (reminderTriedAtUtc ?? nowUtc) + MinNotice;
        return deadline > notice ? deadline : notice;
    }
}
