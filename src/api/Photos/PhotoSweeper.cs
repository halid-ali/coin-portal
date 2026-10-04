using CoinPortal.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace CoinPortal.Api.Photos;

/// <summary>
/// Brings the photo folder back in step with the database. Files are written before their row and
/// deleted after it, so a crash, a failed delete or two requests racing can leave a folder no row
/// refers to; the quota counts rows, so that would go unnoticed until the host's disk is full.
/// A sweep removes such orphans and unfinished uploads once they are older than
/// <see cref="MinAge"/> (an upload in progress has its files and no row yet for a moment), and
/// counts rows whose files are missing (never removed: the database is the source of truth).
/// Run by <see cref="PhotoSweepService"/>; the last result is in the admin panel's overview.
/// </summary>
public class PhotoSweeper(IServiceScopeFactory scopes, IPhotoStorage storage, ILogger<PhotoSweeper> logger)
{
    public static readonly TimeSpan MinAge = TimeSpan.FromHours(1);

    // Safety stop: more orphans than this, and more than half of all images, looks like the wrong
    // database or folder (a changed connection string, a restored backup), not like leftovers
    private const int SuspiciousOrphanCount = 10;

    // Missing files are logged one by one up to this many; the summary has the count
    private const int LoggedMissingFiles = 20;

    private readonly SemaphoreSlim running = new(1, 1);

    /// <summary>The last sweep since the app started, or null before the first one.</summary>
    public PhotoSweepResult? LastResult { get; private set; }

    public async Task<PhotoSweepResult> SweepAsync(CancellationToken ct)
    {
        await running.WaitAsync(ct);
        try
        {
            LastResult = await RunAsync(ct);
            return LastResult;
        }
        finally
        {
            running.Release();
        }
    }

    private async Task<PhotoSweepResult> RunAsync(CancellationToken ct)
    {
        var startedAtUtc = DateTime.UtcNow;
        var cutoff = startedAtUtc - MinAge;
        var unfinished = await storage.DeleteUnfinishedAsync(cutoff);

        // Disk first, then the database: a folder written before the cutoff whose row is not there
        // now will not get one (an upload saves its row seconds after its files)
        var onDisk = storage.ListImages();
        List<KnownImage> known;
        HashSet<string> users;
        await using (var scope = scopes.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var photoFile = PhotoSize.Full.FileName();
            known = await db.CoinPhotos
                .Select(p => new KnownImage(p.Id, p.Coin.OwnerId, photoFile))
                .ToListAsync(ct);
            known.AddRange(await db.Collections
                .Where(c => c.CoverImageId != null)
                .Select(c => new KnownImage(c.CoverImageId!.Value, c.OwnerId, CoverImage.FileName))
                .ToListAsync(ct));
            users = (await db.Users.Select(u => u.Id).ToListAsync(ct)).ToHashSet(StringComparer.OrdinalIgnoreCase);
        }

        var knownIds = known.Select(k => k.Id).ToHashSet();
        var orphans = onDisk.Where(i => !knownIds.Contains(i.ImageId) && i.WrittenAtUtc < cutoff).ToList();
        var skipped = orphans.Count > SuspiciousOrphanCount && orphans.Count * 2 > onDisk.Count;
        if (skipped)
        {
            logger.LogError(
                "Photo sweep: {OrphanCount} of {ImageCount} image folders have no database row; this looks like " +
                "the wrong database or photo folder, so nothing was removed", orphans.Count, onDisk.Count);
            orphans = [];
        }

        foreach (var orphan in orphans)
        {
            // Logged one by one: the path tells what was removed, if it ever was a mistake
            logger.LogWarning("Photo sweep: removing orphan image {OwnerId}/{ImageId:N} ({Bytes} bytes)",
                orphan.OwnerId, orphan.ImageId, orphan.Bytes);
            await storage.DeleteAsync(orphan.OwnerId, orphan.ImageId);
        }
        // The empty folders of deleted accounts
        var removedIds = orphans.Select(o => o.ImageId).ToHashSet();
        foreach (var owner in onDisk.GroupBy(i => i.OwnerId, StringComparer.OrdinalIgnoreCase))
        {
            if (!users.Contains(owner.Key) && owner.All(i => removedIds.Contains(i.ImageId)))
            {
                await storage.DeleteOwnerAsync(owner.Key);
            }
        }

        // Not listed on disk: checked again file by file, an upload since the listing has its file now
        var listedIds = onDisk.Select(i => i.ImageId).ToHashSet();
        var missing = 0;
        foreach (var image in known.Where(k => !listedIds.Contains(k.Id)))
        {
            await using var file = storage.OpenRead(image.OwnerId, image.Id, image.FileName);
            if (file is null && ++missing <= LoggedMissingFiles)
            {
                logger.LogWarning("Photo sweep: image {OwnerId}/{ImageId:N} has a database row but no file",
                    image.OwnerId, image.Id);
            }
        }

        var remaining = onDisk.Where(i => !removedIds.Contains(i.ImageId)).ToList();
        var result = new PhotoSweepResult(
            CheckedAtUtc: startedAtUtc,
            ImageCount: remaining.Count,
            DiskBytes: remaining.Sum(i => i.Bytes),
            RemovedImageCount: orphans.Count,
            RemovedBytes: orphans.Sum(o => o.Bytes),
            RemovedUnfinishedCount: unfinished,
            MissingImageCount: missing,
            RemovalSkipped: skipped);
        logger.LogInformation(
            "Photo sweep: {ImageCount} images, {DiskBytes} bytes on disk; removed {RemovedImageCount} orphans " +
            "({RemovedBytes} bytes) and {RemovedUnfinishedCount} unfinished uploads; {MissingImageCount} missing",
            result.ImageCount, result.DiskBytes, result.RemovedImageCount, result.RemovedBytes,
            result.RemovedUnfinishedCount, result.MissingImageCount);
        return result;
    }

    private sealed record KnownImage(Guid Id, string OwnerId, string FileName);
}

/// <summary>What one sweep found; counts and sizes are after the removal.</summary>
/// <param name="DiskBytes">All files of the images on disk (the quota counts the database's sizes).</param>
/// <param name="MissingImageCount">Images with a database row but no file.</param>
/// <param name="RemovalSkipped">Too many orphans to be leftovers: nothing removed, logged as an error.</param>
public sealed record PhotoSweepResult(
    DateTime CheckedAtUtc,
    int ImageCount,
    long DiskBytes,
    int RemovedImageCount,
    long RemovedBytes,
    int RemovedUnfinishedCount,
    int MissingImageCount,
    bool RemovalSkipped);
