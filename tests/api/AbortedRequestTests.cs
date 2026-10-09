using CoinPortal.Api.Hosting;
using Microsoft.AspNetCore.Http;

namespace CoinPortal.Api.Tests;

/// <summary>
/// A request the client gave up on is not a server error (AppLogging.EndAbortedRequestAsync).
/// Aborting a request while its work runs is a race, so the middleware is called on its own.
/// </summary>
public class AbortedRequestTests
{
    [Fact]
    public async Task CancelledWork_OfAnAbortedRequest_Ends499_WithoutAnError()
    {
        var context = ContextAbortedByTheClient();

        await AppLogging.EndAbortedRequestAsync(context, _ => throw new OperationCanceledException());

        Assert.Equal(StatusCodes.Status499ClientClosedRequest, context.Response.StatusCode);
    }

    [Fact]
    public async Task CancelledWork_WhileTheClientWaits_IsStillAnError()
    {
        var context = new DefaultHttpContext();

        await Assert.ThrowsAsync<OperationCanceledException>(() =>
            AppLogging.EndAbortedRequestAsync(context, _ => throw new OperationCanceledException()));
    }

    // SQL Server's client reports a command cancelled mid-query as a SqlException, not as a
    // cancellation (seen against Kestrel); whatever the cancelled work throws ends the same way
    [Fact]
    public async Task OtherErrors_OfAnAbortedRequest_End499_Too()
    {
        var context = ContextAbortedByTheClient();

        await AppLogging.EndAbortedRequestAsync(context, _ => throw new InvalidOperationException());

        Assert.Equal(StatusCodes.Status499ClientClosedRequest, context.Response.StatusCode);
    }

    [Fact]
    public async Task OtherErrors_WhileTheClientWaits_AreStillErrors()
    {
        var context = new DefaultHttpContext();

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            AppLogging.EndAbortedRequestAsync(context, _ => throw new InvalidOperationException()));
    }

    [Fact]
    public async Task CompletedRequest_KeepsItsStatus()
    {
        var context = ContextAbortedByTheClient();

        await AppLogging.EndAbortedRequestAsync(context, c =>
        {
            c.Response.StatusCode = StatusCodes.Status204NoContent;
            return Task.CompletedTask;
        });

        Assert.Equal(StatusCodes.Status204NoContent, context.Response.StatusCode);
    }

    private static DefaultHttpContext ContextAbortedByTheClient() =>
        new() { RequestAborted = new CancellationToken(canceled: true) };
}
