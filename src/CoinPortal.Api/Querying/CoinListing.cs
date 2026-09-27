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
        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            // SQL Server default collation is case-insensitive
            var term = query.Search.Trim();
            coins = coins.Where(c => c.Title.Contains(term)
                || (c.Description != null && c.Description.Contains(term)));
        }
        return coins;
    }

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
            CoinSort.MintMark => ThenByCountry(coins.OrderBy(c => c.MintMark == null)
                    .ThenBy(c => c.MintMark, desc))
                .ThenBy(c => c.Year).ThenByDescending(c => c.Denomination).ThenBy(c => c.Id),
            CoinSort.Commemorative => ThenByCountry(coins.OrderBy(c => c.IsCommemorative, desc))
                .ThenBy(c => c.Year).ThenByDescending(c => c.Denomination).ThenBy(c => c.Id),
            CoinSort.Quantity => ThenByCountry(coins.OrderBy(c => c.Quantity, desc))
                .ThenBy(c => c.Year).ThenByDescending(c => c.Denomination).ThenBy(c => c.Id),
            _ => coins.OrderByDescending(c => c.CreatedAtUtc).ThenByDescending(c => c.Id)
        };
    }

    /// <summary>Filters, sorts and pages (PageSize 0 = everything on one page), then maps.</summary>
    public static async Task<PagedResponse<T>> ToPagedAsync<T>(this IQueryable<Coin> coins, CoinListQuery query,
        Func<Coin, T> map, CancellationToken ct)
    {
        var filtered = coins.ApplyFilters(query);
        var ordered = filtered.ApplySort(query);
        var totalCount = await filtered.CountAsync(ct);

        var showAll = query.PageSize == 0;
        var page = showAll ? 1 : query.Page;
        var items = await (showAll
                ? ordered
                : ordered.Skip((page - 1) * query.PageSize).Take(query.PageSize))
            .ToListAsync(ct);

        return new PagedResponse<T>(items.Select(map).ToList(), page, query.PageSize, totalCount);
    }
}
