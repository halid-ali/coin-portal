namespace CoinPortal.Api.Data;

public class Coin
{
    public const int TitleMaxLength = 100;
    public const int DescriptionMaxLength = 2000;
    public const int MintMarkMaxLength = 10;
    public const int MinYear = 1999;

    public int Id { get; set; }

    // Owner (FK to AspNetUsers)
    public string OwnerId { get; set; } = string.Empty;
    public ApplicationUser Owner { get; set; } = null!;

    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }

    public Denomination Denomination { get; set; }

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

    // Image paths are added in the photo upload step
}