using System.Globalization;
using CoinPortal.Api.Accounts;
using CoinPortal.Api.Contracts.Admin;
using CoinPortal.Api.Contracts.Auth;
using CoinPortal.Api.Data;
using CoinPortal.Api.Email;
using CoinPortal.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace CoinPortal.Api.Tests;

/// <summary>
/// The cleanup of unverified accounts: reminders a week and a day before, the deletion, and what
/// it never deletes. The tests move sign-up and reminder times into the past and run the cleanup
/// themselves. It works on the whole site and changes the lifetime's start, so these tests run
/// alone (no other test's accounts are old enough to be reached).
/// </summary>
[Collection(SiteSettingsCollection.Name)]
public class UnverifiedCleanupTests(CoinPortalFactory factory) : IAsyncLifetime
{
    private DateTime originalSince;

    private UnverifiedAccountCleanup Cleanup => factory.Services.GetRequiredService<UnverifiedAccountCleanup>();

    // The lifetime counts from the sign-up only: as if it had been on for a year
    public async ValueTask InitializeAsync()
    {
        originalSince = await factory.WithDbAsync(db =>
            db.SiteSettings.Select(s => s.UnverifiedLifetimeSinceUtc).SingleAsync());
        await factory.WithDbAsync(db => db.SiteSettings.ExecuteUpdateAsync(s =>
            s.SetProperty(x => x.UnverifiedLifetimeSinceUtc, DateTime.UtcNow.AddDays(-365))));
    }

    public async ValueTask DisposeAsync() =>
        await factory.WithDbAsync(db => db.SiteSettings.ExecuteUpdateAsync(s => s
            .SetProperty(x => x.UnverifiedLifetimeSinceUtc, originalSince)
            .SetProperty(x => x.UnverifiedLifetimeDays, CoinPortalFactory.UnverifiedLifetimeDays)));

    [Fact]
    public async Task RemindsAWeekAndADayBefore_ThenDeletes()
    {
        var alice = await factory.SignUpAsync(confirmEmail: false);
        var verified = await factory.SignUpAsync();
        var locked = await factory.SignUpAsync(confirmEmail: false);
        await factory.WithDbAsync(db => db.Users.Where(u => u.Id == locked.User.Id)
            .ExecuteUpdateAsync(s => s.SetProperty(u => u.LockedAtUtc, DateTime.UtcNow)));
        foreach (var user in new[] { alice, verified, locked })
        {
            await SetTimesAsync(user, signedUpDaysAgo: 24);
        }

        // Six days left: the first reminder, with the date
        await Cleanup.RunAsync(CancellationToken.None);
        await Cleanup.RunAsync(CancellationToken.None);
        var due = (await CreatedAtAsync(alice)).AddDays(CoinPortalFactory.UnverifiedLifetimeDays);
        var reminder = Assert.Single(Reminders(alice));
        Assert.Contains(due.ToString("d MMMM yyyy", CultureInfo.GetCultureInfo("en-GB")), reminder.Subject);
        Assert.Contains($"{CoinPortalFactory.SiteUrl}/verify-email?token=", reminder.Body);
        Assert.Contains("verify-email?token=", reminder.HtmlBody);
        Assert.Empty(Reminders(verified));
        Assert.Empty(Reminders(locked));
        var shown = (await alice.Client.GetJsonAsync<UserResponse>("/api/auth/me")).UnverifiedDeletionDueUtc;
        Assert.InRange(shown!.Value, due.AddSeconds(-1), due.AddSeconds(1));

        // Half a day left: the last one
        await SetTimesAsync(alice, signedUpDaysAgo: 29.5, reminderTriedDaysAgo: 6);
        await Cleanup.RunAsync(CancellationToken.None);
        Assert.Equal(2, Reminders(alice).Count);

        // Due: deleted, the others stay
        await SetTimesAsync(alice, signedUpDaysAgo: 31, reminderTriedDaysAgo: 7);
        var result = await Cleanup.RunAsync(CancellationToken.None);
        Assert.True(result.AccountsDeleted >= 1);
        Assert.False(await ExistsAsync(alice));
        Assert.True(await ExistsAsync(verified));
        Assert.True(await ExistsAsync(locked));
    }

