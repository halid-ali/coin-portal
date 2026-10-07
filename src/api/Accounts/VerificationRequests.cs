using CoinPortal.Api.Authorization;
using CoinPortal.Api.Data;
using CoinPortal.Api.Email;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace CoinPortal.Api.Accounts;

/// <summary>
/// The one-time request to verify the e-mail address, for the accounts from before verification
/// existed (user decision 2026-10-07: they hear about it by e-mail, not only from the notice once
/// they sign in). An admin starts it in the panel once the mail server works; it sends in the
/// background, one e-mail every Email:BulkDelaySeconds (the host's sending limit is unknown).
/// Each account gets it once (<see cref="ApplicationUser.VerificationRequestSentAtUtc"/>): starting
/// again reaches only the ones it missed. Accounts an admin locked are left out. The running and
/// the last run are kept in memory, for the panel; a restart ends a run, the next start goes on.
/// </summary>
public sealed class VerificationRequests(
    IServiceScopeFactory scopes, IOptions<EmailOptions> options, IHostApplicationLifetime lifetime,
    ILogger<VerificationRequests> logger)
{
    private readonly Lock gate = new();
    private VerificationRequestRun? last;

    /// <summary>The running run, or the last one since the app started; null before the first.</summary>
    public VerificationRequestRun? LastRun
    {
        get
        {
            lock (gate)
            {
                return last;
            }
        }
    }

    /// <summary>The accounts the next run writes to.</summary>
    public static IQueryable<ApplicationUser> Pending(AppDbContext db) =>
        db.Users.Where(u => !u.EmailConfirmed && u.LockedAtUtc == null && u.VerificationRequestSentAtUtc == null);

    /// <summary>Starts a run in the background; false (and the running one) while one is going.</summary>
    public bool TryStart(out VerificationRequestRun run)
    {
        lock (gate)
        {
            if (last is { FinishedAtUtc: null })
            {
                run = last;
                return false;
            }
            run = last = new VerificationRequestRun(DateTime.UtcNow);
        }
        var started = run;
        _ = Task.Run(() => SendAllAsync(started, lifetime.ApplicationStopping));
        return true;
    }

    private async Task SendAllAsync(VerificationRequestRun run, CancellationToken ct)
    {
        try
        {
            List<string> ids;
            await using (var scope = scopes.CreateAsyncScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                ids = await Pending(db).OrderBy(u => u.CreatedAtUtc).Select(u => u.Id).ToListAsync(ct);
            }
            run.Total = ids.Count;
            var delay = TimeSpan.FromSeconds(options.Value.BulkDelaySeconds);
            foreach (var id in ids)
            {
                if (run.Sent + run.Failed > 0 && delay > TimeSpan.Zero)
                {
                    await Task.Delay(delay, ct);
                }
                if (await SendAsync(id, ct))
                {
                    run.Sent++;
                }
                else
                {
                    run.Failed++;
                }
            }
            logger.LogInformation("Verification requests: {Sent} sent, {Failed} not sent", run.Sent, run.Failed);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            // Shutting down; the next start reaches the rest
        }
        catch (Exception e)
        {
            logger.LogError(e, "Verification requests stopped");
        }
        finally
        {
            run.FinishedAtUtc = DateTime.UtcNow;
        }
    }

    /// <summary>One account; false when the mail did not go out (it stays pending for the next start).</summary>
    private async Task<bool> SendAsync(string id, CancellationToken ct)
    {
        await using var scope = scopes.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        try
        {
            // Read again: verified or locked since the run started
            var user = await Pending(db).SingleOrDefaultAsync(u => u.Id == id, ct);
            if (user is null)
            {
                return true;
            }
            var settings = await db.SiteSettings.AsNoTracking().SingleAsync(s => s.Id == SiteSettings.SingletonId, ct);
            var adminRoleId = await db.Roles.Where(r => r.Name == AppRoles.Admin).Select(r => r.Id)
                .FirstOrDefaultAsync(ct);
            var isAdmin = await db.UserRoles.AnyAsync(r => r.UserId == id && r.RoleId == adminRoleId, ct);
            var due = isAdmin ? null : UnverifiedLifetime.DueUtc(user, settings, DateTime.UtcNow);

            await scope.ServiceProvider.GetRequiredService<EmailVerification>()
                .SendVerificationRequestAsync(user, settings.UnverifiedMaxCoins, due, ct);
            user.VerificationRequestSentAtUtc = DateTime.UtcNow;
            await db.SaveChangesAsync(ct);
            return true;
        }
        catch (Exception e) when (e is not OperationCanceledException)
        {
            logger.LogWarning(e, "Verification request not sent to {UserId}", id);
            return false;
        }
    }
}

/// <summary>A run of <see cref="VerificationRequests"/>; its counts grow while it goes.</summary>
public sealed class VerificationRequestRun(DateTime startedAtUtc)
{
    public DateTime StartedAtUtc { get; } = startedAtUtc;

    /// <summary>Null while it runs.</summary>
    public DateTime? FinishedAtUtc { get; set; }

    public int Total { get; set; }
    public int Sent { get; set; }
    public int Failed { get; set; }
}
