namespace CoinPortal.Api.Localization;

/// <summary>
/// UI languages as ISO 639-1 codes. The client keeps the same list (core/i18n/languages.ts) and
/// does all UI translation itself; the API only stores the user's choice and uses it for the few
/// texts it creates (e.g. the name of the first collection).
/// </summary>
public static class SupportedLanguages
{
    public const string Default = "en";

    /// <summary>Column length; leaves room for region codes such as "pt-BR".</summary>
    public const int CodeMaxLength = 8;

    public static readonly IReadOnlyList<string> All = ["en", "tr", "de", "bg"];

    public static bool IsSupported(string? code) => code is not null && All.Contains(code);
}
