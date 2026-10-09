namespace CoinPortal.Api.Data;

public class Coin
{
    public const int TitleMaxLength = 100;
    public const int DescriptionMaxLength = 2000;
    public const int MintMarkMaxLength = 10;
    public const int CurrencyMaxLength = 30;

    /// <summary>The first euro coins are dated 1999.</summary>
    public const int EuroMinYear = 1999;

    /// <summary>Any coin: no dates before the common era.</summary>
    public const int MinYear = 1;

    /// <summary>Upper bound of an other coin's face value (hyperinflation coins reach the millions).</summary>
    public const decimal MaxFaceValue = 1_000_000_000_000m;

    /// <summary>Decimal places of a face value: 0.5 penny, 0.25 dollar, 0.0001 at most.</summary>
    public const int FaceValueScale = 4;

    public int Id { get; set; }

    // Owner (FK to AspNetUsers). Kept on the coin although the collection has it too: every
    // ownership check and the photo storage path use it. Must equal Collection.OwnerId.
    public string OwnerId { get; set; } = string.Empty;
    public ApplicationUser Owner { get; set; } = null!;

    // Always one of the owner's collections; changing it moves the coin
    public int CollectionId { get; set; }
    public Collection Collection { get; set; } = null!;

    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }

    public CoinKind Kind { get; set; } = CoinKind.Euro;

    // Euro coins only (null for other coins)
    public Denomination? Denomination { get; set; }

    // Other coins only (null for euro coins): e.g. 25 kuruş, 0.5 penny
    public decimal? FaceValue { get; set; }
    public string? Currency { get; set; }

    // ISO 3166-1 alpha-2 code (FK to Countries)
    public string CountryCode { get; set; } = string.Empty;
    public Country Country { get; set; } = null!;

    public int Year { get; set; }

    // e.g. "A", "D", "F", "G", "J" on German coins
    public string? MintMark { get; set; }

    public bool IsCommemorative { get; set; }

    // Number of identical pieces the owner has
    public int Quantity { get; set; } = 1;

    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }

    // At most one per side (national, common)
    public List<CoinPhoto> Photos { get; set; } = [];
}
