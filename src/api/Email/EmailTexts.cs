namespace CoinPortal.Api.Email;

/// <summary>
/// E-mail texts in the user's language (ApplicationUser.PreferredLanguage; English when unset).
/// The one place the API writes user-facing text beyond names it creates: an e-mail is composed on
/// the server, not in the browser. A new language (Localization/SupportedLanguages) gets its texts
/// here too; Turkish is the source, like the client's.
/// </summary>
public static class EmailTexts
{
    public static (string Subject, string Body) Verification(string? language, string name, string link, int hours) =>
        language switch
        {
            "tr" => ("CoinVitrine: e-posta adresini doğrula",
                $"""
                Merhaba {name},

                CoinVitrine hesabının e-posta adresini doğrulamak için bu linki aç:

                {link}

                Link {hours} saat geçerli. Süresi dolarsa giriş yap ve sitedeki uyarıdan yeni bir link iste.
                Bu hesabı sen açmadıysan bu e-postayı yok sayabilirsin.

                CoinVitrine
                """),
            "de" => ("CoinVitrine: Bestätige deine E-Mail-Adresse",
                $"""
                Hallo {name},

                um die E-Mail-Adresse deines CoinVitrine-Kontos zu bestätigen, öffne diesen Link:

                {link}

                Der Link ist {hours} Stunden gültig. Ist er abgelaufen, melde dich an und fordere über den Hinweis auf der Website einen neuen an.
                Wenn du dieses Konto nicht erstellt hast, kannst du diese E-Mail ignorieren.

                CoinVitrine
                """),
            "bg" => ("CoinVitrine: потвърдете имейл адреса си",
                $"""
                Здравейте, {name},

                За да потвърдите имейл адреса на акаунта си в CoinVitrine, отворете този линк:

                {link}

                Линкът е валиден {hours} часа. Ако изтече, влезте в акаунта си и поискайте нов от известието в сайта.
                Ако не сте създали този акаунт, можете да пренебрегнете този имейл.

                CoinVitrine
                """),
            _ => ("CoinVitrine: confirm your email address",
                $"""
                Hello {name},

                To confirm the email address of your CoinVitrine account, open this link:

                {link}

                The link is valid for {hours} hours. If it expires, sign in and request a new one from the notice on the site.
                If you did not create this account, you can ignore this email.

                CoinVitrine
                """),
        };
}
