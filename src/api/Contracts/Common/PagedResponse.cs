namespace CoinPortal.Api.Contracts.Common;

public sealed record PagedResponse<T>(IReadOnlyList<T> Items, int Page, int PageSize, int TotalCount)
{
    // PageSize 0 means everything is on a single page
    public int TotalPages => PageSize == 0
        ? (TotalCount > 0 ? 1 : 0)
        : (int)Math.Ceiling(TotalCount / (double)PageSize);
}
