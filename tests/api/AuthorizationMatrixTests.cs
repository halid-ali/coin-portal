using System.Net;
using System.Net.Http.Json;
using CoinPortal.Api.Contracts.Admin;
using CoinPortal.Api.Contracts.Auth;
using CoinPortal.Api.Contracts.Coins;
using CoinPortal.Api.Contracts.Collections;
using CoinPortal.Api.Contracts.Settings;
using CoinPortal.Api.Data;
using CoinPortal.Api.Email;
using CoinPortal.Api.Tests.Infrastructure;
using Microsoft.AspNetCore.Mvc.Controllers;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;

namespace CoinPortal.Api.Tests;

/// <summary>
/// Who may call what, for every endpoint of the API: each one is in the table below with its
/// access rule, and a new endpoint fails <see cref="EveryEndpoint_IsInTheMatrix"/> until it is
/// added. The rule decides what a signed-out visitor, another user and an admin get for the
/// owner's private resources (404 rather than 403: someone else's resource looks missing), and
/// the owner's own request is sent last to show that the address is real. Details (problem
/// codes, visibility states, share links) stay in the tests of each feature.
/// In the Admin collection: it signs up admins.
/// </summary>
[Collection(AdminCollection.Name)]
public class AuthorizationMatrixTests(CoinPortalFactory factory)
{
    private enum Access
    {
        /// <summary>Open to everyone, signed out included.</summary>
        Anyone,

        /// <summary>Signed in, on the caller's own data (no id of someone else in the address).</summary>
        SignedIn,

        /// <summary>The owner's resource: signed out 401, others (admins too) 404.</summary>
        Owner,

        /// <summary>Readable signed out if the collection is visible: a hidden one is 404 for everyone else.</summary>
        Visible,

        /// <summary>Admin panel: signed out 401, other users 403.</summary>
        Admin,
    }

    /// <param name="Url">The owner's private resource (Owner, Visible) or any target the rule allows.</param>
    /// <param name="OpenUrl">Visible only: a visible target of the endpoint, made so by the owner.</param>
    private sealed record Row(
        string Method,
        string Route,
        Access Access,
        Func<World, string> Url,
        Func<World, HttpContent?>? Body = null,
        Func<World, Task<string>>? OpenUrl = null)
    {
        public string Key => $"{Method} {Route}";
    }

    /// <summary>
    /// The owner's data: a private collection with a coin, its photo and a cover, an unlisted one,
    /// the share link of a collection that went private again, and a verification link secret.
    /// Plus the other callers.
    /// </summary>
    private sealed record World(
        TestUser Owner,
        string VerificationToken,
        CollectionResponse Collection,
        CoinResponse Coin,
        CollectionResponse Shared,
        string RevokedToken,
        TestUser Stranger,
        TestUser? Admin,
        ApiClient Visitor);

    private static HttpContent Json(object body) => JsonContent.Create(body, options: ApiClient.Json);

