using System.Net;
using CoinPortal.Api.Contracts.Auth;
using CoinPortal.Api.Email;
using CoinPortal.Api.Tests.Infrastructure;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CoinPortal.Api.Tests;

/// <summary>
/// "Forgot password": the link by e-mail (sent in the background, the same answer for every
/// account), checking it, and setting the new password with it.
/// </summary>
public class PasswordResetTests(CoinPortalFactory factory)
{
    private const string NewPassword = "Newpass456";

    [Theory]
    [InlineData("tr", null, "parolanı yenile")]
    [InlineData("de", "en", "Passwort")] // the account's language wins
    [InlineData("bg", null, "паролата")]
    [InlineData(null, "de", "Passwort")] // never chose one: the page's
    [InlineData(null, null, "reset your password")]
    public async Task ForgotPassword_SendsALink_WithTheUserName_InTheUsersLanguage(
        string? accountLanguage, string? pageLanguage, string subjectWord)
    {
        var alice = await factory.SignUpAsync(accountLanguage);
        using var visitor = await factory.CreateAnonymousClientAsync();

        using var response = await visitor.PostAsync("/api/auth/forgot-password",
            new ForgotPasswordRequest(alice.User.Email, pageLanguage));

        await response.ShouldHaveStatusAsync(HttpStatusCode.NoContent);
        var mail = (await factory.Mail.WaitForAsync(alice.User.Email, 2)).Last(); // after the sign-up's
        Assert.Contains(subjectWord, mail.Subject);
        Assert.Contains($"{CoinPortalFactory.SiteUrl}/reset-password?token=", mail.Body);
        Assert.Contains(alice.UserName, mail.Body);
        Assert.NotNull(mail.HtmlBody);
        Assert.Contains($"""<a href="{CoinPortalFactory.SiteUrl}/reset-password?token=""", mail.HtmlBody);
        Assert.Contains(alice.UserName, mail.HtmlBody);
    }

    [Fact]
    public async Task ForgotPassword_ByUserName_SendsTheSameLink()
    {
        var alice = await factory.SignUpAsync();
        using var visitor = await factory.CreateAnonymousClientAsync();

        using var response = await visitor.PostAsync("/api/auth/forgot-password",
            new ForgotPasswordRequest($" {alice.UserName} "));

        await response.ShouldHaveStatusAsync(HttpStatusCode.NoContent);
        await factory.Mail.WaitForAsync(alice.User.Email, 2);
        Assert.NotEmpty(factory.Mail.LatestResetToken(alice.User.Email));
    }

    [Fact]
    public async Task UnknownLockedAndFloodedAccounts_GetTheSameAnswer_ButNoLink()
    {
        var locked = await factory.SignUpAsync();
        await factory.WithDbAsync(db => db.Users.Where(u => u.Id == locked.User.Id)
            .ExecuteUpdateAsync(s => s.SetProperty(u => u.LockedAtUtc, DateTime.UtcNow)));
        var flooded = await factory.SignUpAsync();
        var control = await factory.SignUpAsync();
        using var visitor = await factory.CreateAnonymousClientAsync();

        var requests = new List<string> { "nobody" + Guid.NewGuid().ToString("N")[..10], "nobody@example.test",
            locked.UserName };
        // The default limit: three links per ten minutes and account
        requests.AddRange(Enumerable.Repeat(flooded.UserName, 4));
        foreach (var userNameOrEmail in requests)
        {
            using var response = await visitor.PostAsync("/api/auth/forgot-password",
                new ForgotPasswordRequest(userNameOrEmail));
            await response.ShouldHaveStatusAsync(HttpStatusCode.NoContent);
        }
        // Sent in order: once the control's link is out, the others were handled
        using var last = await visitor.PostAsync("/api/auth/forgot-password", new ForgotPasswordRequest(control.UserName));
        await factory.Mail.WaitForAsync(control.User.Email, 2);

        Assert.Single(factory.Mail.To(locked.User.Email)); // the sign-up's only
        Assert.Equal(1 + 3, factory.Mail.To(flooded.User.Email).Count);
    }

