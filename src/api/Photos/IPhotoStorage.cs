namespace CoinPortal.Api.Photos;

/// <summary>
/// Where image files live (coin photos and collection covers). Layout:
/// {ownerId}/{imageId}/{fileName}, e.g. thumb.webp or cover.webp. The file system
/// implementation is the only one for now; a blob storage one could replace it later.
/// </summary>
public interface IPhotoStorage
{
    /// <summary>Stores all files of an image. Either all files end up in place or none.</summary>
    Task SaveAsync(string ownerId, Guid imageId, IReadOnlyDictionary<string, byte[]> files,
        CancellationToken ct);

    /// <summary>
    /// Opens one file for reading, or returns null if it does not exist. An open stream does not
    /// block deleting the file.
    /// </summary>
    Stream? OpenRead(string ownerId, Guid imageId, string fileName);

    /// <summary>
    /// Removes all files of an image. Missing files are not an error. Never throws (called after
    /// the database rows are gone): retries briefly, then logs the leftover as an error.
    /// </summary>
    Task DeleteAsync(string ownerId, Guid imageId);

    /// <summary>Removes every image of an owner (account deletion, dev data reset); as DeleteAsync.</summary>
    Task DeleteOwnerAsync(string ownerId);

    /// <summary>
    /// Every stored image with its size and when it was written, for the orphan sweep
    /// (<see cref="PhotoSweeper"/>). Entries this code did not create are skipped.
    /// </summary>
    IReadOnlyList<StoredImage> ListImages();

    /// <summary>
    /// Removes what uploads cut short left behind (a crash while writing), if written before
    /// <paramref name="cutoffUtc"/>. Returns how many were removed. As DeleteAsync, never throws.
    /// </summary>
    Task<int> DeleteUnfinishedAsync(DateTime cutoffUtc);

    /// <summary>
    /// Startup check: writes and removes a test entry, so a wrong setting stops the app instead of
    /// failing the first upload. Returns where the images are (for the log); throws if unusable.
    /// </summary>
    Task<string> CheckWritableAsync();
}

/// <summary>One image on disk: all its files together.</summary>
public sealed record StoredImage(string OwnerId, Guid ImageId, long Bytes, DateTime WrittenAtUtc);