    private static readonly Row[] Rows =
    [
        // Auth
        new("POST", "api/Auth/register", Access.Anyone, _ => "/api/auth/register",
            _ => Json(TestUser.NewRegisterRequest())),
        new("POST", "api/Auth/login", Access.Anyone, _ => "/api/auth/login",
            w => Json(new LoginRequest(w.Owner.UserName, TestUser.Password))),
        new("POST", "api/Auth/logout", Access.SignedIn, _ => "/api/auth/logout"),
        new("GET", "api/Auth/me", Access.SignedIn, _ => "/api/auth/me"),
        new("GET", "api/Auth/antiforgery", Access.Anyone, _ => "/api/auth/antiforgery"),
        new("POST", "api/Auth/verify-email", Access.Anyone, _ => "/api/auth/verify-email",
            w => Json(new VerifyEmailRequest(w.VerificationToken))),
        new("POST", "api/Auth/verify-email/resend", Access.SignedIn, _ => "/api/auth/verify-email/resend"),
        new("GET", "api/Health", Access.Anyone, _ => "/api/health"),
        new("GET", "api/Countries", Access.Anyone, _ => "/api/countries"),

        // Settings
        new("GET", "api/Settings", Access.SignedIn, _ => "/api/settings"),
        new("PUT", "api/Settings", Access.SignedIn, _ => "/api/settings",
            _ => Json(new UserSettingsRequest("tr", null, null))),
        new("GET", "api/Settings/export", Access.SignedIn, _ => "/api/settings/export"),
        new("DELETE", "api/Settings/account", Access.SignedIn, _ => "/api/settings/account",
            _ => Json(new DeleteAccountRequest(TestUser.Password))),

        // Collections and covers
        new("GET", "api/Collections", Access.SignedIn, _ => "/api/collections"),
        new("POST", "api/Collections", Access.SignedIn, _ => "/api/collections",
            _ => Json(new CollectionUpsertRequest { Name = "New collection" })),
        new("GET", "api/Collections/{id:int}", Access.Owner, w => $"/api/collections/{w.Collection.Id}"),
        new("PUT", "api/Collections/{id:int}", Access.Owner, w => $"/api/collections/{w.Collection.Id}",
            _ => Json(new CollectionUpsertRequest { Name = "Renamed" })),
        new("DELETE", "api/Collections/{id:int}", Access.Owner,
            w => $"/api/collections/{w.Collection.Id}?deleteCoins=true"),
        new("POST", "api/Collections/{id:int}/publish", Access.Owner,
            w => $"/api/collections/{w.Collection.Id}/publish"),
        new("POST", "api/Collections/{id:int}/share-token", Access.Owner,
            w => $"/api/collections/{w.Shared.Id}/share-token"),
        new("PUT", "api/collections/{collectionId:int}/cover", Access.Owner,
            w => $"/api/collections/{w.Collection.Id}/cover", _ => ApiClient.FileContent(TestImages.Png(640, 360))),
        new("DELETE", "api/collections/{collectionId:int}/cover", Access.Owner,
            w => $"/api/collections/{w.Collection.Id}/cover"),
        new("GET", "api/collections/{collectionId:int}/cover", Access.Visible,
            w => $"/api/collections/{w.Collection.Id}/cover",
            OpenUrl: async w => $"/api/collections/{w.Collection.Id}/cover?s={await ShareAsync(w)}"),

        // Coins and photos
        new("GET", "api/Coins", Access.SignedIn, _ => "/api/coins"),
        new("GET", "api/Coins/summary", Access.SignedIn, _ => "/api/coins/summary"),
        new("POST", "api/Coins", Access.SignedIn, _ => "/api/coins",
            w => Json(TestUser.NewCoin(w.Collection.Id))),
        new("POST", "api/Coins/with-photos", Access.SignedIn, _ => "/api/coins/with-photos",
            w => ApiClient.CoinWithPhotosContent(TestUser.NewCoin(w.Collection.Id), national: TestImages.Png(200, 160))),
        new("GET", "api/Coins/{id:int}", Access.Owner, w => $"/api/coins/{w.Coin.Id}"),
        new("PUT", "api/Coins/{id:int}", Access.Owner, w => $"/api/coins/{w.Coin.Id}",
            w => Json(TestUser.NewCoin(w.Collection.Id, "Renamed"))),
        new("DELETE", "api/Coins/{id:int}", Access.Owner, w => $"/api/coins/{w.Coin.Id}"),
        new("PUT", "api/coins/{coinId:int}/photos/{side:alpha}", Access.Owner,
            w => $"/api/coins/{w.Coin.Id}/photos/Common", _ => ApiClient.FileContent(TestImages.Png(200, 160))),
        new("DELETE", "api/coins/{coinId:int}/photos/{side:alpha}", Access.Owner,
            w => $"/api/coins/{w.Coin.Id}/photos/National"),
        new("GET", "api/coins/{coinId:int}/photos/{side:alpha}/{size:alpha}", Access.Visible,
            w => $"/api/coins/{w.Coin.Id}/photos/National/Thumb",
            OpenUrl: async w => $"/api/coins/{w.Coin.Id}/photos/National/Thumb?s={await ShareAsync(w)}"),

        // Public views
        new("GET", "api/public/collectors", Access.Anyone, _ => "/api/public/collectors"),
        new("GET", "api/public/coins", Access.Anyone, _ => "/api/public/coins"),
        new("GET", "api/public/users/{userName}", Access.Visible, w => $"/api/public/users/{w.Owner.UserName}",
            OpenUrl: async w =>
            {
                await PublishAsync(w);
                return $"/api/public/users/{w.Owner.UserName}";
            }),
        new("GET", "api/public/collections/{id:int}", Access.Visible,
            w => $"/api/public/collections/{w.Collection.Id}",
            OpenUrl: async w => $"/api/public/collections/{(await PublishAsync(w)).Id}"),
        new("GET", "api/public/collections/{id:int}/coins", Access.Visible,
            w => $"/api/public/collections/{w.Collection.Id}/coins",
            OpenUrl: async w => $"/api/public/collections/{(await PublishAsync(w)).Id}/coins"),
        new("GET", "api/public/shared/{token}", Access.Visible, w => $"/api/public/shared/{w.RevokedToken}",
            OpenUrl: w => Task.FromResult($"/api/public/shared/{w.Shared.ShareToken}")),
        new("GET", "api/public/shared/{token}/coins", Access.Visible,
            w => $"/api/public/shared/{w.RevokedToken}/coins",
            OpenUrl: w => Task.FromResult($"/api/public/shared/{w.Shared.ShareToken}/coins")),

        // Admin panel; its collection actions need a shared collection (admins see no private ones)
        new("GET", "api/admin/stats", Access.Admin, _ => "/api/admin/stats"),
        new("GET", "api/admin/users", Access.Admin, _ => "/api/admin/users"),
        new("GET", "api/admin/users/{id}", Access.Admin, w => $"/api/admin/users/{w.Owner.User.Id}"),
        new("PUT", "api/admin/users/{id}/lock", Access.Admin, w => $"/api/admin/users/{w.Owner.User.Id}/lock"),
        new("DELETE", "api/admin/users/{id}/lock", Access.Admin, w => $"/api/admin/users/{w.Owner.User.Id}/lock"),
        new("DELETE", "api/admin/users/{id}", Access.Admin, w => $"/api/admin/users/{w.Owner.User.Id}"),
        new("GET", "api/admin/collections", Access.Admin, _ => "/api/admin/collections"),
        new("PUT", "api/admin/collections/{id:int}/lock", Access.Admin,
            w => $"/api/admin/collections/{w.Shared.Id}/lock"),
        new("DELETE", "api/admin/collections/{id:int}/lock", Access.Admin,
            w => $"/api/admin/collections/{w.Shared.Id}/lock"),
        new("GET", "api/admin/audit", Access.Admin, _ => "/api/admin/audit"),
        new("GET", "api/admin/settings", Access.Admin, _ => "/api/admin/settings"),
        // The current value: nothing changes
        new("PUT", "api/admin/settings", Access.Admin, _ => "/api/admin/settings",
            _ => Json(new AdminSettingsRequest(CoinPortalFactory.MinPublicCoins, CoinPortalFactory.UnverifiedMaxCoins, null))),
        new("GET", "api/admin/settings/impact", Access.Admin,
            _ => $"/api/admin/settings/impact?minPublicCoins={CoinPortalFactory.MinPublicCoins}"),
    ];

