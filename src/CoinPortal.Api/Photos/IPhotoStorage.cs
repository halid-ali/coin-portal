namespace CoinPortal.Api.Photos;

/// <summary>
/// Where photo files live. Layout: {ownerId}/{photoId}/{size}.webp. The file system
/// implementation is the only one for now; a blob storage one could replace it later.
/// </summary>
public interface IPhotoStorage
{
    /// <summary>Stores all sizes of a photo. Either all files end up in place or none.</summary>
    Task SaveAsync(string ownerId, Guid photoId, IReadOnlyDictionary<PhotoSize, byte[]> files,
        CancellationToken ct);

    /// <summary>Opens one size for reading, or returns null if it does not exist.</summary>
    Stream? OpenRead(string ownerId, Guid photoId, PhotoSize size);

    /// <summary>Removes all sizes of a photo. Missing files are not an error.</summary>
    Task DeleteAsync(string ownerId, Guid photoId);

    /// <summary>Removes every photo of an owner (dev data reset, later account deletion).</summary>
    Task DeleteOwnerAsync(string ownerId);
}
