using System.Net;
using CoinPortal.Api.Contracts.Auth;
using CoinPortal.Api.Contracts.Collections;
using CoinPortal.Api.Data;
using CoinPortal.Api.Email;
using CoinPortal.Api.Tests.Infrastructure;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CoinPortal.Api.Tests;

/// <summary>
/// The verification link sent at sign-up, confirming with it, sending it again, and the rule it
/// unlocks: sharing a collection needs a confirmed address.
/// </summary>
public class EmailVerificationTests(CoinPortalFactory factory)
{
    [Theory]
    [InlineData("tr", "doğrula")]
    [InlineData("de", "Bestätige")]
    [InlineData("bg", "потвърдете")]
    [InlineData(null, "confirm")]
    public async Task SignUp_SendsTheLink_InTheUsersLanguage_ToTheSiteAddress(string? language, string subjectWord)
    {
        var alice = await factory.SignUpAsync(language, confirmEmail: false);

        var mail = Assert.Single(factory.Mail.To(alice.User.Email));
        var me = await alice.Client.GetJsonAsync<UserResponse>("/api/auth/me");

        Assert.Contains(subjectWord, mail.Subject);
        // The configured address, never the request's host
        Assert.Contains($"{CoinPortalFactory.SiteUrl}/verify-email?token=", mail.Body);
        Assert.Contains("Test", mail.Body); // the first name
        Assert.False(me.EmailConfirmed);
    }

    [Fact]
    public async Task Link_ConfirmsTheAddress_SignedOut_AndAfterSigningOut()
    {
        // Signing out renews the security stamp; the link is not bound to it
        var alice = await factory.SignUpAsync(confirmEmail: false);
        var token = factory.Mail.LatestVerificationToken(alice.User.Email);
        await alice.Client.LogoutAsync();
        using var visitor = await factory.CreateAnonymousClientAsync();

        using var first = await visitor.PostAsync("/api/auth/verify-email", new VerifyEmailRequest(token));
        using var again = await visitor.PostAsync("/api/auth/verify-email", new VerifyEmailRequest(token));
        using var login = await alice.Client.LoginAsync(alice.UserName, TestUser.Password);

        await first.ShouldHaveStatusAsync(HttpStatusCode.NoContent);
        await again.ShouldHaveStatusAsync(HttpStatusCode.NoContent);
        Assert.True((await login.ReadJsonAsync<UserResponse>()).EmailConfirmed);
    }

    [Fact]
    public async Task InvalidLinks_AreRejected_AndConfirmNothing()
    {
        var alice = await factory.SignUpAsync(confirmEmail: false);
        var token = factory.Mail.LatestVerificationToken(alice.User.Email);
        var tokens = factory.Services.GetRequiredService<EmailVerificationTokens>();
        var expired = factory.Services.GetRequiredService<IDataProtectionProvider>()
            .CreateProtector(EmailVerificationTokens.Purpose).ToTimeLimitedDataProtector()
            .Protect($"{alice.User.Id}\n{alice.User.Email}", DateTimeOffset.UtcNow.AddMinutes(-1));
        using var visitor = await factory.CreateAnonymousClientAsync();

        foreach (var bad in new[]
                 {
                     token[..^2] + (token[^2] == 'A' ? "BB" : "AA"), // damaged
                     "not-a-token",
                     expired,
                     tokens.Create(alice.User.Id, "earlier@example.test"), // another address
                     tokens.Create(Guid.NewGuid().ToString(), alice.User.Email), // no such user
                 })
        {
            using var response = await visitor.PostAsync("/api/auth/verify-email", new VerifyEmailRequest(bad));
            Assert.Equal("invalid_token", await response.ReadProblemCodeAsync());
        }
        Assert.False((await alice.Client.GetJsonAsync<UserResponse>("/api/auth/me")).EmailConfirmed);
    }

    [Fact]
    public async Task Resend_SendsANewLink_IsLimited_AndDoesNothingOnceConfirmed()
    {
        var alice = await factory.SignUpAsync(confirmEmail: false);
        var bob = await factory.SignUpAsync();

        // The default limit: three per ten minutes and user
        var statuses = new List<HttpStatusCode>();
        for (var i = 0; i < 4; i++)
        {
            using var response = await alice.Client.PostAsync("/api/auth/verify-email/resend");
            statuses.Add(response.StatusCode);
        }
        using var confirmed = await bob.Client.PostAsync("/api/auth/verify-email/resend");

        Assert.Equal([HttpStatusCode.NoContent, HttpStatusCode.NoContent, HttpStatusCode.NoContent,
            HttpStatusCode.TooManyRequests], statuses);
        Assert.Equal(4, factory.Mail.To(alice.User.Email).Count); // sign-up and three again
        await confirmed.ShouldHaveStatusAsync(HttpStatusCode.NoContent);
        Assert.Single(factory.Mail.To(bob.User.Email)); // only the one from sign-up
    }

