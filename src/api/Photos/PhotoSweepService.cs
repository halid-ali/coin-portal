using Microsoft.Extensions.Options;

namespace CoinPortal.Api.Photos;

/// <summary>
/// Runs the <see cref="PhotoSweeper"/> a minute after start (not during it: startup stays quick),
/// then every PhotoStorage:SweepIntervalHours; 0 turns it off. The host may stop an idle app, so
/// the run after each start matters as much as the timer.
/// </summary>
public class PhotoSweepService(
    PhotoSweeper sweeper, IOptions<PhotoOptions> options, ILogger<PhotoSweepService> logger) : BackgroundService
{
    private static readonly TimeSpan FirstRunDelay = TimeSpan.FromMinutes(1);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var interval = TimeSpan.FromHours(options.Value.SweepIntervalHours);
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
                    await sweeper.SweepAsync(stoppingToken);
                }
                catch (Exception e) when (e is not OperationCanceledException)
                {
                    // The next run tries again; a failed sweep must not stop the app
                    logger.LogError(e, "Photo sweep failed");
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
