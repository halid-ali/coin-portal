using System.ComponentModel.DataAnnotations;

namespace CoinPortal.Api.Email;

/// <summary>
/// Configuration section "Email". Without an SMTP host the messages are written to
/// <see cref="PickupPath"/> as .eml files instead of being sent (development, tests, e2e); on the
/// server the SMTP settings come from the environment (web.config), never from the repository.
/// </summary>
public sealed class EmailOptions : IValidatableObject
{
    public const string SectionName = "Email";

    /// <summary>
    /// The site's address for links in e-mails, without a trailing slash (https://coinvitrine.com;
    /// ng serve locally). Never taken from the request: its Host header is the client's to choose.
    /// </summary>
    [Required]
    public string SiteUrl { get; set; } = "http://localhost:4200";

    [Required, EmailAddress]
    public string FromAddress { get; set; } = "contact@coinvitrine.com";

    [Required, StringLength(100)]
    public string FromName { get; set; } = "CoinVitrine";

    /// <summary>Folder for .eml files when no SMTP host is set; relative to the content root.</summary>
    public string PickupPath { get; set; } = "App_Data/mail";

    /// <summary>
    /// Seconds between two e-mails of a bulk send (Accounts.VerificationRequests): the host's sending
    /// limit is unknown. 0 in tests.
    /// </summary>
    [Range(0, 600)]
    public int BulkDelaySeconds { get; set; } = 5;

    public SmtpSettings Smtp { get; set; } = new();

    public bool UsesSmtp => !string.IsNullOrWhiteSpace(Smtp.Host);

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (!Uri.TryCreate(SiteUrl, UriKind.Absolute, out var site)
            || (site.Scheme != Uri.UriSchemeHttps && site.Scheme != Uri.UriSchemeHttp)
            || site.AbsolutePath != "/" || SiteUrl.EndsWith('/'))
        {
            yield return new ValidationResult("Email:SiteUrl must be an http(s) address without a path or trailing slash.",
                [nameof(SiteUrl)]);
        }
        if (!UsesSmtp && string.IsNullOrWhiteSpace(PickupPath))
        {
            yield return new ValidationResult("Email needs either Smtp:Host or a PickupPath.", [nameof(PickupPath)]);
        }
        // Nested settings are not validated on their own
        var smtp = new List<ValidationResult>();
        Validator.TryValidateObject(Smtp, new ValidationContext(Smtp), smtp, validateAllProperties: true);
        foreach (var result in smtp)
        {
            yield return result;
        }
    }
}

public sealed class SmtpSettings
{
    public string? Host { get; set; }

    [Range(1, 65535)]
    public int Port { get; set; } = 587;

    public string? UserName { get; set; }

    public string? Password { get; set; }

    /// <summary>StartTls (587), SslOnConnect (465), or None (local test servers only).</summary>
    public SmtpSecurity Security { get; set; } = SmtpSecurity.StartTls;

    [Range(1, 120)]
    public int TimeoutSeconds { get; set; } = 15;
}

public enum SmtpSecurity
{
    StartTls,
    SslOnConnect,
    None,
}
