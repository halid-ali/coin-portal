namespace CoinPortal.Api.Data;

/// <summary>
/// The last photo storage warning e-mailed to a user (Photos.StorageWarnings), stored as int:
/// Filling at 75 % of the quota, NearlyFull at 90 %. Each goes out once until the use falls well
/// below its share again.
/// </summary>
public enum StorageWarningLevel
{
    None = 0,
    Filling = 1,
    NearlyFull = 2
}