    public static TheoryData<string> Endpoints => new(Rows.Select(r => r.Key));

    [Fact]
    public void EveryEndpoint_IsInTheMatrix()
    {
        var actual = factory.Services.GetRequiredService<IActionDescriptorCollectionProvider>()
            .ActionDescriptors.Items.OfType<ControllerActionDescriptor>()
            .SelectMany(a => a.EndpointMetadata.OfType<HttpMethodMetadata>().Single().HttpMethods
                .Select(method => $"{method} {a.AttributeRouteInfo!.Template}"))
            .ToHashSet();
        var listed = Rows.Select(r => r.Key).ToList();

        // A new endpoint needs its row (who may call it); a row without an endpoint is out of date
        Assert.Empty(actual.Except(listed).Order());
        Assert.Empty(listed.Except(actual).Order());
        Assert.Equal(listed.Count, listed.Distinct().Count());
    }

    [Theory]
    [MemberData(nameof(Endpoints))]
    public async Task Endpoint_FollowsItsAccessRule(string endpoint)
    {
        var row = Rows.Single(r => r.Key == endpoint);
        var w = await CreateWorldAsync(withAdmin: row.Access is Access.Owner or Access.Visible or Access.Admin);

        switch (row.Access)
        {
            case Access.Anyone:
                await ExpectAsync(row, w, "visitor", w.Visitor, IsSuccess);
                break;

            case Access.SignedIn:
                await ExpectAsync(row, w, "visitor", w.Visitor, Is(HttpStatusCode.Unauthorized));
                await ExpectAsync(row, w, "owner", w.Owner.Client, GetsThrough);
                break;

            case Access.Owner:
                await ExpectAsync(row, w, "visitor", w.Visitor, Is(HttpStatusCode.Unauthorized));
                await ExpectAsync(row, w, "another user", w.Stranger.Client, Is(HttpStatusCode.NotFound));
                await ExpectAsync(row, w, "admin", w.Admin!.Client, Is(HttpStatusCode.NotFound));
                await ExpectAsync(row, w, "owner", w.Owner.Client, GetsThrough);
                break;

            case Access.Visible:
                await ExpectAsync(row, w, "visitor", w.Visitor, Is(HttpStatusCode.NotFound));
                await ExpectAsync(row, w, "another user", w.Stranger.Client, Is(HttpStatusCode.NotFound));
                await ExpectAsync(row, w, "admin", w.Admin!.Client, Is(HttpStatusCode.NotFound));
                await ExpectAsync(row, w, "visitor (visible)", w.Visitor, Is(HttpStatusCode.OK),
                    await row.OpenUrl!(w));
                break;

            case Access.Admin:
                await ExpectAsync(row, w, "visitor", w.Visitor, Is(HttpStatusCode.Unauthorized));
                await ExpectAsync(row, w, "user", w.Stranger.Client, Is(HttpStatusCode.Forbidden));
                await ExpectAsync(row, w, "admin", w.Admin!.Client, GetsThrough);
                break;

            default:
                throw new ArgumentOutOfRangeException(nameof(endpoint), row.Access, null);
        }
    }

