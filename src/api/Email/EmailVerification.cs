using System.Security.Cryptography;
using CoinPortal.Api.Data;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Options;

namespace CoinPortal.Api.Email;

/// <summary>
/// The secret in a verification link: the user id and the e-mail address, signed by data
/// protection and valid for <see cref="Lifetime"/> (<see cref="LongLifetime"/> in e-mails people may
/// open days later: the reminder and the one-time request). Not Identity's confirmation token, which is
/// bound to the security stamp: signing out renews the stamp, and a link must survive that. Bound
/// to the address, so a link for an earlier address confirms nothing.
/// </summary>
public sealed class EmailVerificationTokens(IDataProtectionProvider provider)
{
    public static readonly TimeSpan Lifetime = TimeSpan.FromHours(24);

    /// <summary>For the deletion reminder and the one-time request (user decision 2026-10-07).</summary>
    public static readonly TimeSpan LongLifetime = TimeSpan.FromDays(7);

    /// <summary>The data protection purpose: a token of another purpose (a cookie) is no link.</summary>
    public const string Purpose = "CoinPortal.EmailVerification";

    private readonly ITimeLimitedDataProtector protector =
        provider.CreateProtector(Purpose).ToTimeLimitedDataProtector();

    /// <summary>URL safe (base64url).</summary>
    public string Create(string userId, string email, TimeSpan? lifetime = null) =>
        protector.Protect($"{userId}\n{email}", lifetime ?? Lifetime);

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
    private static readonly TimeSpan Short = EmailVerificationTokens.Lifetime;
    private static readonly TimeSpan Long = EmailVerificationTokens.LongLifetime;

    public Task SendAsync(ApplicationUser user, CancellationToken ct) =>
        SendAsync(user, EmailTexts.Verification(user.PreferredLanguage, user.FirstName, Link(user, Short), Short), ct);

    /// <summary>The account will be deleted at <paramref name="dueUtc"/> unless the link is used.</summary>
    public Task SendDeletionReminderAsync(ApplicationUser user, DateTime dueUtc, CancellationToken ct) =>
        SendAsync(user, EmailTexts.DeletionReminder(user.PreferredLanguage, user.FirstName, Link(user, Long), dueUtc,
            Long), ct);

    /// <summary>
    /// The one-time request to accounts from before verification existed (Accounts.VerificationRequests):
    /// what waits for the address, and the deletion date when the lifetime is on.
    /// </summary>
    public Task SendVerificationRequestAsync(ApplicationUser user, int maxCoins, DateTime? dueUtc,
        CancellationToken ct) =>
        SendAsync(user, EmailTexts.VerificationRequest(user.PreferredLanguage, user.FirstName, Link(user, Long),
            maxCoins, dueUtc, Long), ct);

    private string Link(ApplicationUser user, TimeSpan lifetime) =>
        $"{options.Value.SiteUrl}/verify-email?token={Uri.EscapeDataString(tokens.Create(user.Id, user.Email!, lifetime))}";

    private Task SendAsync(ApplicationUser user, MailContent mail, CancellationToken ct) =>
        sender.SendAsync(new MailMessage(user.Email!, $"{user.FirstName} {user.LastName}", mail.Subject,
            mail.Text, mail.Html), ct);
}
