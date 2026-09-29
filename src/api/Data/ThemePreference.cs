namespace CoinPortal.Api.Data;

/// <summary>
/// Color theme chosen by the user, stored as int. System follows the device setting
/// (prefers-color-scheme). A null preference means the user never chose one: the client then
/// uses this browser's last choice, otherwise System.
/// </summary>
public enum ThemePreference
{
    System = 0,
    Light = 1,
    Dark = 2
}
