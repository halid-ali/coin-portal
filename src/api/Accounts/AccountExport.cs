using System.IO.Compression;
using System.Text.Encodings.Web;
using System.Text.Json;
using System.Text.Json.Serialization;
using CoinPortal.Api.Contracts.Settings;
using CoinPortal.Api.Data;
using CoinPortal.Api.Photos;
using Microsoft.EntityFrameworkCore;

namespace CoinPortal.Api.Accounts;

/// <summary>
/// The user's data as a ZIP (GDPR access and portability): account.json, collections.json with
/// every coin, moderation.json (administrators' actions about the user), and the largest size of
/// every photo and cover. Built in a temporary file, not in
/// memory (up to the photo quota, 300 MB); the file is deleted when the returned stream closes.
/// </summary>
public class AccountExport(AppDbContext db, IPhotoStorage photoStorage)
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true,
        Converters = { new JsonStringEnumConverter() },
        // Readable text ("Belçika", not "Belçika"): the default escapes everything outside
        // ASCII for embedding in HTML, which a downloaded UTF-8 file never is
        Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    public static string FileName(ApplicationUser user, DateTime nowUtc) =>
        $"coinportal-{user.UserName}-{nowUtc:yyyyMMdd}.zip";

    public async Task<Stream> CreateAsync(ApplicationUser user, CancellationToken ct)
    {
        var collections = await db.Collections.AsNoTracking()
            .Where(c => c.OwnerId == user.Id)
            .OrderBy(c => c.Id)
            .Select(c => new
            {
                c.Id, c.Name, c.Description, c.Visibility, c.ShareToken, c.ModerationLockedAtUtc,
                c.CreatedAtUtc, c.UpdatedAtUtc, c.CoverImageId,
                Coins = c.Coins.OrderBy(coin => coin.Id).Select(coin => new
                {
                    Coin = coin,
                    Photos = coin.Photos.Select(p => new { p.Id, p.Side }).ToList(),
                }).ToList(),
            })
            .ToListAsync(ct);
        var moderation = await db.AuditLog.AsNoTracking()
            .Where(a => a.TargetUserId == user.Id)
            .OrderBy(a => a.CreatedAtUtc).ThenBy(a => a.Id)
            .Select(a => new ModerationExport(a.CreatedAtUtc, a.Action, a.TargetCollectionId,
                a.TargetCollectionName, a.Note))
            .ToListAsync(ct);

        var file = new FileStream(Path.GetTempFileName(), FileMode.Create, FileAccess.ReadWrite, FileShare.None,
            bufferSize: 81920, FileOptions.DeleteOnClose);
        try
        {
            using (var zip = new ZipArchive(file, ZipArchiveMode.Create, leaveOpen: true))
            {
                var export = new List<CollectionExport>();
                foreach (var c in collections)
                {
                    string? cover = null;
                    if (c.CoverImageId is { } coverId
                        && await AddImageAsync(zip, user.Id, coverId, CoverImage.FileName, $"covers/{c.Id}.webp", ct))
                    {
                        cover = $"covers/{c.Id}.webp";
                    }

                    var coins = new List<CoinExport>();
                    foreach (var (coin, photoRows) in c.Coins.Select(x => (x.Coin, x.Photos)))
                    {
                        var photos = new Dictionary<CoinSide, string>();
                        foreach (var photo in photoRows.OrderBy(p => p.Side))
                        {
                            var path = $"photos/{coin.Id}-{photo.Side.ToString().ToLowerInvariant()}.webp";
                            if (await AddImageAsync(zip, user.Id, photo.Id, PhotoSize.Full.FileName(), path, ct))
                            {
                                photos[photo.Side] = path;
                            }
                        }
                        coins.Add(new CoinExport(coin.Id, coin.Title, coin.Description, coin.Denomination,
                            coin.CountryCode, coin.Year, coin.MintMark, coin.IsCommemorative, coin.Quantity,
                            coin.CreatedAtUtc, coin.UpdatedAtUtc, photos));
                    }
                    export.Add(new CollectionExport(c.Id, c.Name, c.Description, c.Visibility, c.ShareToken,
                        c.ModerationLockedAtUtc, c.CreatedAtUtc, c.UpdatedAtUtc, cover, coins));
                }

                await AddJsonAsync(zip, "collections.json", export, ct);
                await AddJsonAsync(zip, "moderation.json", moderation, ct);
                await AddJsonAsync(zip, "account.json", new AccountExportFile(DateTime.UtcNow, user.UserName!,
                    user.Email!, user.FirstName, user.LastName, user.BirthDate, user.CreatedAtUtc,
                    user.PreferredLanguage, user.PreferredTheme, user.PreferredAccent, user.LastSignInAtUtc,
                    user.PreviousSignInAtUtc, user.LastSeenAtUtc), ct);
            }
            file.Position = 0;
            return file;
        }
        catch
        {
            await file.DisposeAsync();
            throw;
        }
    }

    // WebP is compressed already; a missing file (should not happen) is left out of the ZIP
    private async Task<bool> AddImageAsync(ZipArchive zip, string ownerId, Guid imageId, string fileName,
        string path, CancellationToken ct)
    {
        await using var source = photoStorage.OpenRead(ownerId, imageId, fileName);
        if (source is null)
        {
            return false;
        }
        await using var target = zip.CreateEntry(path, CompressionLevel.NoCompression).Open();
        await source.CopyToAsync(target, ct);
        return true;
    }

    private static async Task AddJsonAsync<T>(ZipArchive zip, string path, T value, CancellationToken ct)
    {
        await using var target = zip.CreateEntry(path, CompressionLevel.Optimal).Open();
        await JsonSerializer.SerializeAsync(target, value, Json, ct);
    }
}
