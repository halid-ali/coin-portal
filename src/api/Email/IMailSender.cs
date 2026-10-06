namespace CoinPortal.Api.Email;

/// <summary>
/// Sends one e-mail. The only place that depends on a mail library (MailKit), like
/// IImageProcessor for images: SmtpMailSender on the server, PickupFolderMailSender without an
/// SMTP host. Throws when the message could not be handed over; callers decide whether that
/// fails the request.
/// </summary>
public interface IMailSender
{
    Task SendAsync(MailMessage message, CancellationToken ct);
}

/// <summary>A plain-text e-mail to one recipient.</summary>
public sealed record MailMessage(string ToAddress, string ToName, string Subject, string Body);
