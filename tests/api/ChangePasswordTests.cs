using System.Net;
using CoinPortal.Api.Contracts.Auth;
using CoinPortal.Api.Tests.Infrastructure;

namespace CoinPortal.Api.Tests;

/// <summary>
/// Settings > Security: a new password with the current one. This session stays, the others end,
/// and the owner hears of it by e-mail.
/// </summary>
public class ChangePasswordTests(CoinPortalFactory factory)
{
    private const string NewPassword = "Newpass456";

    [Fact]
    public async Task Change_KeepsThisSession_EndsTheOthers_AndTellsTheOwner()
    {
        var alice = await factory.SignUpAsync("tr");
        using var phone = await factory.CreateAnonymousClientAsync();
        using (var login = await phone.LoginAsync(alice.UserName, TestUser.Password))
        {
            await login.ShouldHaveStatusAsync(HttpStatusCode.OK);
        }

        using var change = await alice.Client.PostAsync("/api/auth/change-password",
            new ChangePasswordRequest(TestUser.Password, NewPassword));

        await change.ShouldHaveStatusAsync(HttpStatusCode.NoContent);
        // This one goes on, writes included (the antiforgery token still fits)
        await alice.Client.ExpectStatusAsync("/api/auth/me", HttpStatusCode.OK);
        await alice.CreateCollectionAsync();
        await phone.ExpectStatusAsync("/api/auth/me", HttpStatusCode.Unauthorized);
        using var visitor = await factory.CreateAnonymousClientAsync();
        using var oldPassword = await visitor.LoginAsync(alice.UserName, TestUser.Password);
        await oldPassword.ShouldHaveStatusAsync(HttpStatusCode.Unauthorized);
        using var newPassword = await visitor.LoginAsync(alice.UserName, NewPassword);
        await newPassword.ShouldHaveStatusAsync(HttpStatusCode.OK);

        var mail = factory.Mail.To(alice.User.Email).Last();
        Assert.Contains("parolan değişti", mail.Subject);
        Assert.Contains(alice.UserName, mail.Body);
        Assert.Contains($"{CoinPortalFactory.SiteUrl}/forgot-password", mail.Body);
        Assert.Contains($"""<a href="{CoinPortalFactory.SiteUrl}/forgot-password""", mail.HtmlBody);
    }

    [Fact]
    public async Task WrongCurrentPassword_IsAFieldError_AndChangesNothing()
    {
        var alice = await factory.SignUpAsync();
        var mails = factory.Mail.To(alice.User.Email).Count;

        using var response = await alice.Client.PostAsync("/api/auth/change-password",
            new ChangePasswordRequest("Wrongpass1", NewPassword));

        await response.ShouldHaveStatusAsync(HttpStatusCode.BadRequest);
        Assert.Equal(["PasswordMismatch"], await response.ReadValidationKeysAsync());
        Assert.Equal(mails, factory.Mail.To(alice.User.Email).Count);
        using var visitor = await factory.CreateAnonymousClientAsync();
        using var login = await visitor.LoginAsync(alice.UserName, TestUser.Password);
        await login.ShouldHaveStatusAsync(HttpStatusCode.OK);
    }

    [Fact]
    public async Task WeakNewPassword_IsRejectedByField()
    {
        var alice = await factory.SignUpAsync();

        using var noUpper = await alice.Client.PostAsync("/api/auth/change-password",
            new ChangePasswordRequest(TestUser.Password, "newpass456"));
        using var tooShort = await alice.Client.PostAsync("/api/auth/change-password",
            new ChangePasswordRequest(TestUser.Password, "Np4"));
        using var empty = await alice.Client.PostAsync("/api/auth/change-password",
            new ChangePasswordRequest("", NewPassword));

        Assert.Contains("PasswordRequiresUpper", await noUpper.ReadValidationKeysAsync(),
            StringComparer.OrdinalIgnoreCase);
        Assert.Contains("NewPassword", await tooShort.ReadValidationKeysAsync(), StringComparer.OrdinalIgnoreCase);
        Assert.Contains("CurrentPassword", await empty.ReadValidationKeysAsync(), StringComparer.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task MailServerDown_ThePasswordChangesAnyway()
    {
        var userName = "c" + Guid.NewGuid().ToString("N")[..12];
        var alice = await factory.SignUpAsync(userName: userName);
        factory.Mail.FailWhen = m => m.ToAddress.StartsWith(userName + "@", StringComparison.Ordinal);
        try
        {
            using var change = await alice.Client.PostAsync("/api/auth/change-password",
                new ChangePasswordRequest(TestUser.Password, NewPassword));

            await change.ShouldHaveStatusAsync(HttpStatusCode.NoContent);
        }
        finally
        {
            factory.Mail.FailWhen = _ => false;
        }
        using var visitor = await factory.CreateAnonymousClientAsync();
        using var login = await visitor.LoginAsync(alice.UserName, NewPassword);
        await login.ShouldHaveStatusAsync(HttpStatusCode.OK);
    }
}
