using System.Text.Encodings.Web;
using System.Text.Unicode;

namespace CoinPortal.Api.Email;

/// <summary>
/// E-mail texts in the user's language (ApplicationUser.PreferredLanguage; English when unset).
/// The one place the API writes user-facing text beyond names it creates: an e-mail is composed on
/// the server, not in the browser. A new language (Localization/SupportedLanguages) gets its texts
/// here too; Turkish is the source, like the client's. Every e-mail has a plain-text and an HTML
/// body (EmailHtml) with the same words.
/// </summary>
public static class EmailTexts
{
    public static MailContent Verification(string? language, string name, string link, int hours)
    {
        var t = VerificationTexts(language, name, hours);
        var text = $"""
            {t.Greeting}

            {t.OpenLink}

            {link}

            {t.Validity}
            {t.Ignore}

            CoinVitrine
            """;
        var html = EmailHtml.Page(language, t.Subject,
            EmailHtml.Paragraph(t.Greeting)
            + EmailHtml.Paragraph(t.ClickButton)
            + EmailHtml.Button(link, t.Button)
            + EmailHtml.LinkFallback(t.CopyLink, link)
            + EmailHtml.SmallPrint(t.Validity, t.Ignore));
        return new MailContent(t.Subject, text, html);
    }

    private sealed record VerificationWords(string Subject, string Greeting, string OpenLink, string ClickButton,
        string Button, string CopyLink, string Validity, string Ignore);

    private static VerificationWords VerificationTexts(string? language, string name, int hours) =>
        language switch
        {
            "tr" => new("CoinVitrine: e-posta adresini doğrula",
                $"Merhaba {name},",
                "CoinVitrine hesabının e-posta adresini doğrulamak için bu linki aç:",
                "CoinVitrine hesabının e-posta adresini doğrulamak için butona tıkla:",
                "E-posta adresimi doğrula",
                "Buton çalışmazsa bu linki tarayıcına kopyala:",
                $"Link {hours} saat geçerli. Süresi dolarsa giriş yap ve sitedeki uyarıdan yeni bir link iste.",
                "Bu hesabı sen açmadıysan bu e-postayı yok sayabilirsin."),
            "de" => new("CoinVitrine: Bestätige deine E-Mail-Adresse",
                $"Hallo {name},",
                "um die E-Mail-Adresse deines CoinVitrine-Kontos zu bestätigen, öffne diesen Link:",
                "um die E-Mail-Adresse deines CoinVitrine-Kontos zu bestätigen, klicke auf den Button:",
                "E-Mail-Adresse bestätigen",
                "Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:",
                $"Der Link ist {hours} Stunden gültig. Ist er abgelaufen, melde dich an und fordere über den Hinweis auf der Website einen neuen an.",
                "Wenn du dieses Konto nicht erstellt hast, kannst du diese E-Mail ignorieren."),
            "bg" => new("CoinVitrine: потвърдете имейл адреса си",
                $"Здравейте, {name},",
                "За да потвърдите имейл адреса на акаунта си в CoinVitrine, отворете този линк:",
                "За да потвърдите имейл адреса на акаунта си в CoinVitrine, натиснете бутона:",
                "Потвърждаване на имейл адреса",
                "Ако бутонът не работи, копирайте този линк в браузъра си:",
                $"Линкът е валиден {hours} часа. Ако изтече, влезте в акаунта си и поискайте нов от известието в сайта.",
                "Ако не сте създали този акаунт, можете да пренебрегнете този имейл."),
            _ => new("CoinVitrine: confirm your email address",
                $"Hello {name},",
                "To confirm the email address of your CoinVitrine account, open this link:",
                "To confirm the email address of your CoinVitrine account, click the button:",
                "Confirm email address",
                "If the button does not work, copy this link into your browser:",
                $"The link is valid for {hours} hours. If it expires, sign in and request a new one from the notice on the site.",
                "If you did not create this account, you can ignore this email."),
        };
}

/// <summary>
/// The HTML body of the e-mails: one simple card, inline styles and tables (what mail programs
/// render reliably), no images or other outside resources (blocked by most programs, and they would
/// tell when a message is opened). Every text goes through <see cref="Encode"/>: the user's name
/// is theirs to choose.
/// </summary>
public static class EmailHtml
{
    // The site's default theme in hex (mail programs know no oklch): amber-500 fill with amber-950
    // text, amber-700 links, the logo's dark coin for the name
    private const string Font = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
    private const string Ink = "#1e293b";
    private const string Muted = "#475569";

    private static readonly HtmlEncoder Encoder = HtmlEncoder.Create(UnicodeRanges.All);

    public static string Encode(string value) => Encoder.Encode(value);

    public static string Page(string? language, string title, string content) => $"""
        <!DOCTYPE html>
        <html lang="{Encode(language ?? "en")}">
        <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="color-scheme" content="light">
        <title>{Encode(title)}</title>
        </head>
        <body style="margin:0;padding:0;background:#f1f5f9;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;">
        <tr><td align="center" style="padding:24px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;">
        <tr><td style="padding:28px 32px;font-family:{Font};font-size:16px;line-height:1.5;color:{Ink};">
        <p style="margin:0 0 24px;font-size:20px;font-weight:700;color:#1c1f22;">CoinVitrine</p>
        {content}
        </td></tr>
        </table>
        </td></tr>
        </table>
        </body>
        </html>
        """;

    public static string Paragraph(string text) =>
        $"""<p style="margin:0 0 16px;">{Encode(text)}</p>""" + "\n";

    public static string Button(string href, string label) => $"""
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;">
        <tr><td style="background:#f59e0b;border-radius:8px;">
        <a href="{Encode(href)}" style="display:inline-block;padding:12px 24px;font-family:{Font};font-size:16px;font-weight:600;color:#451a03;text-decoration:none;border-radius:8px;">{Encode(label)}</a>
        </td></tr>
        </table>

        """;

    /// <summary>The link written out, for programs where the button does not work.</summary>
    public static string LinkFallback(string text, string href) => $"""
        <p style="margin:0 0 16px;font-size:14px;color:{Muted};">{Encode(text)}<br>
        <a href="{Encode(href)}" style="color:#b45309;word-break:break-all;">{Encode(href)}</a></p>

        """;

    public static string SmallPrint(params string[] lines) =>
        $"""<p style="margin:24px 0 0;font-size:14px;color:{Muted};">{string.Join("<br>\n", lines.Select(Encode))}</p>""";
}
