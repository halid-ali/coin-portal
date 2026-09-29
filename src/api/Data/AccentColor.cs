namespace CoinPortal.Api.Data;

/// <summary>
/// Accent color of the UI chosen by the user, stored as int. The client maps each value to a
/// color scale (links, highlights, primary buttons). A null preference means the user never chose
/// one: the client then uses this browser's last choice, otherwise Amber.
/// </summary>
public enum AccentColor
{
    Amber = 0,
    Teal = 1,
    Blue = 2,
    Indigo = 3,
    Violet = 4,
    Rose = 5,
    Lime = 6
}
