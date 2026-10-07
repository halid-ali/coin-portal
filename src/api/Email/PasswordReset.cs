using System.Security.Cryptography;
using System.Threading.Channels;
using System.Threading.RateLimiting;
using CoinPortal.Api.Data;
using CoinPortal.Api.Hosting;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;

namespace CoinPortal.Api.Email;

/// <summary>
/// The secret in a password reset link: the user id, the e-mail address and the security stamp,
/// signed by data protection and valid for <see cref="Lifetime"/> (user decision 2026-10-07). Bound to
/// the stamp, so the link works once: setting the password renews it (and so does signing out,
/// which ends the link as well; a new one is a click away). Bound to the address like the
/// verification link, since using it also confirms the address.
/// </summary>
public sealed class PasswordResetTokens(IDataProtectionProvider provider)
{
    public static readonly TimeSpan Lifetime = TimeSpan.FromHours(1);

    /// <summary>The data protection purpose: a verification link or a cookie is no reset link.</summary>
    public const string Purpose = "CoinPortal.PasswordReset";

    private readonly ITimeLimitedDataProtector protector =
        provider.CreateProtector(Purpose).ToTimeLimitedDataProtector();

    /// <summary>URL safe (base64url).</summary>
    public string Create(string userId, string email, string securityStamp) =>
        protector.Protect($"{userId}\n{email}\n{securityStamp}", Lifetime);

    /// <summary>
    /// The account the link may set a password for, or null: forged, damaged or expired, used
    /// already (another stamp), for an address the account no longer has, or locked by an admin.
    /// All of them look the same to the caller.
    /// </summary>
    public async Task<ApplicationUser?> FindUserAsync(UserManager<ApplicationUser> users, string token)
    {
        string[] parts;
        try
        {
            parts = protector.Unprotect(token).Split('\n');
        }
        catch (Exception e) when (e is CryptographicException or FormatException)
        {
            return null;
        }
        if (parts is not [var userId, var email, var stamp]
            || await users.FindByIdAsync(userId) is not { } user
            || !string.Equals(user.Email, email, StringComparison.OrdinalIgnoreCase)
            || user.SecurityStamp != stamp
            || user.LockedAtUtc is not null)
        {
            return null;
        }
        return user;
    }
}

/// <summary>
/// "Forgot password": queues the request and returns at once, so the response looks and takes the
/// same for an unknown account, a locked one and one that got enough links already (no account
/// enumeration, not even by timing). <see cref="PasswordResetSender"/> sends the links one by one.
/// </summary>
public sealed class PasswordResetQueue(ILogger<PasswordResetQueue> logger)
{
    // A flood of requests waits here, not in front of the mail server; beyond this many they are dropped
    private readonly Channel<PasswordResetRequest> channel = Channel.CreateBounded<PasswordResetRequest>(
        new BoundedChannelOptions(1000) { SingleReader = true, FullMode = BoundedChannelFullMode.DropWrite });

    public ChannelReader<PasswordResetRequest> Reader => channel.Reader;

    public void Enqueue(string userNameOrEmail, string? language)
    {
        if (!channel.Writer.TryWrite(new PasswordResetRequest(userNameOrEmail, language)))
        {
            logger.LogWarning("Password reset request dropped: the queue is full");
        }
    }
}

/// <param name="Language">The page's language, for an account that never chose one.</param>
public sealed record PasswordResetRequest(string UserNameOrEmail, string? Language);

/// <summary>
/// Sends the reset links of <see cref="PasswordResetQueue"/>, in order. No link for an unknown
/// account, one an admin locked, or one that got <see cref="RateLimitOptions.Email"/> links in its
/// window already (a mailbox must not be flooded by anyone who knows the username). A failed send
/// is logged; the person sees the same page either way and can ask again.
/// </summary>
public sealed class PasswordResetSender(
    PasswordResetQueue queue, IServiceScopeFactory scopes, PasswordResetTokens tokens, IMailSender sender,
    IOptions<EmailOptions> emailOptions, IOptions<RateLimitOptions> rateLimits, ILogger<PasswordResetSender> logger)
    : BackgroundService
{
    private readonly PartitionedRateLimiter<string> perAccount = PartitionedRateLimiter.Create<string, string>(
        userId => RateLimitPartition.GetFixedWindowLimiter(userId, _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = rateLimits.Value.Email.PermitLimit,
            Window = TimeSpan.FromSeconds(rateLimits.Value.Email.WindowSeconds),
            QueueLimit = 0,
        }));

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await foreach (var request in queue.Reader.ReadAllAsync(stoppingToken))
        {
            try
            {
                await SendAsync(request, stoppingToken);
            }
            catch (Exception e) when (e is not OperationCanceledException)
            {
                logger.LogError(e, "Password reset e-mail not sent");
            }
        }
    }

    private async Task SendAsync(PasswordResetRequest request, CancellationToken ct)
    {
        await using var scope = scopes.CreateAsyncScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var key = request.UserNameOrEmail.Trim();
        // Like the sign-in: usernames cannot hold '@'
        var user = key.Contains('@') ? await users.FindByEmailAsync(key) : await users.FindByNameAsync(key);
        if (user is null || user.LockedAtUtc is not null || user.Email is null)
        {
            return;
        }
        using var lease = perAccount.AttemptAcquire(user.Id);
        if (!lease.IsAcquired)
        {
            logger.LogWarning("Password reset e-mail skipped, too many requested: {UserId}", user.Id);
            return;
        }

        var token = tokens.Create(user.Id, user.Email, user.SecurityStamp!);
        var link = $"{emailOptions.Value.SiteUrl}/reset-password?token={Uri.EscapeDataString(token)}";
        var mail = EmailTexts.PasswordReset(user.PreferredLanguage ?? request.Language, user.FirstName,
            user.UserName!, link, PasswordResetTokens.Lifetime);
        await sender.SendAsync(new MailMessage(user.Email, $"{user.FirstName} {user.LastName}", mail.Subject,
            mail.Text, mail.Html), ct);
        logger.LogInformation("Password reset e-mail sent: {UserId}", user.Id);
    }

    public override void Dispose()
    {
        perAccount.Dispose();
        base.Dispose();
    }
}
