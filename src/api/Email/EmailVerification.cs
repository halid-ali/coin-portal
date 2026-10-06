using System.Security.Cryptography;
using CoinPortal.Api.Data;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Options;

namespace CoinPortal.Api.Email;

/// <summary>
/// The secret in a verification link: the user id and the e-mail address, signed by data
/// protection and valid for <see cref="Lifetime"/>. Not Identity's confirmation token, which is
/// bound to the security stamp: signing out renews the stamp, and a link must survive that. Bound
/// to the address, so a link for an earlier address confirms nothing.
/// </summary>
public sealed class EmailVerificationTokens(IDataProtectionProvider provider)
{
    public static readonly TimeSpan Lifetime = TimeSpan.FromHours(24);

    /// <summary>The data protection purpose: a token of another purpose (a cookie) is no link.</summary>
    public const string Purpose = "CoinPortal.EmailVerification";

    private readonly ITimeLimitedDataProtector protector =
        provider.CreateProtector(Purpose).ToTimeLimitedDataProtector();

    /// <summary>URL safe (base64url).</summary>
    public string Create(string userId, string email) => protector.Protect($"{userId}\n{email}", Lifetime);

    /// <summary>The user id and address, or null when the token is forged, damaged or expired.</summary>
    public (string UserId, string Email)? Read(string token)
    {
        try
        {
            var payload = protector.Unprotect(token);
            var at = payload.IndexOf('\n');
            return at < 0 ? null : (payload[..at], payload[(at + 1)..]);
        }
        catch (Exception e) when (e is CryptographicException or FormatException)
        {
            return null;
        }
    }
}

/// <summary>Sends the verification link, in the user's language.</summary>
public sealed class EmailVerification(
    EmailVerificationTokens tokens, IMailSender sender, IOptions<EmailOptions> options)
{
    public Task SendAsync(ApplicationUser user, CancellationToken ct)
    {
        var token = tokens.Create(user.Id, user.Email!);
        var link = $"{options.Value.SiteUrl}/verify-email?token={Uri.EscapeDataString(token)}";
        var mail = EmailTexts.Verification(user.PreferredLanguage, user.FirstName, link,
            (int)EmailVerificationTokens.Lifetime.TotalHours);
        return sender.SendAsync(new MailMessage(user.Email!, $"{user.FirstName} {user.LastName}", mail.Subject,
            mail.Text, mail.Html), ct);
    }
}
