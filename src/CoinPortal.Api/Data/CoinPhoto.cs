namespace CoinPortal.Api.Data;

/// <summary>
/// Which face of the coin a photo shows, in euro coin terms. A coin has at most one photo
/// per side. "Obverse/reverse" is avoided on purpose: people use it for either side.
/// </summary>
public enum CoinSide
{
    National = 1,  // differs per issuing country, the side that identifies the coin
    Common = 2     // same design in all countries, shows the value
}

/// <summary>
/// A processed coin photo. The files (one per <see cref="Photos.PhotoSize"/>) live in photo
/// storage under the owner's folder; the Id is also the folder name and changes on every upload,
/// so it doubles as the cache version in photo URLs.
/// </summary>
public class CoinPhoto
{
    public Guid Id { get; set; }

    public int CoinId { get; set; }
    public Coin Coin { get; set; } = null!;

    public CoinSide Side { get; set; }

    // Total size of all stored sizes, used for the per-user quota
    public long SizeBytes { get; set; }

    public DateTime CreatedAtUtc { get; set; }
}
