using System.ComponentModel.DataAnnotations;
using Microsoft.Extensions.Options;

namespace CoinPortal.Api.Accounts;

/// <summary>
/// Runs the <see cref="UnverifiedAccountCleanup"/> two minutes after start, then every
/// AccountCleanup:IntervalHours; 0 turns it off. A few times a day, so the 1-day reminder finds its
/// day; the host may stop an idle app, so the run after each start matters as much as the timer.
/// </summary>
public class UnverifiedCleanupService(
    UnverifiedAccountCleanup cleanup, IOptions<AccountCleanupOptions> options,
    ILogger<UnverifiedCleanupService> logger) : BackgroundService
{
    // After the photo sweep's first run (one minute): startup stays quick, the two do not overlap
    private static readonly TimeSpan FirstRunDelay = TimeSpan.FromMinutes(2);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var interval = TimeSpan.FromHours(options.Value.IntervalHours);
        if (interval <= TimeSpan.Zero)
        {
            return;
        }

        try
        {
            await Task.Delay(FirstRunDelay, stoppingToken);
            using var timer = new PeriodicTimer(interval);
            do
            {
                try
                {
                    await cleanup.RunAsync(stoppingToken);
                }
                catch (Exception e) when (e is not OperationCanceledException)
                {
                    // The next run tries again; a failed run must not stop the app
                    logger.LogError(e, "Cleanup of unverified accounts failed");
                }
            }
            while (await timer.WaitForNextTickAsync(stoppingToken));
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Shutting down
        }
    }
}

/// <summary>Configuration section "AccountCleanup" (<see cref="UnverifiedCleanupService"/>).</summary>
public sealed class AccountCleanupOptions
{
    public const string SectionName = "AccountCleanup";

    /// <summary>Hours between two runs; the first runs two minutes after start. 0 turns it off (tests).</summary>
    [Range(0, 24)]
    public int IntervalHours { get; set; } = 6;
}
