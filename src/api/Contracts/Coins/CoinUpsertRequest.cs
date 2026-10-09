using System.ComponentModel.DataAnnotations;
using CoinPortal.Api.Data;
using CoinPortal.Api.Validation;

namespace CoinPortal.Api.Contracts.Coins;

/// <summary>
/// Used for both create (POST) and full update (PUT). A euro coin needs its denomination, an other
/// coin its face value and currency; the fields of the other kind are ignored.
/// </summary>
public class CoinUpsertRequest : IValidatableObject
{
    [Required, StringLength(Coin.TitleMaxLength), NoControlCharacters]
    public string Title { get; set; } = string.Empty;

    [StringLength(Coin.DescriptionMaxLength), NoControlCharacters(AllowLineBreaks = true)]
    public string? Description { get; set; }

    /// <summary>Omitted means a euro coin: requests from before other coins existed stay valid.</summary>
    [EnumDataType(typeof(CoinKind))]
    public CoinKind? Kind { get; set; }

    // Euro coins. Nullable so a missing value is reported instead of silently becoming 0
    [EnumDataType(typeof(Denomination))]
    public Denomination? Denomination { get; set; }

    // Other coins, e.g. 25 (kuruş) or 0.5 (penny)
    public decimal? FaceValue { get; set; }

    [StringLength(Coin.CurrencyMaxLength), NoControlCharacters]
    public string? Currency { get; set; }

    [Required, StringLength(Country.CodeLength, MinimumLength = Country.CodeLength)]
    public string CountryCode { get; set; } = string.Empty;

    [Required, Range(Coin.MinYear, 9999)]
    public int? Year { get; set; }

    [StringLength(Coin.MintMarkMaxLength), NoControlCharacters]
    public string? MintMark { get; set; }

    public bool IsCommemorative { get; set; }

    [Range(1, 999)]
    public int Quantity { get; set; } = 1;

    // One of the user's collections; a different one on update moves the coin
    [Required, Range(1, int.MaxValue)]
    public int? CollectionId { get; set; }

    public CoinKind ResolvedKind() => Kind ?? CoinKind.Euro;

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        // Mints sometimes release next year's coins in December
        var maxYear = DateTime.UtcNow.Year + 1;
        if (Year > maxYear)
        {
            yield return new ValidationResult($"Year must be {maxYear} or earlier.", [nameof(Year)]);
        }

        if (ResolvedKind() == CoinKind.Euro)
        {
            if (Denomination is null)
            {
                yield return new ValidationResult("A euro coin needs its denomination.", [nameof(Denomination)]);
            }
            if (Year < Coin.EuroMinYear)
            {
                yield return new ValidationResult($"Euro coins are dated {Coin.EuroMinYear} or later.", [nameof(Year)]);
            }
            yield break;
        }

        if (FaceValue is not { } value)
        {
            yield return new ValidationResult("An other coin needs its face value.", [nameof(FaceValue)]);
        }
        else if (value <= 0 || value > Coin.MaxFaceValue || decimal.Round(value, Coin.FaceValueScale) != value)
        {
            yield return new ValidationResult(
                $"The face value must be above 0, at most {Coin.MaxFaceValue}, with up to {Coin.FaceValueScale} decimals.",
                [nameof(FaceValue)]);
        }
        if (string.IsNullOrWhiteSpace(Currency))
        {
            yield return new ValidationResult("An other coin needs its currency.", [nameof(Currency)]);
        }
    }
}