    [Fact]
    public async Task Link_ShowsTheUserName_SetsThePassword_EndsSessions_AndConfirmsTheAddress()
    {
        var alice = await factory.SignUpAsync(confirmEmail: false);
        var token = await RequestLinkAsync(alice);
        using var visitor = await factory.CreateAnonymousClientAsync();

        using var check = await visitor.PostAsync("/api/auth/reset-password/check", new PasswordResetCheckRequest(token));
        using var reset = await visitor.PostAsync("/api/auth/reset-password", new ResetPasswordRequest(token, NewPassword));

        Assert.Equal(alice.UserName, (await check.ReadJsonAsync<PasswordResetCheckResponse>()).UserName);
        await reset.ShouldHaveStatusAsync(HttpStatusCode.NoContent);
        // The old session is over (a new security stamp), the old password too
        await alice.Client.ExpectStatusAsync("/api/auth/me", HttpStatusCode.Unauthorized);
        using var oldPassword = await visitor.LoginAsync(alice.UserName, TestUser.Password);
        await oldPassword.ShouldHaveStatusAsync(HttpStatusCode.Unauthorized);
        using var login = await visitor.LoginAsync(alice.UserName, NewPassword);
        Assert.True((await login.ReadJsonAsync<UserResponse>()).EmailConfirmed);

        // Once
        using var checkAgain = await visitor.PostAsync("/api/auth/reset-password/check",
            new PasswordResetCheckRequest(token));
        using var again = await visitor.PostAsync("/api/auth/reset-password", new ResetPasswordRequest(token, "Other789x"));
        Assert.Equal("invalid_token", await checkAgain.ReadProblemCodeAsync());
        Assert.Equal("invalid_token", await again.ReadProblemCodeAsync());
    }

    [Fact]
    public async Task Reset_LiftsTheTemporaryLockout()
    {
        var alice = await factory.SignUpAsync();
        using var visitor = await factory.CreateAnonymousClientAsync();
        for (var i = 0; i < 5; i++)
        {
            using var wrong = await visitor.LoginAsync(alice.UserName, "Wrongpass1");
        }
        using var locked = await visitor.LoginAsync(alice.UserName, TestUser.Password);
        await locked.ShouldHaveStatusAsync(HttpStatusCode.Locked);

        var token = await RequestLinkAsync(alice);
        using var reset = await visitor.PostAsync("/api/auth/reset-password", new ResetPasswordRequest(token, NewPassword));
        using var login = await visitor.LoginAsync(alice.UserName, NewPassword);

        await reset.ShouldHaveStatusAsync(HttpStatusCode.NoContent);
        await login.ShouldHaveStatusAsync(HttpStatusCode.OK);
    }

