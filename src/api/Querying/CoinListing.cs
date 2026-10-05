using System.Linq.Expressions;
using CoinPortal.Api.Contracts.Coins;
using CoinPortal.Api.Contracts.Common;
using CoinPortal.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace CoinPortal.Api.Querying;

/// <summary>
/// Filters, sort and paging of a coin list (<see cref="CoinListQuery"/>). Shared by the owner's
/// list, shared collections and the public explore list; the caller decides which coins are
/// visible before applying it.
/// </summary>
public static class CoinListing
{
    public static string NormalizeCountryCode(string code) => code.Trim().ToUpperInvariant();

    /// <summary>All filters combined with AND. The collection filter is the caller's job.</summary>
    public static IQueryable<Coin> ApplyFilters(this IQueryable<Coin> coins, CoinListQuery query)
    {
        if (query.Denomination is { } denomination)
        {
            coins = coins.Where(c => c.Denomination == denomination);
        }
        if (!string.IsNullOrWhiteSpace(query.CountryCode))
        {
            var countryCode = NormalizeCountryCode(query.CountryCode);
            coins = coins.Where(c => c.CountryCode == countryCode);
        }
        if (query.Year is { } year)
        {
            coins = coins.Where(c => c.Year == year);
        }
        if (query.IsCommemorative is { } isCommemorative)
        {
            coins = coins.Where(c => c.IsCommemorative == isCommemorative);
        }
        // Every word must appear in the title or the description, in any order: "almanya 2006"
        // finds "2 € · Almanya · 2006". SQL Server's default collation is case-insensitive.
        foreach (var term in SearchTerms(query.Search))
        {
            coins = coins.Where(c => c.Title.Contains(term)
                || (c.Description != null && c.Description.Contains(term)));
        }
        return coins;
    }

    /// <summary>At most this many words of a search are used (each one is a condition).</summary>
    public const int MaxSearchTerms = 6;

    /// <summary>The distinct words of a search, split on white space.</summary>
    public static IEnumerable<string> SearchTerms(string? search) =>
        string.IsNullOrWhiteSpace(search)
            ? []
            : search.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries)
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Take(MaxSearchTerms);

    /// <summary>
    /// The chosen column follows the direction; tie-breakers keep a fixed direction.
    /// Id as last key keeps paging stable when other keys are equal.
    /// </summary>
    public static IOrderedQueryable<Coin> ApplySort(this IQueryable<Coin> coins, CoinListQuery query)
    {
        var desc = query.Dir == SortDirection.Desc;

        // Position in the client's display order (CHARINDEX in SQL). Without CountryOrder
        // every rank is -1 and the ISO code decides.
        var countryOrder = "," + (query.CountryOrder?.ToUpperInvariant() ?? string.Empty) + ",";
        Expression<Func<Coin, int>> countryRank = c => countryOrder.IndexOf(c.CountryCode);

        IOrderedQueryable<Coin> ThenByCountry(IOrderedQueryable<Coin> q, bool descending = false) =>
            q.ThenBy(countryRank, descending).ThenBy(c => c.CountryCode, descending);

        return query.Sort switch
        {
            CoinSort.Title => coins.OrderBy(c => c.Title, desc).ThenBy(c => c.Id, desc),
            CoinSort.Denomination => ThenByCountry(coins.OrderBy(c => c.Denomination, desc))
                .ThenBy(c => c.Year).ThenBy(c => c.Id),
            CoinSort.Country => coins.OrderBy(countryRank, desc).ThenBy(c => c.CountryCode, desc)
                .ThenByDescending(c => c.Denomination).ThenBy(c => c.Year).ThenBy(c => c.Id),
            CoinSort.Year => ThenByCountry(coins.OrderBy(c => c.Year, desc))
                .ThenByDescending(c => c.Denomination).ThenBy(c => c.Id),
            _ => coins.OrderByDescending(c => c.CreatedAtUtc).ThenByDescending(c => c.Id)
        };
    }

    /// <summary>Filters, sorts and pages (PageSize 0 = everything on one page), then maps.</summary>
    public static async Task<PagedResponse<T>> ToPagedAsync<T>(this IQueryable<Coin> coins, CoinListQuery query,
        Func<Coin, T> map, CancellationToken ct)
    {
        var (pageRows, page, totalCount) = await PageAsync(coins, query, ct);
        var items = await pageRows.ToListAsync(ct);
        return new PagedResponse<T>(items.Select(map).ToList(), page, query.PageSize, totalCount);
    }

    /// <summary>
    /// Like the overload above, but the selector is translated to SQL after Skip/Take: related
    /// rows (owner, collection) are read column by column instead of loaded whole with Include.
    /// </summary>
    public static async Task<PagedResponse<T>> ToPagedAsync<T>(this IQueryable<Coin> coins, CoinListQuery query,
        Expression<Func<Coin, T>> selector, CancellationToken ct)
    {
        var (pageRows, page, totalCount) = await PageAsync(coins, query, ct);
        var items = await pageRows.Select(selector).ToListAsync(ct);
        return new PagedResponse<T>(items, page, query.PageSize, totalCount);
    }

    private static async Task<(IQueryable<Coin> Rows, int Page, int TotalCount)> PageAsync(
        IQueryable<Coin> coins, CoinListQuery query, CancellationToken ct)
    {
        var filtered = coins.ApplyFilters(query);
        var ordered = filtered.ApplySort(query);
        var totalCount = await filtered.CountAsync(ct);

        if (query.PageSize == 0)
        {
            return (ordered, 1, totalCount);
        }
        return (ordered.Skip((query.Page - 1) * query.PageSize).Take(query.PageSize), query.Page, totalCount);
    }
}
