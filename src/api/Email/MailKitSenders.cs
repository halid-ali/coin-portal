using MailKit.Net.Smtp;
using MailKit.Security;
using Microsoft.Extensions.Options;
using MimeKit;

namespace CoinPortal.Api.Email;

/// <summary>Sends through the configured SMTP server (Email:Smtp), one connection per message.</summary>
public sealed class SmtpMailSender(IOptions<EmailOptions> options) : IMailSender
{
    public async Task SendAsync(MailMessage message, CancellationToken ct)
    {
        var settings = options.Value;
        var smtp = settings.Smtp;
        using var client = new SmtpClient { Timeout = smtp.TimeoutSeconds * 1000 };
        // Chosen only when a host is set (Program.cs)
        await client.ConnectAsync(smtp.Host!, smtp.Port, smtp.Security switch
        {
            SmtpSecurity.SslOnConnect => SecureSocketOptions.SslOnConnect,
            SmtpSecurity.None => SecureSocketOptions.None,
            _ => SecureSocketOptions.StartTls,
        }, ct);
        if (!string.IsNullOrEmpty(smtp.UserName))
        {
            await client.AuthenticateAsync(smtp.UserName, smtp.Password ?? string.Empty, ct);
        }
        await client.SendAsync(MimeMessages.Create(settings, message), ct);
        await client.DisconnectAsync(quit: true, ct);
    }
}

/// <summary>
/// Writes each message as an .eml file to Email:PickupPath instead of sending it: open it in a
/// mail program or read the link from the file (development, e2e).
/// </summary>
public sealed class PickupFolderMailSender(IOptions<EmailOptions> options, IWebHostEnvironment env) : IMailSender
{
    public string Folder { get; } = Path.GetFullPath(Path.Combine(env.ContentRootPath, options.Value.PickupPath));

    public async Task SendAsync(MailMessage message, CancellationToken ct)
    {
        Directory.CreateDirectory(Folder);
        // Sortable by time; the GUID keeps two messages of the same millisecond apart
        var file = Path.Combine(Folder, $"{DateTime.UtcNow:yyyyMMdd-HHmmssfff}-{Guid.NewGuid():N}.eml");
        await MimeMessages.Create(options.Value, message).WriteToAsync(file, ct);
    }
}

internal static class MimeMessages
{
    public static MimeMessage Create(EmailOptions settings, MailMessage message)
    {
        var mime = new MimeMessage();
        mime.From.Add(new MailboxAddress(settings.FromName, settings.FromAddress));
        mime.To.Add(new MailboxAddress(message.ToName, message.ToAddress));
        mime.Subject = message.Subject;
        // multipart/alternative when there is HTML: the program shows the best part it can
        mime.Body = new BodyBuilder { TextBody = message.Body, HtmlBody = message.HtmlBody }.ToMessageBody();
        return mime;
    }
}
