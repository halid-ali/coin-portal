using System.Linq.Expressions;

namespace CoinPortal.Api.Querying;

/// <summary>
/// OrderBy/ThenBy with the direction as a parameter, for sort options chosen at runtime.
/// </summary>
public static class QueryableSortExtensions
{
    public static IOrderedQueryable<T> OrderBy<T, TKey>(
        this IQueryable<T> source, Expression<Func<T, TKey>> key, bool descending) =>
        descending ? source.OrderByDescending(key) : source.OrderBy(key);

    public static IOrderedQueryable<T> ThenBy<T, TKey>(
        this IOrderedQueryable<T> source, Expression<Func<T, TKey>> key, bool descending) =>
        descending ? source.ThenByDescending(key) : source.ThenBy(key);
}
