using CoinPortal.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace CoinPortal.Api.Accounts;

/// <summary>
/// What an account may do before its e-mail address is confirmed (user decisions 2026-10-06): keep
/// the collection made at sign-up but open no other, hold at most
/// <see cref="SiteSettings.UnverifiedMaxCoins"/> coins (an admin setting), and share nothing new.
/// What the account had before stays. Read from the database for each request: the cookie does not
/// carry the flag, and a confirmation must count at once.
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

    /// <summary>The limit for this user, null once the address is confirmed (no limit of its own).</summary>
    public async Task<int?> MaxCoinsForAsync(ApplicationUser user, CancellationToken ct) =>
        user.EmailConfirmed ? null : await MaxCoinsAsync(ct);
}