    [Fact]
    public async Task FailedReminder_IsTriedAgain_ButTheDeletionDoesNotWaitForIt()
    {
        var alice = await factory.SignUpAsync(confirmEmail: false);
        factory.Mail.FailWhen = m => m.ToAddress == alice.User.Email;
        try
        {
            await SetTimesAsync(alice, signedUpDaysAgo: 29.5);
            var first = await Cleanup.RunAsync(CancellationToken.None);
            var again = await Cleanup.RunAsync(CancellationToken.None);

            Assert.True(first.RemindersFailed >= 1 && again.RemindersFailed >= 1);
            Assert.Empty(Reminders(alice));
            Assert.NotNull(await factory.WithDbAsync(db => db.Users.Where(u => u.Id == alice.User.Id)
                .Select(u => u.DeletionReminderTriedAtUtc).SingleAsync()));

            await SetTimesAsync(alice, signedUpDaysAgo: 31, reminderTriedDaysAgo: 2);
            await Cleanup.RunAsync(CancellationToken.None);
            Assert.False(await ExistsAsync(alice));
        }
        finally
        {
            factory.Mail.FailWhen = _ => false;
        }
    }

    [Fact]
    public async Task PastItsDate_WithoutAReminder_IsWarnedADayAhead()
    {
        // A lifetime shortened by the admin, or a cleanup that did not run for a while
        var alice = await factory.SignUpAsync(confirmEmail: false);
        await SetTimesAsync(alice, signedUpDaysAgo: 90);

        await Cleanup.RunAsync(CancellationToken.None);
        await Cleanup.RunAsync(CancellationToken.None);

        Assert.Single(Reminders(alice));
        Assert.True(await ExistsAsync(alice));
        var due = (await alice.Client.GetJsonAsync<UserResponse>("/api/auth/me")).UnverifiedDeletionDueUtc;
        Assert.InRange(due!.Value, DateTime.UtcNow.AddHours(23), DateTime.UtcNow.AddHours(25));
    }

    [Fact]
    public async Task LifetimeZero_RemindsAndDeletesNothing()
    {
        var admin = await factory.SignUpAdminAsync();
        var alice = await factory.SignUpAsync(confirmEmail: false);
        await SetTimesAsync(alice, signedUpDaysAgo: 90, reminderTriedDaysAgo: 10);
        await factory.WithDbAsync(db => db.SiteSettings.ExecuteUpdateAsync(s =>
            s.SetProperty(x => x.UnverifiedLifetimeDays, 0)));

        var result = await Cleanup.RunAsync(CancellationToken.None);

        Assert.False(result.Enabled);
        Assert.True(await ExistsAsync(alice));
        Assert.Null((await alice.Client.GetJsonAsync<UserResponse>("/api/auth/me")).UnverifiedDeletionDueUtc);
        // The panel's overview has the last run
        var stats = await admin.Client.GetJsonAsync<AdminStatsResponse>("/api/admin/stats");
        Assert.InRange(stats.AccountCleanup!.CheckedAtUtc, result.CheckedAtUtc.AddSeconds(-1), DateTime.UtcNow);
        Assert.False(stats.AccountCleanup.Enabled);
    }

    [Fact]
    public async Task AdminsAreNeverDeleted()
    {
        var admin = await factory.SignUpAdminAsync();
        await factory.WithDbAsync(db => db.Users.Where(u => u.Id == admin.User.Id)
            .ExecuteUpdateAsync(s => s.SetProperty(u => u.EmailConfirmed, false)));
        await SetTimesAsync(admin, signedUpDaysAgo: 90, reminderTriedDaysAgo: 10);

        await Cleanup.RunAsync(CancellationToken.None);

        Assert.True(await ExistsAsync(admin));
        Assert.Empty(Reminders(admin));
        Assert.Null((await admin.Client.GetJsonAsync<UserResponse>("/api/auth/me")).UnverifiedDeletionDueUtc);
    }

    private List<MailMessage> Reminders(TestUser user) =>
        factory.Mail.To(user.User.Email).Where(m => m.Subject.Contains("deleted")).ToList();

    private Task<int> SetTimesAsync(TestUser user, double signedUpDaysAgo, double? reminderTriedDaysAgo = null)
    {
        var now = DateTime.UtcNow;
        var createdAt = now.AddDays(-signedUpDaysAgo);
        DateTime? triedAt = reminderTriedDaysAgo is { } days ? now.AddDays(-days) : null;
        return factory.WithDbAsync(db => db.Users.Where(u => u.Id == user.User.Id).ExecuteUpdateAsync(s => s
            .SetProperty(u => u.CreatedAtUtc, createdAt)
            .SetProperty(u => u.DeletionReminderTriedAtUtc, triedAt)));
    }

    private Task<DateTime> CreatedAtAsync(TestUser user) =>
        factory.WithDbAsync(db => db.Users.Where(u => u.Id == user.User.Id).Select(u => u.CreatedAtUtc).SingleAsync());

    private Task<bool> ExistsAsync(TestUser user) =>
        factory.WithDbAsync(db => db.Users.AnyAsync(u => u.Id == user.User.Id));
}
