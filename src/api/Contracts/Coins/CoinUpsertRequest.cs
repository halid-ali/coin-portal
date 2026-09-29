using System.ComponentModel.DataAnnotations;
using CoinPortal.Api.Data;

namespace CoinPortal.Api.Contracts.Coins;

/// <summary>
/// Used for both create (POST) and full update (PUT).
/// </summary>
public class CoinUpsertRequest : IValidatableObject
{
    [Required, StringLength(Coin.TitleMaxLength)]
    public string Title { get; set; } = string.Empty;

    [StringLength(Coin.DescriptionMaxLength)]
    public string? Description { get; set; }

    // Nullable so a missing value fails [Required] instead of silently becoming 0
    [Required, EnumDataType(typeof(Denomination))]
    public Denomination? Denomination { get; set; }

    [Required, StringLength(Country.CodeLength, MinimumLength = Country.CodeLength)]
    public string CountryCode { get; set; } = string.Empty;

    [Required, Range(Coin.MinYear, 9999)]
    public int? Year { get; set; }

    [StringLength(Coin.MintMarkMaxLength)]
    public string? MintMark { get; set; }

    public bool IsCommemorative { get; set; }

    [Range(1, 999)]
    public int Quantity { get; set; } = 1;

    // One of the user's collections; a different one on update moves the coin
    [Required, Range(1, int.MaxValue)]
    public int? CollectionId { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        // Mints sometimes release next year's coins in December
        var maxYear = DateTime.UtcNow.Year + 1;
        if (Year > maxYear)
        {
            yield return new ValidationResult($"Year must be {maxYear} or earlier.", [nameof(Year)]);
        }
    }
}
