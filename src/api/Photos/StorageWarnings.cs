using System.Threading.Channels;
using CoinPortal.Api.Data;
using CoinPortal.Api.Email;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace CoinPortal.Api.Photos;

/// <summary>
/// E-mails a user whose photo storage passes 75 % and 90 % of the quota (user decisions
/// 2026-10-10; the same shares color the bar in Settings > Account). Each warning goes out once
/// (<see cref="ApplicationUser.StorageWarningLevel"/>, written only after the mail server took it,
/// so a failed send is tried again at the next check) and comes again only after the use fell well
/// below its share (<see cref="ResetMargin"/> points: 70 % and 85 %), so deleting and uploading
/// around a threshold sends nothing new. Only to confirmed addresses and accounts an admin did not
/// lock; they keep their level as it is.
/// <para>
/// Checks run in the background, the requests do not wait for a mail: an upload or a deletion
/// queues its owner (<see cref="Enqueue"/>), a changed quota checks everyone it may concern
/// (<see cref="CheckAfterQuotaChange"/>), one e-mail every Email:BulkDelaySeconds. One check at a
/// time, so the two never mail the same warning twice.
/// </para>
/// </summary>
public sealed class StorageWarnings(
    IServiceScopeFactory scopes, IMailSender sender, IOptions<EmailOptions> emailOptions,
    IHostApplicationLifetime lifetime, ILogger<StorageWarnings> logger) : BackgroundService
{
    public const int FillingPercent = 75;
    public const int NearlyFullPercent = 90;

    /// <summary>How far below its share the use must fall before a warning can come again.</summary>
    public const int ResetMargin = 5;

    // A flood of uploads waits here; beyond this many the checks are dropped (the next one catches up)
    private readonly Channel<string> queue = Channel.CreateBounded<string>(
        new BoundedChannelOptions(1000) { SingleReader = true, FullMode = BoundedChannelFullMode.DropWrite });

    private readonly SemaphoreSlim oneAtATime = new(1, 1);

    /// <summary>After an upload or a deletion of the user's images.</summary>
    public void Enqueue(string userId)
    {
        if (!queue.Writer.TryWrite(userId))
        {
            logger.LogWarning("Storage warning check dropped: the queue is full");
        }
    }

    /// <summary>The quota changed: everyone it may warn, or whose warning it may reset, in the background.</summary>
    public void CheckAfterQuotaChange() => _ = Task.Run(() => CheckAllAsync(lifetime.ApplicationStopping));

    /// <summary>The warning this use deserves.</summary>
    public static StorageWarningLevel LevelOf(long usedBytes, long quotaBytes) =>
        usedBytes * 100 >= quotaBytes * NearlyFullPercent ? StorageWarningLevel.NearlyFull
        : usedBytes * 100 >= quotaBytes * FillingPercent ? StorageWarningLevel.Filling
        : StorageWarningLevel.None;

    /// <summary>What stays of a sent warning: it is forgotten only well below its share.</summary>
    public static StorageWarningLevel Kept(StorageWarningLevel sent, long usedBytes, long quotaBytes) =>
        sent == StorageWarningLevel.NearlyFull && usedBytes * 100 >= quotaBytes * (NearlyFullPercent - ResetMargin)
            ? StorageWarningLevel.NearlyFull
        : sent != StorageWarningLevel.None && usedBytes * 100 >= quotaBytes * (FillingPercent - ResetMargin)
            ? StorageWarningLevel.Filling
        : StorageWarningLevel.None;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var userId in queue.Reader.ReadAllAsync(stoppingToken))
        {
            try
            {
                await CheckAsync(userId, stoppingToken);
            }
            catch (Exception e) when (e is not OperationCanceledException)
            {
                logger.LogError(e, "Storage warning not checked: {UserId}", userId);
            }
        }
    }

    /// <summary>One user now; true when a warning went out.</summary>
    public async Task<bool> CheckAsync(string userId, CancellationToken ct)
    {
        await oneAtATime.WaitAsync(ct);
        try
        {
            await using var scope = scopes.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var quota = scope.ServiceProvider.GetRequiredService<PhotoQuota>();
            var user = await db.Users.AsNoTracking().SingleOrDefaultAsync(u => u.Id == userId, ct);
            if (user is null || !user.EmailConfirmed || user.LockedAtUtc is not null || user.Email is null)
            {
                return false;
            }
            var limit = await quota.LimitBytesAsync(ct);
            var used = await quota.UsedBytesAsync(userId, null, ct);
            var level = LevelOf(used, limit);
            if (level <= user.StorageWarningLevel)
            {
                var kept = Kept(user.StorageWarningLevel, used, limit);
                if (kept != user.StorageWarningLevel)
                {
                    await SetLevelAsync(db, userId, kept, ct);
                }
                return false;
            }

            var mail = EmailTexts.StorageWarning(user.PreferredLanguage, user.FirstName,
                level == StorageWarningLevel.NearlyFull, used, limit, $"{emailOptions.Value.SiteUrl}/settings/account");
            try
            {
                await sender.SendAsync(new MailMessage(user.Email, $"{user.FirstName} {user.LastName}", mail.Subject,
                    mail.Text, mail.Html), ct);
            }
            catch (Exception e) when (e is not OperationCanceledException)
            {
                logger.LogWarning(e, "Storage warning e-mail not sent: {UserId}", userId);
                return false;
            }
            await SetLevelAsync(db, userId, level, ct);
            logger.LogInformation("Storage warning e-mail sent ({Level}): {UserId}", level, userId);
            return true;
        }
        finally
        {
            oneAtATime.Release();
        }
    }

    private async Task CheckAllAsync(CancellationToken ct)
    {
        try
        {
            List<string> ids;
            await using (var scope = scopes.CreateAsyncScope())
            {
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var limit = await scope.ServiceProvider.GetRequiredService<PhotoQuota>().LimitBytesAsync(ct);
                var from = limit * (FillingPercent - ResetMargin);
                // Same sum as PhotoQuota: photos and covers
                ids = await db.Users
                    .Where(u => u.EmailConfirmed && u.LockedAtUtc == null)
                    .Where(u => u.StorageWarningLevel != StorageWarningLevel.None
                        || ((db.CoinPhotos.Where(p => p.Coin.OwnerId == u.Id).Sum(p => (long?)p.SizeBytes) ?? 0)
                            + (db.Collections.Where(c => c.OwnerId == u.Id).Sum(c => (long?)c.CoverSizeBytes) ?? 0))
                            * 100 >= from)
                    .OrderBy(u => u.CreatedAtUtc)
                    .Select(u => u.Id)
                    .ToListAsync(ct);
            }
            var delay = TimeSpan.FromSeconds(emailOptions.Value.BulkDelaySeconds);
            var sent = 0;
            foreach (var id in ids)
            {
                try
                {
                    if (!await CheckAsync(id, ct))
                    {
                        continue;
                    }
                }
                catch (Exception e) when (e is not OperationCanceledException)
                {
                    logger.LogError(e, "Storage warning not checked: {UserId}", id);
                    continue;
                }
                sent++;
                if (delay > TimeSpan.Zero)
                {
                    await Task.Delay(delay, ct);
                }
            }
            logger.LogInformation("Storage warnings after the quota changed: {Checked} checked, {Sent} sent",
                ids.Count, sent);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            // Shutting down; uploads check their owners again
        }
        catch (Exception e)
        {
            logger.LogError(e, "Storage warnings after the quota changed stopped");
        }
    }

    private static Task<int> SetLevelAsync(AppDbContext db, string userId, StorageWarningLevel level,
        CancellationToken ct) =>
        // Only this column: a whole-row save would trip over Identity's concurrency stamp
        db.Users.Where(u => u.Id == userId)
            .ExecuteUpdateAsync(s => s.SetProperty(u => u.StorageWarningLevel, level), ct);

    public override void Dispose()
    {
        oneAtATime.Dispose();
        base.Dispose();
    }
}
