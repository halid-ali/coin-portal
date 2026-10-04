using CoinPortal.Api.Controllers.Admin;
using CoinPortal.Api.Tests.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.DependencyInjection;

namespace CoinPortal.Api.Tests;

/// <summary>
/// Rules every endpoint follows (CLAUDE.md), checked over all controller actions the app has, so a
/// new endpoint that forgets one fails here instead of in production.
/// </summary>
public class ApiConventionsTests(CoinPortalFactory factory)
{
    private IReadOnlyList<ControllerActionDescriptor> Actions =>
        factory.Services.GetRequiredService<IActionDescriptorCollectionProvider>()
            .ActionDescriptors.Items.OfType<ControllerActionDescriptor>().ToList();

    private static string Name(ControllerActionDescriptor a) => $"{a.ControllerName}.{a.ActionName}";

    [Fact]
    public void Routes_AreUnderApi()
    {
        Assert.NotEmpty(Actions);
        Assert.Empty(Actions
            .Where(a => a.AttributeRouteInfo?.Template?.StartsWith("api/") != true)
            .Select(Name));
    }

    [Fact]
    public void AdminEndpoints_ComeFromAdminControllerBase()
    {
        // Its Admin policy is what keeps the panel closed; the route alone would not
        var admin = Actions.Where(a => a.AttributeRouteInfo!.Template!.StartsWith("api/admin")).ToList();

        Assert.NotEmpty(admin);
        Assert.Empty(admin
            .Where(a => !typeof(AdminControllerBase).IsAssignableFrom(a.ControllerTypeInfo))
            .Select(Name));
    }

    [Fact]
    public void SignedOutEndpoints_HaveARateLimitPolicy()
    {
        // Reachable without signing in: [AllowAnonymous], or no [Authorize] at all
        var open = Actions.Where(a =>
            a.EndpointMetadata.OfType<IAllowAnonymous>().Any()
            || !a.EndpointMetadata.OfType<IAuthorizeData>().Any()).ToList();

        Assert.NotEmpty(open);
        Assert.Empty(open
            .Where(a => a.EndpointMetadata.OfType<EnableRateLimitingAttribute>().LastOrDefault() is null
                        || a.EndpointMetadata.OfType<DisableRateLimitingAttribute>().Any())
            .Select(Name));
    }

    [Fact]
    public void NoEndpoint_SkipsTheAntiforgeryCheck()
    {
        Assert.Empty(Actions
            .Where(a => a.EndpointMetadata.OfType<IgnoreAntiforgeryTokenAttribute>().Any()
                        || a.FilterDescriptors.Any(f => f.Filter is IgnoreAntiforgeryTokenAttribute))
            .Select(Name));
    }
}