    private sealed record Expectation(string Description, Func<HttpStatusCode, bool> Matches);

    private static Expectation Is(HttpStatusCode status) => new($"{(int)status} {status}", s => s == status);

    private static readonly Expectation IsSuccess = new("success", s => (int)s is >= 200 and < 300);

    // Past the access check: any answer but "who are you", "not allowed" or "not found", e.g. a
    // 409 for a collection that still has coins
    private static readonly Expectation GetsThrough = new("not 401, 403 or 404", s =>
        s is not (HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden or HttpStatusCode.NotFound));

    private static async Task ExpectAsync(Row row, World w, string caller, ApiClient client,
        Expectation expected, string? url = null)
    {
        url ??= row.Url(w);
        using var response = await client.SendAsync(new HttpMethod(row.Method), url, row.Body?.Invoke(w));
        if (!expected.Matches(response.StatusCode))
        {
            var body = await response.Content.ReadAsStringAsync();
            Assert.Fail($"{row.Key} as {caller} ({url}): expected {expected.Description}, " +
                        $"got {(int)response.StatusCode} {response.StatusCode}: {body}");
        }
    }

    private async Task<World> CreateWorldAsync(bool withAdmin)
    {
        var owner = await factory.SignUpAsync();
        var collection = await owner.FirstCollectionAsync();
        var coin = await owner.CreateCoinAsync(collection.Id);
        await owner.UploadPhotoAsync(coin.Id);
        await owner.UploadCoverAsync(collection.Id);
        var shared = await owner.CreateCollectionAsync(visibility: CollectionVisibility.Unlisted);
        var revoked = await owner.CreateCollectionAsync(visibility: CollectionVisibility.Unlisted);
        await owner.SetVisibilityAsync(revoked, CollectionVisibility.Private);

        return new World(
            owner,
            factory.Services.GetRequiredService<EmailVerificationTokens>().Create(owner.User.Id, owner.User.Email),
            collection,
            coin,
            shared,
            revoked.ShareToken!,
            await factory.SignUpAsync(),
            withAdmin ? await factory.SignUpAdminAsync() : null,
            await factory.CreateAnonymousClientAsync());
    }

    /// <summary>Makes the owner's collection link-only and returns its share link secret.</summary>
    private static async Task<string> ShareAsync(World w) =>
        (await w.Owner.SetVisibilityAsync(w.Collection, CollectionVisibility.Unlisted)).ShareToken!;

    /// <summary>Makes the owner's collection public (adds the photographed coins it needs).</summary>
    private static Task<CollectionResponse> PublishAsync(World w) => w.Owner.PublishAsync(w.Collection);
}