    [Fact]
    public async Task WeakPassword_IsRejectedByField_AndTheLinkStillWorks()
    {
        var alice = await factory.SignUpAsync();
        var token = await RequestLinkAsync(alice);
        using var visitor = await factory.CreateAnonymousClientAsync();

        using var noUpper = await visitor.PostAsync("/api/auth/reset-password", new ResetPasswordRequest(token, "newpass456"));
        using var tooShort = await visitor.PostAsync("/api/auth/reset-password", new ResetPasswordRequest(token, "Np4"));
        using var strong = await visitor.PostAsync("/api/auth/reset-password", new ResetPasswordRequest(token, NewPassword));

        await noUpper.ShouldHaveStatusAsync(HttpStatusCode.BadRequest);
        Assert.Contains("PasswordRequiresUpper", await noUpper.ReadValidationKeysAsync(), StringComparer.OrdinalIgnoreCase);
        Assert.Contains("NewPassword", await tooShort.ReadValidationKeysAsync(), StringComparer.OrdinalIgnoreCase);
        await strong.ShouldHaveStatusAsync(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task InvalidLinks_AreRejected_AndChangeNothing()
    {
        var alice = await factory.SignUpAsync();
        var token = await RequestLinkAsync(alice);
        var stamp = await factory.WithDbAsync(db =>
            db.Users.Where(u => u.Id == alice.User.Id).Select(u => u.SecurityStamp!).SingleAsync());
        var tokens = factory.Services.GetRequiredService<PasswordResetTokens>();
        var expired = factory.Services.GetRequiredService<IDataProtectionProvider>()
            .CreateProtector(PasswordResetTokens.Purpose).ToTimeLimitedDataProtector()
            .Protect($"{alice.User.Id}\n{alice.User.Email}\n{stamp}", DateTimeOffset.UtcNow.AddMinutes(-1));
        var bob = await factory.SignUpAsync();
        var bobsToken = await RequestLinkAsync(bob);
        await factory.WithDbAsync(db => db.Users.Where(u => u.Id == bob.User.Id)
            .ExecuteUpdateAsync(s => s.SetProperty(u => u.LockedAtUtc, DateTime.UtcNow)));
        using var visitor = await factory.CreateAnonymousClientAsync();

        foreach (var bad in new[]
                 {
                     token[..^2] + (token[^2] == 'A' ? "BB" : "AA"), // damaged
                     "not-a-token",
                     expired,
                     factory.Services.GetRequiredService<EmailVerificationTokens>()
                         .Create(alice.User.Id, alice.User.Email), // a verification link
                     tokens.Create(alice.User.Id, "earlier@example.test", stamp), // another address
                     tokens.Create(alice.User.Id, alice.User.Email, "an-earlier-stamp"), // used or signed out
                     tokens.Create(Guid.NewGuid().ToString(), alice.User.Email, stamp), // no such user
                     bobsToken, // locked by an admin
                 })
        {
            using var check = await visitor.PostAsync("/api/auth/reset-password/check", new PasswordResetCheckRequest(bad));
            using var reset = await visitor.PostAsync("/api/auth/reset-password", new ResetPasswordRequest(bad, NewPassword));
            Assert.Equal("invalid_token", await check.ReadProblemCodeAsync());
            Assert.Equal("invalid_token", await reset.ReadProblemCodeAsync());
        }
        using var login = await visitor.LoginAsync(alice.UserName, TestUser.Password);
        await login.ShouldHaveStatusAsync(HttpStatusCode.OK);
    }

    [Fact]
    public async Task SigningOut_EndsTheLink()
    {
        // The link is bound to the security stamp, which signing out renews: a new link is a click away
        var alice = await factory.SignUpAsync();
        var token = await RequestLinkAsync(alice);
        await alice.Client.LogoutAsync();
        using var visitor = await factory.CreateAnonymousClientAsync();

        using var check = await visitor.PostAsync("/api/auth/reset-password/check", new PasswordResetCheckRequest(token));

        Assert.Equal("invalid_token", await check.ReadProblemCodeAsync());
    }

    [Fact]
    public async Task ForgotPassword_NeedsTheField()
    {
        using var visitor = await factory.CreateAnonymousClientAsync();

        using var empty = await visitor.PostAsync("/api/auth/forgot-password", new ForgotPasswordRequest(""));
        using var language = await visitor.PostAsync("/api/auth/forgot-password", new ForgotPasswordRequest("x", "xx"));

        Assert.Contains("UserNameOrEmail", await empty.ReadValidationKeysAsync(), StringComparer.OrdinalIgnoreCase);
        Assert.Contains("Language", await language.ReadValidationKeysAsync(), StringComparer.OrdinalIgnoreCase);
    }

    /// <summary>Asks for a link like the page does and returns its secret.</summary>
    private async Task<string> RequestLinkAsync(TestUser user)
    {
        var before = factory.Mail.To(user.User.Email).Count;
        using var visitor = await factory.CreateAnonymousClientAsync();
        using var response = await visitor.PostAsync("/api/auth/forgot-password", new ForgotPasswordRequest(user.UserName));
        await response.ShouldHaveStatusAsync(HttpStatusCode.NoContent);
        await factory.Mail.WaitForAsync(user.User.Email, before + 1);
        return factory.Mail.LatestResetToken(user.User.Email);
    }
}
