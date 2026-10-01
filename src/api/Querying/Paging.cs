using System.Linq.Expressions;
using CoinPortal.Api.Contracts.Common;
using Microsoft.EntityFrameworkCore;

namespace CoinPortal.Api.Querying;

public static class Paging
{
    /// <summary>
    /// One page of an ordered query plus the total count (coin lists use CoinListing). The
    /// selector runs after Skip/Take, so sorting stays on the source and only the page is mapped.
    /// </summary>
    public static async Task<PagedResponse<TResult>> ToPagedAsync<T, TResult>(
        this IOrderedQueryable<T> ordered, int page, int pageSize, Expression<Func<T, TResult>> selector,
        CancellationToken ct)
    {
        var totalCount = await ordered.CountAsync(ct);
        var items = await ordered.Skip((page - 1) * pageSize).Take(pageSize).Select(selector).ToListAsync(ct);
        return new PagedResponse<TResult>(items, page, pageSize, totalCount);
    }
}
