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
    Denomination,  // by face value: euro coins first (cents), then other coins (currency, value)
    Country,       // by CountryOrder if given, otherwise by ISO code
    Year
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
    public const int MaxCountryOrderLength = 1000;

    /// <summary>One of the user's collections; omitted means all of them.</summary>
    [Range(1, int.MaxValue)]
    public int? CollectionId { get; set; }

    [EnumDataType(typeof(CoinKind))]
    public CoinKind? Kind { get; set; }

    /// <summary>A euro denomination: only euro coins have one.</summary>
    [EnumDataType(typeof(Denomination))]
    public Denomination? Denomination { get; set; }

    /// <summary>The currency of other coins, ignoring case.</summary>
    [StringLength(Coin.CurrencyMaxLength)]
    public string? Currency { get; set; }

    [StringLength(Country.CodeLength, MinimumLength = Country.CodeLength)]
    public string? CountryCode { get; set; }

    [Range(Coin.MinYear, 9999)]
    public int? Year { get; set; }

    public bool? IsCommemorative { get; set; }

    /// <summary>With (true) or without (false) the photos a public collection needs (PublicationRules).</summary>
    public bool? Photographed { get; set; }

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
    /// Every country fits (253 codes, 758 characters).
    /// </summary>
    [StringLength(MaxCountryOrderLength)]
    [RegularExpression("^[A-Za-z]{2}(,[A-Za-z]{2})*$")]
    public string? CountryOrder { get; set; }

    // Bounded: (page - 1) * pageSize must not overflow
    [Range(1, 100_000)]
    public int Page { get; set; } = 1;

    // 0 = all items on one page
    [Range(0, 100)]
    public int PageSize { get; set; } = 10;
}
