using System.Net;
using CoinPortal.Api.Contracts.Admin;
using CoinPortal.Api.Contracts.Auth;
using CoinPortal.Api.Contracts.Common;
using CoinPortal.Api.Data;
using CoinPortal.Api.Email;
using CoinPortal.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace CoinPortal.Api.Tests;

/// <summary>
/// The one-time request to verify: the admin starts it, it mails every unverified, unlocked account
/// once, with a 7-day link. It writes to every such account of the run, so these tests run alone
/// (other tests count their own e-mails).
/// </summary>
[Collection(SiteSettingsCollection.Name)]
public class VerificationRequestsTests(CoinPortalFactory factory)
{
    private const string Url = "/api/admin/verification-requests";

    [Fact]
    public async Task Run_MailsEachUnverifiedAccountOnce_LeavesOutLockedAndVerified()
    {
        var admin = await factory.SignUpAdminAsync();
        var alice = await factory.SignUpAsync("de", confirmEmail: false);
        var verified = await factory.SignUpAsync();
        var locked = await factory.SignUpAsync(confirmEmail: false);
        await factory.WithDbAsync(db => db.Users.Where(u => u.Id == locked.User.Id)
            .ExecuteUpdateAsync(s => s.SetProperty(u => u.LockedAtUtc, DateTime.UtcNow)));

        var before = await admin.Client.GetJsonAsync<AdminVerificationRequestsResponse>(Url);
        using (var start = await admin.Client.PostAsync(Url, new AdminNoteRequest("Release")))
        {
            await start.ShouldHaveStatusAsync(HttpStatusCode.Accepted);
            Assert.Equal(before.Pending, (await start.ReadJsonAsync<AdminVerificationRequestsResponse>()).Pending);
        }
        var run = await FinishedRunAsync(admin);
        // Again: nobody it reached gets it twice
        using (var again = await admin.Client.PostAsync(Url))
        {
            await again.ShouldHaveStatusAsync(HttpStatusCode.Accepted);
        }
        await FinishedRunAsync(admin);

        Assert.True(run.Sent >= 1);
        var request = Assert.Single(Requests(alice));
        Assert.Contains("7 Tage gültig", request.Body);
        Assert.Contains($"{CoinPortalFactory.SiteUrl}/verify-email?token=", request.Body);
        Assert.Contains("höchstens 3 Münzen", request.Body);
        Assert.Empty(Requests(verified));
        Assert.Empty(Requests(locked));
        Assert.Equal(0, (await admin.Client.GetJsonAsync<AdminVerificationRequestsResponse>(Url)).Pending);
        // The link confirms the address
        using var visitor = await factory.CreateAnonymousClientAsync();
        using (var verify = await visitor.PostAsync("/api/auth/verify-email",
            new VerifyEmailRequest(factory.Mail.LatestVerificationToken(alice.User.Email))))
        {
            await verify.ShouldHaveStatusAsync(HttpStatusCode.NoContent);
        }
        // Each start is in the audit log, with the number of accounts
        var entries = (await admin.Client.GetJsonAsync<PagedResponse<AdminAuditEntryResponse>>(
                $"/api/admin/audit?action={AuditAction.VerificationEmailsRequested}")).Items
            .Where(e => e.ActorId == admin.User.Id).ToList();
        Assert.Equal(["0", before.Pending.ToString()], entries.Select(e => e.NewValue));
        Assert.Equal("Release", entries[1].Note);
    }

    [Fact]
    public async Task Request_NamesTheDeletionDate_WhenTheLifetimeIsOn()
    {
        var mail = EmailTexts.VerificationRequest("en", "Ann", "https://example.com/verify-email?token=a", 20,
            new DateTime(2026, 11, 6, 22, 30, 0, DateTimeKind.Utc), TimeSpan.FromDays(7));
        var withoutDate = EmailTexts.VerificationRequest("en", "Ann", "https://example.com/verify-email?token=a",
            20, null, TimeSpan.FromDays(7));

        Assert.Contains("deleted on 6 November 2026", mail.Text);
        Assert.Contains("The link is valid for 7 days.", mail.Text);
        Assert.DoesNotContain("deleted", withoutDate.Text);
        Assert.Contains("at most 20 coins", withoutDate.Html);
    }

    // The request's subject (English, German), not the verification e-mail from sign-up
    private List<MailMessage> Requests(TestUser user) =>
        factory.Mail.To(user.User.Email)
            .Where(m => m.Subject.Contains("now asks") || m.Subject.Contains("bittet jetzt"))
            .ToList();

    private static async Task<AdminVerificationRunResponse> FinishedRunAsync(TestUser admin)
    {
        for (var i = 0; i < 100; i++)
        {
            var state = await admin.Client.GetJsonAsync<AdminVerificationRequestsResponse>(Url);
            if (state.LastRun is { FinishedAtUtc: not null } run)
            {
                return run;
            }
            await Task.Delay(100);
        }
        throw new TimeoutException("The run did not finish.");
    }
}
