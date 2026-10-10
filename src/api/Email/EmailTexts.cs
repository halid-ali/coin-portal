using System.Globalization;
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
    public static MailContent Verification(string? language, string name, string link, TimeSpan validity)
    {
        var t = VerificationTexts(language, name, validity);
        return Compose(language, t.Subject, t.Greeting, intro: null, t.OpenLink, t.ClickButton, t.Button,
            CopyLink(language), link, t.Validity, t.Ignore);
    }

    /// <summary>
    /// Before an unverified account is deleted (Accounts.UnverifiedAccountCleanup): the date, and a
    /// new verification link to keep the account.
    /// </summary>
    public static MailContent DeletionReminder(string? language, string name, string link, DateTime dueUtc,
        TimeSpan validity)
    {
        var v = VerificationTexts(language, name, validity);
        var t = DeletionReminderTexts(language, Date(dueUtc, language));
        return Compose(language, t.Subject, v.Greeting, t.Intro, t.OpenLink, t.ClickButton, v.Button,
            CopyLink(language), link, v.Validity, t.Ignore);
    }

    /// <summary>
    /// The one-time request to accounts from before verification existed: what waits for the address
    /// (at most <paramref name="maxCoins"/> coins) and, when the lifetime is on, the deletion date.
    /// </summary>
    public static MailContent VerificationRequest(string? language, string name, string link, int maxCoins,
        DateTime? dueUtc, TimeSpan validity)
    {
        var v = VerificationTexts(language, name, validity);
        var t = VerificationRequestTexts(language, maxCoins, dueUtc is { } due ? Date(due, language) : null);
        var intro = t.Deletion is null ? t.Intro : $"{t.Intro} {t.Deletion}";
        return Compose(language, t.Subject, v.Greeting, intro, v.OpenLink, v.ClickButton, v.Button,
            CopyLink(language), link, v.Validity);
    }

    /// <summary>
    /// The password reset link (Email.PasswordReset), with the username: someone who forgot the password
    /// may have forgotten that too.
    /// </summary>
    public static MailContent PasswordReset(string? language, string name, string userName, string link,
        TimeSpan validity)
    {
        var v = VerificationTexts(language, name, validity);
        var t = PasswordResetTexts(language, userName, Hours(language, (int)validity.TotalHours));
        return Compose(language, t.Subject, v.Greeting, t.Intro, t.OpenLink, t.ClickButton, t.Button,
            CopyLink(language), link, t.Validity, t.Ignore);
    }

    /// <summary>
    /// After the password changed (Settings, or a reset link): if it was not the owner, the button
    /// leads to "Forgot password" and the address to write to is named.
    /// </summary>
    public static MailContent PasswordChanged(string? language, string name, string userName,
        string forgotPasswordLink, string contactAddress)
    {
        var v = VerificationTexts(language, name, TimeSpan.Zero);
        var t = PasswordChangedTexts(language, userName, contactAddress);
        return Compose(language, t.Subject, v.Greeting, t.Intro, t.OpenLink, t.ClickButton, t.Button,
            CopyLink(language), forgotPasswordLink, t.WasYou, t.Contact);
    }

    /// <summary>
    /// The photo storage passed 75 % (<paramref name="nearlyFull"/> false) or 90 % of the quota
    /// (Photos.StorageWarnings): how much is used, and the button to Settings > Account.
    /// </summary>
    public static MailContent StorageWarning(string? language, string name, bool nearlyFull, long usedBytes,
        long quotaBytes, string link)
    {
        var v = VerificationTexts(language, name, TimeSpan.Zero);
        var t = StorageWarningTexts(language, nearlyFull, Megabytes(usedBytes, language),
            Megabytes(quotaBytes, language));
        string[] smallPrint = nearlyFull ? [t.WhenFull] : [t.WhenFull, t.NextWarning];
        return Compose(language, t.Subject, v.Greeting, t.Intro, t.OpenLink, t.ClickButton, t.Button,
            CopyLink(language), link, smallPrint);
    }

    private static string Date(DateTime utc, string? language) => utc.ToString("d MMMM yyyy", Culture(language));

    /// <summary>"2,4 MB" in the language's number format, like the client's.</summary>
    private static string Megabytes(long bytes, string? language) =>
        $"{(bytes / (1024d * 1024)).ToString("0.#", Culture(language))} MB";

    private static string Hours(string? language, int hours) => language switch
    {
        "tr" => $"{hours} saat",
        "de" => hours == 1 ? "1 Stunde" : $"{hours} Stunden",
        "bg" => hours == 1 ? "1 час" : $"{hours} часа",
        _ => hours == 1 ? "1 hour" : $"{hours} hours",
    };

    /// <summary>"The link is valid for 24 hours" or "for 7 days", then what to do when it expired.</summary>
    private static string Validity(string? language, TimeSpan validity)
    {
        var days = validity.TotalDays >= 2 && validity.TotalDays % 1 == 0 ? (int)validity.TotalDays : (int?)null;
        var hours = (int)validity.TotalHours;
        return language switch
        {
            "tr" => (days is { } d ? $"Link {d} gün geçerli." : $"Link {hours} saat geçerli.")
                + " Süresi dolarsa giriş yap ve sitedeki uyarıdan yeni bir link iste.",
            "de" => (days is { } d ? $"Der Link ist {d} Tage gültig." : $"Der Link ist {hours} Stunden gültig.")
                + " Ist er abgelaufen, melde dich an und fordere über den Hinweis auf der Website einen neuen an.",
            "bg" => (days is { } d ? $"Линкът е валиден {d} дни." : $"Линкът е валиден {hours} часа.")
                + " Ако изтече, влезте в акаунта си и поискайте нов от известието в сайта.",
            _ => (days is { } d ? $"The link is valid for {d} days." : $"The link is valid for {hours} hours.")
                + " If it expires, sign in and request a new one from the notice on the site.",
        };
    }

    private static MailContent Compose(string? language, string subject, string greeting, string? intro,
        string openLink, string clickButton, string button, string copyLink, string link, params string[] smallPrint)
    {
        var lead = intro is null ? "" : $"{intro}\n\n";
        var text = $"{greeting}\n\n{lead}{openLink}\n\n{link}\n\n{string.Join("\n", smallPrint)}\n\nCoinVitrine";
        var html = EmailHtml.Page(language, subject,
            EmailHtml.Paragraph(greeting)
            + (intro is null ? "" : EmailHtml.Paragraph(intro))
            + EmailHtml.Paragraph(clickButton)
            + EmailHtml.Button(link, button)
            + EmailHtml.LinkFallback(copyLink, link)
            + EmailHtml.SmallPrint(smallPrint));
        return new MailContent(subject, text, html);
    }

    private static CultureInfo Culture(string? language) => CultureInfo.GetCultureInfo(language switch
    {
        "tr" => "tr-TR",
        "de" => "de-DE",
        "bg" => "bg-BG",
        _ => "en-GB",
    });

    private static string CopyLink(string? language) => language switch
    {
        "tr" => "Buton çalışmazsa bu linki tarayıcına kopyala:",
        "de" => "Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:",
        "bg" => "Ако бутонът не работи, копирайте този линк в браузъра си:",
        _ => "If the button does not work, copy this link into your browser:",
    };

    private sealed record VerificationWords(string Subject, string Greeting, string OpenLink, string ClickButton,
        string Button, string Validity, string Ignore);

    private static VerificationWords VerificationTexts(string? language, string name, TimeSpan validity) =>
        language switch
        {
            "tr" => new("CoinVitrine: e-posta adresini doğrula",
                $"Merhaba {name},",
                "CoinVitrine hesabının e-posta adresini doğrulamak için bu linki aç:",
                "CoinVitrine hesabının e-posta adresini doğrulamak için butona tıkla:",
                "E-posta adresimi doğrula",
                Validity(language, validity),
                "Bu hesabı sen açmadıysan bu e-postayı yok sayabilirsin."),
            "de" => new("CoinVitrine: Bestätige deine E-Mail-Adresse",
                $"Hallo {name},",
                "um die E-Mail-Adresse deines CoinVitrine-Kontos zu bestätigen, öffne diesen Link:",
                "um die E-Mail-Adresse deines CoinVitrine-Kontos zu bestätigen, klicke auf den Button:",
                "E-Mail-Adresse bestätigen",
                Validity(language, validity),
                "Wenn du dieses Konto nicht erstellt hast, kannst du diese E-Mail ignorieren."),
            "bg" => new("CoinVitrine: потвърдете имейл адреса си",
                $"Здравейте, {name},",
                "За да потвърдите имейл адреса на акаунта си в CoinVitrine, отворете този линк:",
                "За да потвърдите имейл адреса на акаунта си в CoinVitrine, натиснете бутона:",
                "Потвърждаване на имейл адреса",
                Validity(language, validity),
                "Ако не сте създали този акаунт, можете да пренебрегнете този имейл."),
            _ => new("CoinVitrine: confirm your email address",
                $"Hello {name},",
                "To confirm the email address of your CoinVitrine account, open this link:",
                "To confirm the email address of your CoinVitrine account, click the button:",
                "Confirm email address",
                Validity(language, validity),
                "If you did not create this account, you can ignore this email."),
        };

    private sealed record VerificationRequestWords(string Subject, string Intro, string? Deletion);

    private static VerificationRequestWords VerificationRequestTexts(string? language, int maxCoins, string? date) =>
        language switch
        {
            "tr" => new("CoinVitrine artık e-posta doğrulaması istiyor",
                $"CoinVitrine artık hesapların e-posta adresinin doğrulanmasını istiyor. Doğrulayana kadar yeni koleksiyon açamaz ve koleksiyon paylaşamazsın; hesabında en fazla {maxCoins} coin olabilir.",
                date is null ? null : $"Doğrulamazsan hesabın {date} tarihinde koleksiyonları, coin'leri ve fotoğraflarıyla birlikte silinecek."),
            "de" => new("CoinVitrine bittet jetzt um die Bestätigung deiner E-Mail-Adresse",
                $"CoinVitrine bittet jetzt bei jedem Konto um die Bestätigung der E-Mail-Adresse. Bis dahin kannst du keine neuen Sammlungen anlegen und keine Sammlungen teilen, und dein Konto kann höchstens {maxCoins} Münzen haben.",
                date is null ? null : $"Wenn du sie nicht bestätigst, wird dein Konto am {date} mit seinen Sammlungen, Münzen und Fotos gelöscht."),
            "bg" => new("CoinVitrine вече изисква потвърждение на имейл адреса",
                $"CoinVitrine вече изисква потвърждение на имейл адреса на всеки акаунт. Дотогава не можете да създавате нови колекции и да споделяте колекции, а акаунтът ви може да има най-много {maxCoins} монети.",
                date is null ? null : $"Ако не го потвърдите, акаунтът ви ще бъде изтрит на {date} заедно с колекциите, монетите и снимките си."),
            _ => new("CoinVitrine now asks you to confirm your email address",
                $"CoinVitrine now asks every account to confirm its email address. Until you do, you cannot open new collections or share collections, and your account can hold at most {maxCoins} coins.",
                date is null ? null : $"If you do not confirm it, your account will be deleted on {date}, with its collections, coins and photos."),
        };

    private sealed record PasswordResetWords(string Subject, string Intro, string OpenLink, string ClickButton,
        string Button, string Validity, string Ignore);

    // The page names match the client's link text (login.forgotPassword)
    private static PasswordResetWords PasswordResetTexts(string? language, string userName, string hours) =>
        language switch
        {
            "tr" => new("CoinVitrine: parolanı yenile",
                $"CoinVitrine hesabın için parola yenileme istendi. Kullanıcı adın: {userName}",
                "Yeni bir parola belirlemek için bu linki aç:",
                "Yeni bir parola belirlemek için butona tıkla:",
                "Yeni parola belirle",
                $"Link {hours} geçerli ve bir kez kullanılabilir. Süresi dolarsa sitedeki \"Parolamı unuttum\" linkinden yeni bir link iste.",
                "Bu isteği sen yapmadıysan bu e-postayı yok sayabilirsin, parolan değişmez."),
            "de" => new("CoinVitrine: Setze dein Passwort zurück",
                $"für dein CoinVitrine-Konto wurde ein neues Passwort angefordert. Dein Benutzername: {userName}",
                "Um ein neues Passwort festzulegen, öffne diesen Link:",
                "Um ein neues Passwort festzulegen, klicke auf den Button:",
                "Neues Passwort festlegen",
                $"Der Link ist {hours} gültig und kann einmal verwendet werden. Ist er abgelaufen, fordere über \"Passwort vergessen?\" auf der Website einen neuen an.",
                "Wenn du das nicht angefordert hast, kannst du diese E-Mail ignorieren. Dein Passwort bleibt unverändert."),
            "bg" => new("CoinVitrine: подновете паролата си",
                $"Поискано е подновяване на паролата за акаунта ви в CoinVitrine. Вашето потребителско име: {userName}",
                "За да зададете нова парола, отворете този линк:",
                "За да зададете нова парола, натиснете бутона:",
                "Задаване на нова парола",
                $"Линкът е валиден {hours} и може да се използва веднъж. Ако изтече, поискайте нов чрез \"Забравена парола?\" в сайта.",
                "Ако не сте поискали това, можете да пренебрегнете този имейл. Паролата ви остава същата."),
            _ => new("CoinVitrine: reset your password",
                $"A new password was requested for your CoinVitrine account. Your username: {userName}",
                "To choose a new password, open this link:",
                "To choose a new password, click the button:",
                "Choose a new password",
                $"The link is valid for {hours} and can be used once. If it expires, request a new one with \"Forgot password?\" on the site.",
                "If you did not ask for this, you can ignore this email. Your password stays the same."),
        };

    private sealed record PasswordChangedWords(string Subject, string Intro, string OpenLink, string ClickButton,
        string Button, string WasYou, string Contact);

    private static PasswordChangedWords PasswordChangedTexts(string? language, string userName, string contact) =>
        language switch
        {
            "tr" => new("CoinVitrine: parolan değişti",
                $"CoinVitrine hesabının ({userName}) parolası değiştirildi. Diğer cihazlardaki oturumlar kapandı.",
                "Bu değişikliği sen yapmadıysan hemen bu linki açıp yeni bir parola belirle:",
                "Bu değişikliği sen yapmadıysan hemen yeni bir parola belirle:",
                "Parolamı yenile",
                "Bu değişikliği sen yaptıysan bir şey yapmana gerek yok.",
                $"Bir sorun varsa {contact} adresine yaz."),
            "de" => new("CoinVitrine: Dein Passwort wurde geändert",
                $"das Passwort deines CoinVitrine-Kontos ({userName}) wurde geändert. Sitzungen auf anderen Geräten wurden beendet.",
                "Wenn du das nicht warst, öffne sofort diesen Link und lege ein neues Passwort fest:",
                "Wenn du das nicht warst, lege sofort ein neues Passwort fest:",
                "Passwort zurücksetzen",
                "Wenn du es selbst geändert hast, musst du nichts tun.",
                $"Bei Problemen schreib an {contact}."),
            "bg" => new("CoinVitrine: паролата ви е променена",
                $"Паролата на акаунта ви в CoinVitrine ({userName}) е променена. Сесиите на други устройства са прекратени.",
                "Ако не сте го направили вие, веднага отворете този линк и задайте нова парола:",
                "Ако не сте го направили вие, веднага задайте нова парола:",
                "Подновяване на паролата",
                "Ако промяната е ваша, не е нужно да правите нищо.",
                $"При проблем пишете на {contact}."),
            _ => new("CoinVitrine: your password was changed",
                $"The password of your CoinVitrine account ({userName}) was changed. Sessions on other devices were ended.",
                "If this was not you, open this link right away and choose a new password:",
                "If this was not you, choose a new password right away:",
                "Reset my password",
                "If you changed it yourself, you do not need to do anything.",
                $"If something is wrong, write to {contact}."),
        };

    private sealed record StorageWarningWords(string Subject, string Intro, string OpenLink, string ClickButton,
        string Button, string WhenFull, string NextWarning);

    // The storage's name matches the client's (settings.account.storage.title)
    private static StorageWarningWords StorageWarningTexts(string? language, bool nearlyFull, string used,
        string quota) =>
        language switch
        {
            "tr" => new(nearlyFull ? "CoinVitrine: fotoğraf alanın dolmak üzere" : "CoinVitrine: fotoğraf alanının %75'i doldu",
                nearlyFull
                    ? $"Fotoğraf alanının %90'ından fazlasını kullanıyorsun: {used} / {quota}."
                    : $"Fotoğraf alanının %75'inden fazlasını kullanıyorsun: {used} / {quota}.",
                "Fotoğraf alanını Ayarlar'da görmek için bu linki aç:",
                "Ne kadar yer kaldığını Ayarlar'da görebilirsin:",
                "Fotoğraf alanına bak",
                "Alan dolunca yer açana kadar yeni fotoğraf yükleyemezsin. Kullanmadığın fotoğrafları ve kapakları silerek yer açabilirsin.",
                "Alanın %90'ı dolunca bir uyarı daha göndereceğiz."),
            "de" => new(nearlyFull ? "CoinVitrine: Dein Fotospeicher ist fast voll" : "CoinVitrine: 75 % deines Fotospeichers sind belegt",
                nearlyFull
                    ? $"du nutzt mehr als 90 % deines Fotospeichers: {used} von {quota}."
                    : $"du nutzt mehr als 75 % deines Fotospeichers: {used} von {quota}.",
                "Um deinen Fotospeicher in den Einstellungen zu sehen, öffne diesen Link:",
                "Wie viel Platz noch frei ist, siehst du in den Einstellungen:",
                "Fotospeicher ansehen",
                "Ist er voll, kannst du erst wieder Fotos hochladen, wenn du Platz schaffst. Lösche dafür Fotos und Titelbilder, die du nicht mehr brauchst.",
                "Bei 90 % schreiben wir dir noch einmal."),
            "bg" => new(nearlyFull ? "CoinVitrine: мястото ви за снимки е почти запълнено" : "CoinVitrine: 75% от мястото ви за снимки е използвано",
                nearlyFull
                    ? $"Използвате над 90% от мястото си за снимки: {used} от {quota}."
                    : $"Използвате над 75% от мястото си за снимки: {used} от {quota}.",
                "За да видите мястото си за снимки в настройките, отворете този линк:",
                "Колко място остава, можете да видите в настройките:",
                "Към мястото за снимки",
                "Когато се запълни, не можете да качвате нови снимки, докато не освободите място. Изтрийте снимки и корици, които не ви трябват.",
                "Ще ви пишем още веднъж, когато се използват 90%."),
            _ => new(nearlyFull ? "CoinVitrine: your photo storage is nearly full" : "CoinVitrine: 75% of your photo storage is used",
                nearlyFull
                    ? $"You are using more than 90% of your photo storage: {used} of {quota}."
                    : $"You are using more than 75% of your photo storage: {used} of {quota}.",
                "To see your photo storage in Settings, open this link:",
                "You can see how much space is left in Settings:",
                "View photo storage",
                "Once it is full, you cannot upload new photos until you free up space. Delete photos and covers you no longer need.",
                "We will write once more when 90% is used."),
        };

    private sealed record DeletionReminderWords(string Subject, string Intro, string OpenLink, string ClickButton,
        string Ignore);

    private static DeletionReminderWords DeletionReminderTexts(string? language, string date) =>
        language switch
        {
            "tr" => new($"CoinVitrine: hesabın {date} tarihinde silinecek",
                $"CoinVitrine hesabının e-posta adresi henüz doğrulanmadı. Doğrulanmayan hesaplar bir süre sonra silinir: hesabın {date} tarihinde koleksiyonları, coin'leri ve fotoğraflarıyla birlikte silinecek.",
                "Hesabını korumak için bu linki aç ve e-posta adresini doğrula:",
                "Hesabını korumak için e-posta adresini doğrula:",
                "Hesabı artık istemiyorsan bir şey yapmana gerek yok."),
            "de" => new($"CoinVitrine: Dein Konto wird am {date} gelöscht",
                $"die E-Mail-Adresse deines CoinVitrine-Kontos ist noch nicht bestätigt. Unbestätigte Konten werden nach einer Weile gelöscht: Dein Konto wird am {date} mit seinen Sammlungen, Münzen und Fotos gelöscht.",
                "Um dein Konto zu behalten, öffne diesen Link und bestätige deine E-Mail-Adresse:",
                "Um dein Konto zu behalten, bestätige deine E-Mail-Adresse:",
                "Wenn du das Konto nicht mehr möchtest, musst du nichts tun."),
            "bg" => new($"CoinVitrine: акаунтът ви ще бъде изтрит на {date}",
                $"Имейл адресът на акаунта ви в CoinVitrine все още не е потвърден. Непотвърдените акаунти се изтриват след известно време: акаунтът ви ще бъде изтрит на {date} заедно с колекциите, монетите и снимките си.",
                "За да запазите акаунта си, отворете този линк и потвърдете имейл адреса си:",
                "За да запазите акаунта си, потвърдете имейл адреса си:",
                "Ако вече не искате акаунта, не е нужно да правите нищо."),
            _ => new($"CoinVitrine: your account will be deleted on {date}",
                $"The email address of your CoinVitrine account has not been confirmed yet. Unconfirmed accounts are deleted after a while: your account will be deleted on {date}, with its collections, coins and photos.",
                "To keep your account, open this link and confirm your email address:",
                "To keep your account, confirm your email address:",
                "If you no longer want the account, you do not need to do anything."),
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
