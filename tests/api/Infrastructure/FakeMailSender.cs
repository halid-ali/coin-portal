using System.Collections.Concurrent;
using System.Text.RegularExpressions;
using CoinPortal.Api.Email;

namespace CoinPortal.Api.Tests.Infrastructure;

/// <summary>Keeps every e-mail the app sends in memory instead of sending it (one for the whole run).</summary>
public sealed partial class FakeMailSender : IMailSender
{
    private readonly ConcurrentQueue<MailMessage> sent = new();

    /// <summary>When set, sending throws (a mail server that is down).</summary>
    public Func<MailMessage, bool> FailWhen { get; set; } = _ => false;

    public Task SendAsync(MailMessage message, CancellationToken ct)
    {
        if (FailWhen(message))
        {
            throw new IOException("The test mail server is down.");
        }
        sent.Enqueue(message);
        return Task.CompletedTask;
    }

    /// <summary>The messages to this address, oldest first (tests sign up their own addresses).</summary>
    public IReadOnlyList<MailMessage> To(string address) =>
        sent.Where(m => string.Equals(m.ToAddress, address, StringComparison.OrdinalIgnoreCase)).ToList();

    /// <summary>The token of the verification link in the latest message to this address.</summary>
    public string LatestVerificationToken(string address)
    {
        var link = VerificationLink().Match(To(address).Last().Body);
        Assert.True(link.Success, "No verification link in the e-mail.");
        return Uri.UnescapeDataString(link.Groups["token"].Value);
    }

    [GeneratedRegex(@"/verify-email\?token=(?<token>[^\s]+)")]
    private static partial Regex VerificationLink();
}
