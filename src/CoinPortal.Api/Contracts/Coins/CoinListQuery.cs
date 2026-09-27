using System.ComponentModel.DataAnnotations;
using CoinPortal.Api.Data;

namespace CoinPortal.Api.Contracts.Coins;

public enum CoinSort
{
    Newest,        // CreatedAtUtc desc
    Denomination,  // 2 euro first, then country, year
    Country,       // by ISO code, then denomination, year
    Year           // newest year first, then country, denomination
}

/// <summary>
/// Query string for GET /api/coins. All filters are optional and combined with AND.
/// </summary>
public class CoinListQuery
{
    [EnumDataType(typeof(Denomination))]
    public Denomination? Denomination { get; set; }

    [StringLength(Country.CodeLength, MinimumLength = Country.CodeLength)]
    public string? CountryCode { get; set; }

    [Range(Coin.MinYear, 9999)]
    public int? Year { get; set; }

    public bool? IsCommemorative { get; set; }

    // Matches title or description
    [StringLength(100)]
    public string? Search { get; set; }

    [EnumDataType(typeof(CoinSort))]
    public CoinSort Sort { get; set; } = CoinSort.Newest;

    [Range(1, int.MaxValue)]
    public int Page { get; set; } = 1;

    // 0 = all items on one page
    [Range(0, 100)]
    public int PageSize { get; set; } = 10;
}