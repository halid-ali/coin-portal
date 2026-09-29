namespace CoinPortal.Api.Data;

/// <summary>
/// Euro area members (incl. Bulgaria since 2026) plus the four microstates
/// that issue euro coins by agreement with the EU.
/// </summary>
public static class CountrySeed
{
    public static readonly Country[] All =
    [
        new() { Code = "AD", Name = "Andorra" },
        new() { Code = "AT", Name = "Austria" },
        new() { Code = "BE", Name = "Belgium" },
        new() { Code = "BG", Name = "Bulgaria" },
        new() { Code = "CY", Name = "Cyprus" },
        new() { Code = "DE", Name = "Germany" },
        new() { Code = "EE", Name = "Estonia" },
        new() { Code = "ES", Name = "Spain" },
        new() { Code = "FI", Name = "Finland" },
        new() { Code = "FR", Name = "France" },
        new() { Code = "GR", Name = "Greece" },
        new() { Code = "HR", Name = "Croatia" },
        new() { Code = "IE", Name = "Ireland" },
        new() { Code = "IT", Name = "Italy" },
        new() { Code = "LT", Name = "Lithuania" },
        new() { Code = "LU", Name = "Luxembourg" },
        new() { Code = "LV", Name = "Latvia" },
        new() { Code = "MC", Name = "Monaco" },
        new() { Code = "MT", Name = "Malta" },
        new() { Code = "NL", Name = "Netherlands" },
        new() { Code = "PT", Name = "Portugal" },
        new() { Code = "SI", Name = "Slovenia" },
        new() { Code = "SK", Name = "Slovakia" },
        new() { Code = "SM", Name = "San Marino" },
        new() { Code = "VA", Name = "Vatican City" }
    ];
}