    [Fact]
    public async Task MailServerDown_SignUpSucceeds_AndResendSays503()
    {
        var userName = "m" + Guid.NewGuid().ToString("N")[..12];
        factory.Mail.FailWhen = m => m.ToAddress.StartsWith(userName + "@", StringComparison.Ordinal);
        try
        {
            var alice = await factory.SignUpAsync(userName: userName, confirmEmail: false);

            using var resend = await alice.Client.PostAsync("/api/auth/verify-email/resend");

            Assert.Empty(factory.Mail.To(alice.User.Email));
            Assert.Equal("email_not_sent", await resend.ReadProblemCodeAsync(HttpStatusCode.ServiceUnavailable));
        }
        finally
        {
            factory.Mail.FailWhen = _ => false;
        }
    }

    [Fact]
    public async Task Sharing_NeedsAConfirmedAddress()
    {
        var alice = await factory.SignUpAsync(confirmEmail: false);
        var collection = await alice.FirstCollectionAsync();

        using var createUnlisted = await alice.Client.PostAsync("/api/collections",
            new CollectionUpsertRequest { Name = "Shared", Visibility = CollectionVisibility.Unlisted });
        using var makeUnlisted = await alice.Client.PutAsync($"/api/collections/{collection.Id}",
            new CollectionUpsertRequest { Name = collection.Name, Visibility = CollectionVisibility.Unlisted });
        using var makePublic = await alice.Client.PutAsync($"/api/collections/{collection.Id}",
            new CollectionUpsertRequest { Name = collection.Name, Visibility = CollectionVisibility.Public });
        using var publish = await alice.Client.PostAsync($"/api/collections/{collection.Id}/publish");
        // Everything else stays open
        using var rename = await alice.Client.PutAsync($"/api/collections/{collection.Id}",
            new CollectionUpsertRequest { Name = "Renamed", Visibility = CollectionVisibility.Private });
        using var createPrivate = await alice.Client.PostAsync("/api/collections",
            new CollectionUpsertRequest { Name = "Private one" });

        foreach (var response in new[] { createUnlisted, makeUnlisted, makePublic, publish })
        {
            Assert.Equal("email_not_confirmed", await response.ReadProblemCodeAsync(HttpStatusCode.Forbidden));
        }
        await rename.ShouldHaveStatusAsync(HttpStatusCode.OK);
        await createPrivate.ShouldHaveStatusAsync(HttpStatusCode.Created);

        // Confirmed, the same change goes through
        using var visitor = await factory.CreateAnonymousClientAsync();
        using var verify = await visitor.PostAsync("/api/auth/verify-email",
            new VerifyEmailRequest(factory.Mail.LatestVerificationToken(alice.User.Email)));
        await verify.ShouldHaveStatusAsync(HttpStatusCode.NoContent);
        var shared = await alice.SetVisibilityAsync(collection with { Name = "Renamed" }, CollectionVisibility.Unlisted);
        Assert.Equal(CollectionVisibility.Unlisted, shared.Visibility);
    }

    [Fact]
    public async Task SharedBeforeVerificationExisted_StaysShared_ButSharesNoWider()
    {
        // Accounts from before verification: their address was never confirmed
        var alice = await factory.SignUpAsync();
        var unlisted = await alice.SetVisibilityAsync(await alice.FirstCollectionAsync(), CollectionVisibility.Unlisted);
        await factory.WithDbAsync(db => db.Users.Where(u => u.Id == alice.User.Id)
            .ExecuteUpdateAsync(s => s.SetProperty(u => u.EmailConfirmed, false)));

        using var renamed = await alice.Client.PutAsync($"/api/collections/{unlisted.Id}",
            new CollectionUpsertRequest { Name = "Renamed", Visibility = CollectionVisibility.Unlisted });
        using var newLink = await alice.Client.PostAsync($"/api/collections/{unlisted.Id}/share-token");
        using var makePublic = await alice.Client.PostAsync($"/api/collections/{unlisted.Id}/publish");

        Assert.Equal(CollectionVisibility.Unlisted, (await renamed.ReadJsonAsync<CollectionResponse>()).Visibility);
        await newLink.ShouldHaveStatusAsync(HttpStatusCode.OK);
        Assert.Equal("email_not_confirmed", await makePublic.ReadProblemCodeAsync(HttpStatusCode.Forbidden));
    }
}
