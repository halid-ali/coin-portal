namespace CoinPortal.Api.Data;

/// <summary>
/// A named group of coins owned by one user. Every coin belongs to exactly one collection of
/// its owner. Visibility (sharing) is planned per collection.
/// </summary>
public class Collection
{
    public const int NameMaxLength = 100;
    public const int DescriptionMaxLength = 1000;

    /// <summary>Created for every new user and by the migration for existing users.</summary>
    public const string DefaultName = "Koleksiyonum";

    public int Id { get; set; }

    public string OwnerId { get; set; } = string.Empty;
    public ApplicationUser Owner { get; set; } = null!;

    // Unique per owner
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    // Uploaded cover image (photo storage folder name, changes on every upload) and its size for
    // the quota. Without one the card shows the latest coin photo.
    public Guid? CoverImageId { get; set; }
    public long CoverSizeBytes { get; set; }

    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }

    public List<Coin> Coins { get; set; } = [];
}
