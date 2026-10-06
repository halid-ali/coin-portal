using CoinPortal.Api.Authorization;
using CoinPortal.Api.Data;
using CoinPortal.Api.Email;
using Microsoft.EntityFrameworkCore;

namespace CoinPortal.Api.Accounts;

/// <summary>
/// Deletes accounts whose e-mail address stayed unverified for their lifetime
/// (<see cref="UnverifiedLifetime"/>), after trying to warn them by e-mail
/// <see cref="UnverifiedLifetime.ReminderLead"/> and <see cref="UnverifiedLifetime.FinalReminderLead"/>
/// before. A reminder that does not reach the mail server is tried again on a later run while its
/// time lasts; the deletion does not wait for it. Admins and accounts an admin locked are never
/// deleted here: a locked spam account keeps its address and user name taken (the admin deletes it
/// by hand). Run by <see cref="UnverifiedCleanupService"/>; the last result is in the panel's overview.
/// </summary>
public class UnverifiedAccountCleanup(IServiceScopeFactory scopes, ILogger<UnverifiedAccountCleanup> logger)
{
    private readonly SemaphoreSlim running = new(1, 1);

    /// <summary>The last run since the app started, or null before the first one.</summary>
    public UnverifiedCleanupResult? LastResult { get; private set; }

    public async Task<UnverifiedCleanupResult> RunAsync(CancellationToken ct)
    {
        await running.WaitAsync(ct);
        try
        {
            LastResult = await CleanAsync(DateTime.UtcNow, ct);
            return LastResult;
        }
        finally
        {
            running.Release();
        }
    }

    private async Task<UnverifiedCleanupResult> CleanAsync(DateTime now, CancellationToken ct)
    {
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var settings = await db.SiteSettings.AsNoTracking().SingleAsync(s => s.Id == SiteSettings.SingletonId, ct);
        if (settings.UnverifiedLifetimeDays <= 0)
        {
            return new UnverifiedCleanupResult(now, Enabled: false, 0, 0, 0);
        }

        // Only accounts within the first reminder's reach: their lifetime started before this
        var reach = now + UnverifiedLifetime.ReminderLead - TimeSpan.FromDays(settings.UnverifiedLifetimeDays);
        if (settings.UnverifiedLifetimeSinceUtc > reach)
        {
            return new UnverifiedCleanupResult(now, Enabled: true, 0, 0, 0);
        }
        var adminRoleId = await db.Roles.Where(r => r.Name == AppRoles.Admin).Select(r => r.Id).FirstOrDefaultAsync(ct);
        var ids = await db.Users
            .Where(u => !u.EmailConfirmed && u.LockedAtUtc == null && u.CreatedAtUtc <= reach
                && !db.UserRoles.Any(r => r.UserId == u.Id && r.RoleId == adminRoleId))
            .Select(u => u.Id)
            .ToListAsync(ct);

        var (sent, failed, deleted) = (0, 0, 0);
        foreach (var id in ids)
        {
            // One account at a time: a failure leaves the others to this run, and itself to the next
            try
            {
                switch (await HandleAsync(scope.ServiceProvider, id, settings, now, ct))
                {
                    case Outcome.ReminderSent: sent++; break;
                    case Outcome.ReminderFailed: failed++; break;
                    case Outcome.Deleted: deleted++; break;
                }
            }
            catch (Exception e) when (e is not OperationCanceledException)
            {
                logger.LogError(e, "Unverified account {UserId} not handled", id);
            }
        }
        if (sent + failed + deleted > 0)
        {
            logger.LogInformation(
                "Unverified accounts: {Sent} reminders sent, {Failed} not sent, {Deleted} accounts deleted",
                sent, failed, deleted);
        }
        return new UnverifiedCleanupResult(now, Enabled: true, sent, failed, deleted);
    }

    private async Task<Outcome> HandleAsync(IServiceProvider services, string id, SiteSettings settings,
        DateTime now, CancellationToken ct)
    {
        var db = services.GetRequiredService<AppDbContext>();
        db.ChangeTracker.Clear();
        // Read again: verified or locked since the list was made
        var user = await db.Users.SingleOrDefaultAsync(u => u.Id == id && !u.EmailConfirmed && u.LockedAtUtc == null, ct);
        if (user is null || UnverifiedLifetime.DueUtc(user, settings, now) is not { } due)
        {
            return Outcome.None;
        }

        if (user.DeletionReminderTriedAtUtc is not null && now >= due)
        {
            await services.GetRequiredService<AccountDeletion>().DeleteAsync(user, beforeSave: null, ct);
            logger.LogWarning("Account {UserId} deleted: e-mail address not verified within {Days} days",
                id, settings.UnverifiedLifetimeDays);
            return Outcome.Deleted;
        }

        var final = due - now <= UnverifiedLifetime.FinalReminderLead;
        if (due - now > UnverifiedLifetime.ReminderLead
            || (final ? user.FinalDeletionReminderSentAtUtc : user.DeletionReminderSentAtUtc) is not null)
        {
            return Outcome.None;
        }

        // The attempt counts whether or not the mail goes out: the date it names is the date
        user.DeletionReminderTriedAtUtc ??= now;
        due = UnverifiedLifetime.DueUtc(user, settings, now)!.Value;
        await db.SaveChangesAsync(ct);
        try
        {
            await services.GetRequiredService<EmailVerification>().SendDeletionReminderAsync(user, due, ct);
        }
        catch (Exception e) when (e is not OperationCanceledException)
        {
            logger.LogWarning(e, "Deletion reminder not sent to {UserId}; tried again on the next run while it is due", id);
            return Outcome.ReminderFailed;
        }
        if (final)
        {
            user.FinalDeletionReminderSentAtUtc = now;
        }
        else
        {
            user.DeletionReminderSentAtUtc = now;
        }
        await db.SaveChangesAsync(ct);
        return Outcome.ReminderSent;
    }

    private enum Outcome
    {
        None,
        ReminderSent,
        ReminderFailed,
        Deleted,
    }
}

/// <param name="Enabled">False while SiteSettings.UnverifiedLifetimeDays is 0 (nothing was checked).</param>
public sealed record UnverifiedCleanupResult(
    DateTime CheckedAtUtc, bool Enabled, int RemindersSent, int RemindersFailed, int AccountsDeleted);
