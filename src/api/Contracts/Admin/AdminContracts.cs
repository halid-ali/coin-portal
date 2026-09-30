namespace CoinPortal.Api.Contracts.Admin;

/// <summary>Overview numbers of the whole site for the panel.</summary>
/// <param name="NewUsersLast30Days">Registered within the last 30 days.</param>
/// <param name="StorageBytes">Stored image bytes: all sizes of all coin photos plus covers.</param>
public sealed record AdminStatsResponse(
    int UserCount,
    int NewUsersLast30Days,
    int CollectionCount,
    int PublicCollectionCount,
    int UnlistedCollectionCount,
    int CoinCount,
    int PhotoCount,
    long StorageBytes);
