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

    /// <summary>Opens one file for reading, or returns null if it does not exist.</summary>
    Stream? OpenRead(string ownerId, Guid imageId, string fileName);

    /// <summary>Removes all files of an image. Missing files are not an error.</summary>
    Task DeleteAsync(string ownerId, Guid imageId);

    /// <summary>Removes every image of an owner (dev data reset, later account deletion).</summary>
    Task DeleteOwnerAsync(string ownerId);
}
