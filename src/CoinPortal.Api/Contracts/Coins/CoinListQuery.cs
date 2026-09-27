using System.ComponentModel.DataAnnotations;
using CoinPortal.Api.Data;

namespace CoinPortal.Api.Contracts.Coins;

/// <summary>
/// Sort column. Newest is the default and ignores the direction; every other column
/// follows <see cref="SortDirection"/> and uses fixed tie-breakers (country, year, ...).
/// </summary>
public enum CoinSort
{
    Newest,        // CreatedAtUtc desc
    Title,
    Denomination,  // by face value
    Country,       // by CountryOrder if given, otherwise by ISO code
    Year,
    MintMark,      // coins without a mint mark always last
    Commemorative,
    Quantity
}

public enum SortDirection
{
    Asc,
    Desc
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

    [EnumDataType(typeof(SortDirection))]
    public SortDirection Dir { get; set; } = SortDirection.Asc;

    /// <summary>
    /// Comma-separated country codes in the client's display order (e.g. sorted by the
    /// localized name). Country names are not stored in the database, so the client decides
    /// the order and the API stays language independent. Codes missing here sort first.
    /// </summary>
    [StringLength(300)]
    [RegularExpression("^[A-Za-z]{2}(,[A-Za-z]{2})*$")]
    public string? CountryOrder { get; set; }

    [Range(1, int.MaxValue)]
    public int Page { get; set; } = 1;

    // 0 = all items on one page
    [Range(0, 100)]
    public int PageSize { get; set; } = 10;
}