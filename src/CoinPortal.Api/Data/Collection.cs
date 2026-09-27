using System.Security.Cryptography;
using Microsoft.AspNetCore.WebUtilities;

namespace CoinPortal.Api.Data;

/// <summary>Who can see a collection. Stored as int; Private is the default for every collection.</summary>
public enum CollectionVisibility
{
    Private = 0,   // owner only
    Unlisted = 1,  // anyone with the secret share link (/s/{ShareToken}), not listed anywhere
    Public = 2     // anyone, also signed out; on the profile page and in Explore
}

/// <summary>
/// A named group of coins owned by one user. Every coin belongs to exactly one collection of
/// its owner. Visibility is set per collection.
/// </summary>
public class Collection
{
    public const int NameMaxLength = 100;
    public const int DescriptionMaxLength = 1000;

    /// <summary>16 random bytes as base64url.</summary>
    public const int ShareTokenLength = 22;

    /// <summary>Created for every new user and by the migration for existing users.</summary>
    public const string DefaultName = "Koleksiyonum";

    public int Id { get; set; }

    public string OwnerId { get; set; } = string.Empty;
    public ApplicationUser Owner { get; set; } = null!;

    // Unique per owner
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }

    public CollectionVisibility Visibility { get; set; } = CollectionVisibility.Private;

    // Secret part of the share link, only while Unlisted. Leaving Unlisted drops it, so old links
    // stop working; a new one is created when the collection becomes Unlisted again.
    public string? ShareToken { get; set; }

    // Uploaded cover image (photo storage folder name, changes on every upload) and its size for
    // the quota. Without one the card shows the latest coin photo.
    public Guid? CoverImageId { get; set; }
    public long CoverSizeBytes { get; set; }

    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }

    public List<Coin> Coins { get; set; } = [];

    /// <summary>128 random bits, URL safe (22 characters).</summary>
    public static string NewShareToken() =>
        WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(16));
}
