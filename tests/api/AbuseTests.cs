using System.Net;
using System.Text;
using CoinPortal.Api.Contracts.Auth;
using CoinPortal.Api.Contracts.Coins;
using CoinPortal.Api.Contracts.Collections;
using CoinPortal.Api.Contracts.Common;
using CoinPortal.Api.Contracts.Public;
using CoinPortal.Api.Data;
using CoinPortal.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace CoinPortal.Api.Tests;

/// <summary>
/// Requests a client would never send: fields the API must ignore, files posing as images and
/// hostile query values. Who may call what is AuthorizationMatrixTests, altered share links are
/// in VisibilityTests; these tests send what an attacker would put inside an allowed request.
/// </summary>
public class AbuseTests(CoinPortalFactory factory)
{
    // Extra fields in the body (mass assignment): requests bind to contracts, never to entities

    [Fact]
    public async Task Coin_ExtraFields_DoNotSetItsOwnerIdOrTimes()
    {
        var alice = await factory.SignUpAsync();
        var bob = await factory.SignUpAsync();
        var bobsCoin = await bob.CreateCoinAsync((await bob.FirstCollectionAsync()).Id);
        var collection = await alice.FirstCollectionAsync();
        var fields = $$"""
            "collectionId":{{collection.Id}},"title":"Mine","countryCode":"DE","year":2006,"denomination":"Euro2",
            "id":{{bobsCoin.Id}},"ownerId":"{{bob.User.Id}}","createdAtUtc":"2000-01-01T00:00:00Z","updatedAtUtc":"2000-01-01T00:00:00Z"
            """;

        using var create = await alice.Client.SendRawJsonAsync(HttpMethod.Post, "/api/coins", "{" + fields + "}");
        var coin = await create.ReadJsonAsync<CoinResponse>();
        using var update = await alice.Client.SendRawJsonAsync(HttpMethod.Put, $"/api/coins/{coin.Id}", "{" + fields + "}");
        await update.ShouldHaveStatusAsync(HttpStatusCode.OK);

        Assert.NotEqual(bobsCoin.Id, coin.Id);
        Assert.True(coin.CreatedAtUtc > DateTime.UtcNow.AddMinutes(-5));
        Assert.Equal(alice.User.Id, await factory.WithDbAsync(db => db.Coins.Where(c => c.Id == coin.Id)
            .Select(c => c.OwnerId).SingleAsync()));
        Assert.Equal("Test coin", (await bob.Client.GetJsonAsync<CoinResponse>($"/api/coins/{bobsCoin.Id}")).Title);
    }

    [Fact]
    public async Task Collection_ExtraFields_DoNotSetItsOwnerLinkCoverOrLock()
    {
        var alice = await factory.SignUpAsync();
        var bob = await factory.SignUpAsync();
        var token = new string('A', Collection.ShareTokenLength);
        var fields = $$"""
            "ownerId":"{{bob.User.Id}}","shareToken":"{{token}}","moderationLocked":true,
            "moderationLockedAtUtc":"2000-01-01T00:00:00Z","coverImageId":"{{Guid.NewGuid()}}"
            """;

        using var create = await alice.Client.SendRawJsonAsync(HttpMethod.Post, "/api/collections",
            """{"name":"Mine",""" + fields + "}");
        var collection = await create.ReadJsonAsync<CollectionResponse>();
        // Unlisted: the API makes the share link, the one in the body is ignored
        using var update = await alice.Client.SendRawJsonAsync(HttpMethod.Put, $"/api/collections/{collection.Id}",
            """{"name":"Mine","visibility":"Unlisted",""" + fields + "}");
        var updated = await update.ReadJsonAsync<CollectionResponse>();

        Assert.Equal((CollectionVisibility.Private, false, null, null),
            (collection.Visibility, collection.ModerationLocked, collection.ShareToken, collection.CoverImageId));
        Assert.Equal((false, null), (updated.ModerationLocked, updated.CoverImageId));
        Assert.NotNull(updated.ShareToken);
        Assert.NotEqual(token, updated.ShareToken);
        Assert.Equal(alice.User.Id, await factory.WithDbAsync(db => db.Collections
            .Where(c => c.Id == collection.Id).Select(c => c.OwnerId).SingleAsync()));
        Assert.Single(await bob.Client.GetJsonAsync<List<CollectionResponse>>("/api/collections"));
    }

    [Fact]
    public async Task Register_ExtraFields_GiveNoRoleLockOrId()
    {
        using var client = await factory.CreateAnonymousClientAsync();
        var request = TestUser.NewRegisterRequest();
        var json = $$"""
            {"firstName":"Test","lastName":"User","userName":"{{request.UserName}}","email":"{{request.Email}}",
            "birthDate":"1990-01-01","password":"{{TestUser.Password}}","acceptTerms":true,
            "id":"00000000-0000-0000-0000-000000000001","roles":["Admin"],"isAdmin":true,"emailConfirmed":true,
            "lockedAtUtc":"2000-01-01T00:00:00Z","lockoutEnabled":false,"securityStamp":"x"}
            """;

        using var response = await client.SendRawJsonAsync(HttpMethod.Post, "/api/auth/register", json);
        var user = await response.ReadJsonAsync<UserResponse>();
        await client.RefreshAntiforgeryAsync();

        Assert.NotEqual("00000000-0000-0000-0000-000000000001", user.Id);
        Assert.Empty(user.Roles);
        await client.ExpectStatusAsync("/api/admin/stats", HttpStatusCode.Forbidden);
        Assert.Equal((null, true), await factory.WithDbAsync(db => db.Users.Where(u => u.Id == user.Id)
            .Select(u => new ValueTuple<DateTime?, bool>(u.LockedAtUtc, u.LockoutEnabled)).SingleAsync()));
    }

    [Fact]
    public async Task Settings_ExtraFields_ChangeNoAccountData()
    {
        var alice = await factory.SignUpAsync();

        using var response = await alice.Client.SendRawJsonAsync(HttpMethod.Put, "/api/settings",
            """
            {"language":"tr","theme":null,"accent":null,"userName":"taken-over","email":"x@example.test",
            "firstName":"X","roles":["Admin"],"passwordHash":"x"}
            """);
        await response.ShouldHaveStatusAsync(HttpStatusCode.OK);
        var me = await alice.Client.GetJsonAsync<UserResponse>("/api/auth/me");

        Assert.Equal((alice.UserName, alice.User.Email, alice.User.FirstName, "tr"),
            (me.UserName, me.Email, me.FirstName, me.Language));
        Assert.Empty(me.Roles);
        using var signIn = await (await factory.CreateAnonymousClientAsync()).LoginAsync(alice.UserName, TestUser.Password);
        await signIn.ShouldHaveStatusAsync(HttpStatusCode.OK);
    }

    [Fact]
    public async Task CoinWithPhotos_InAnotherUsersCollection_LeavesNothingBehind()
    {
        var alice = await factory.SignUpAsync();
        var bob = await factory.SignUpAsync();
        var bobsCollection = await bob.FirstCollectionAsync();

        using var response = await alice.Client.PostCoinWithPhotosAsync("/api/coins/with-photos",
            TestUser.NewCoin(bobsCollection.Id), national: TestImages.Png(200, 160), common: TestImages.Png(200, 160));

        Assert.Contains("CollectionId", await response.ReadValidationKeysAsync(), StringComparer.OrdinalIgnoreCase);
        Assert.Empty((await bob.Client.GetJsonAsync<PagedResponse<CoinResponse>>("/api/coins")).Items);
        Assert.Empty(StoredFiles(alice));
        Assert.Empty(StoredFiles(bob));
    }

    [Fact]
    public async Task CoinList_OfAnotherUsersCollection_LooksMissing()
    {
        var alice = await factory.SignUpAsync();
        var bob = await factory.SignUpAsync();
        var bobsCollection = await bob.FirstCollectionAsync();
        await bob.CreateCoinAsync(bobsCollection.Id);

        await alice.Client.ExpectStatusAsync($"/api/coins?collectionId={bobsCollection.Id}", HttpStatusCode.NotFound);
    }

    // Files posing as images: the type comes from the content, never from the name or content type

    [Theory]
    [InlineData("svg", "photo.jpg", "image/jpeg")]
    [InlineData("svg", "photo.svg", "image/svg+xml")]
    [InlineData("html", "photo.png", "image/png")]
    public async Task Upload_ScriptPosingAsAnImage_IsRejected(string kind, string fileName, string contentType)
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.FirstCollectionAsync();
        var coin = await alice.CreateCoinAsync(collection.Id);
        var bytes = kind == "svg" ? TestImages.SvgWithScript() : TestImages.Html();

        using var photo = await alice.Client.PutFileAsync($"/api/coins/{coin.Id}/photos/National", bytes, fileName, contentType);
        using var cover = await alice.Client.PutFileAsync($"/api/collections/{collection.Id}/cover", bytes, fileName, contentType);

        Assert.Equal("invalid_image", await photo.ReadProblemCodeAsync());
        Assert.Equal("invalid_image", await cover.ReadProblemCodeAsync());
        Assert.Empty(StoredFiles(alice));
    }

    [Fact]
    public async Task Upload_PngCarryingAScript_IsStoredWithoutIt()
    {
        const string payload = "<script>alert('coinportal-payload')</script>";
        var alice = await factory.SignUpAsync();
        var collection = await alice.FirstCollectionAsync();
        var coin = await alice.CreateCoinAsync(collection.Id);

        var photo = await alice.UploadPhotoAsync(coin.Id, image: TestImages.PngWithPayload(200, 160, payload));
        await alice.UploadCoverAsync(collection.Id, TestImages.PngWithPayload(640, 360, payload));

        var files = StoredFiles(alice);
        Assert.Equal(4, files.Count); // three photo sizes and the cover
        Assert.All(files, file => Assert.DoesNotContain("coinportal-payload",
            Encoding.Latin1.GetString(File.ReadAllBytes(file)), StringComparison.OrdinalIgnoreCase));
        using var served = await alice.Client.GetAsync($"/api/coins/{coin.Id}/photos/National/Full?v={photo.Id}");
        await served.ShouldHaveStatusAsync(HttpStatusCode.OK);
        Assert.Equal("image/webp", served.Content.Headers.ContentType?.MediaType);
        Assert.Equal("nosniff", served.Headers.GetValues("X-Content-Type-Options").Single());
    }

    [Fact]
    public async Task Upload_TinyFileClaimingHugeDimensions_IsRejectedFromItsHeader()
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.FirstCollectionAsync();
        var coin = await alice.CreateCoinAsync(collection.Id);
        var bomb = TestImages.PngClaimingSize(50_000, 50_000);
        Assert.True(bomb.Length < 2_000);

        using var photo = await alice.Client.PutFileAsync($"/api/coins/{coin.Id}/photos/National", bomb);
        using var cover = await alice.Client.PutFileAsync($"/api/collections/{collection.Id}/cover", bomb);

        Assert.Equal("invalid_image", await photo.ReadProblemCodeAsync());
        Assert.Equal("invalid_image", await cover.ReadProblemCodeAsync());
    }

    [Fact]
    public async Task Upload_FileNameWithAPath_IsIgnored()
    {
        var alice = await factory.SignUpAsync();
        var coin = await alice.CreateCoinAsync((await alice.FirstCollectionAsync()).Id);
        var name = $"escaped-{Guid.NewGuid():N}.png";

        using var response = await alice.Client.PutFileAsync($"/api/coins/{coin.Id}/photos/National",
            TestImages.Png(200, 160), "../../../" + name);
        await response.ShouldHaveStatusAsync(HttpStatusCode.OK);

        // Stored under the user's folder by ids only; nothing named after the upload anywhere near
        Assert.Equal(3, StoredFiles(alice).Count);
        var root = Path.GetFullPath(factory.PhotoRoot);
        foreach (var folder in new[] { root, Path.GetDirectoryName(root)!, AppContext.BaseDirectory })
        {
            Assert.Empty(Directory.EnumerateFiles(folder, name, SearchOption.TopDirectoryOnly));
        }
        Assert.Empty(Directory.EnumerateFiles(root, name, SearchOption.AllDirectories));
    }

    // Hostile query values: refused with 400 or treated as plain text, never a 500

    [Theory]
    [InlineData("%", "Half 50%")]
    [InlineData("_", "Snake_case")]
    [InlineData("[", "Bracket [A]")]
    [InlineData("[a-z]", "")]
    [InlineData("'", "O'Brien")]
    [InlineData("' OR '1'='1", "")]
    public async Task Search_WildcardsAndQuotes_AreMatchedLiterally(string search, string expected)
    {
        var alice = await factory.SignUpAsync();
        var collection = await alice.FirstCollectionAsync();
        foreach (var title in new[] { "Half 50%", "Snake_case", "Bracket [A]", "O'Brien", "Plain" })
        {
            await alice.CreateCoinAsync(collection.Id, title);
        }

        var found = await alice.Client.GetJsonAsync<PagedResponse<CoinResponse>>(
            $"/api/coins?search={Uri.EscapeDataString(search)}");

        Assert.Equal(expected, string.Join(",", found.Items.Select(c => c.Title)));
    }

    [Theory]
    [InlineData("page=0")]
    [InlineData("page=100001")]
    [InlineData("page=99999999999")]
    [InlineData("page=abc")]
    [InlineData("pageSize=-1")]
    [InlineData("pageSize=101")]
    [InlineData("sort=Owner")]
    [InlineData("sort=Title;DROP")]
    [InlineData("dir=Sideways")]
    [InlineData("countryOrder=DE;AT")]
    [InlineData("countryOrder=DE,AT')--")]
    [InlineData("countryOrder=DEU,AT")]
    [InlineData("collectionId=0")]
    [InlineData("collectionId=-1")]
    [InlineData("year=99999")]
    [InlineData("countryCode=DEU")]
    [InlineData("denomination=Euro3")]
    public async Task CoinList_InvalidQuery_Is400(string query)
    {
        var alice = await factory.SignUpAsync();
        using var visitor = await factory.CreateAnonymousClientAsync();

        foreach (var (client, url) in new[] { (alice.Client, "/api/coins"), (visitor, "/api/public/coins") })
        {
            using var response = await client.GetAsync($"{url}?{query}");
            await response.ShouldHaveStatusAsync(HttpStatusCode.BadRequest);
        }
    }

    [Fact]
    public async Task LongValues_AreRefusedOrNotFound()
    {
        var alice = await factory.SignUpAsync();
        using var visitor = await factory.CreateAnonymousClientAsync();
        var countries = string.Join(",", Enumerable.Repeat("DE", 101)); // 302 characters

        await alice.Client.ExpectStatusAsync($"/api/coins?search={new string('x', 101)}", HttpStatusCode.BadRequest);
        await alice.Client.ExpectStatusAsync($"/api/coins?countryOrder={countries}", HttpStatusCode.BadRequest);
        await visitor.ExpectStatusAsync($"/api/public/coins?owner={new string('x', 257)}", HttpStatusCode.BadRequest);
        await visitor.ExpectStatusAsync($"/api/public/users/{new string('x', 2_000)}", HttpStatusCode.NotFound);
    }

    [Theory]
    [InlineData("%")]
    [InlineData("_")]
    [InlineData("%25")]
    [InlineData("..%2F..%2Fadmin")]
    [InlineData("a'--")]
    public async Task PublicProfile_WithWildcardsOrPaths_IsNotFound(string userName)
    {
        // A user with a public collection exists, so a wildcard match would find them
        var alice = await factory.SignUpAsync();
        await alice.CreatePublicCollectionAsync();
        using var visitor = await factory.CreateAnonymousClientAsync();

        await visitor.ExpectStatusAsync($"/api/public/users/{userName}", HttpStatusCode.NotFound);
        var explore = await visitor.GetJsonAsync<PagedResponse<ExploreCoinResponse>>(
            $"/api/public/coins?owner={Uri.EscapeDataString(userName)}");
        Assert.Empty(explore.Items);
    }

    // Malformed bodies and invisible characters

    [Theory]
    [InlineData("""{"name":"x","visibility":"Bogus"}""")]
    [InlineData("""{"name":"x","visibility":99999999999999999999}""")]
    [InlineData("""{"name":"x","description":[[[[]]]]}""")]
    [InlineData("""{"name": """)]
    public async Task MalformedBody_IsRejected_WithoutInternalDetails(string json)
    {
        // The serializer's own message names internal types and positions (2026-10-06, pentest)
        var alice = await factory.SignUpAsync();

        using var response = await alice.Client.SendRawJsonAsync(HttpMethod.Post, "/api/collections", json);

        await response.ShouldHaveStatusAsync(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync();
        Assert.DoesNotContain("CoinPortal.", body);
        Assert.DoesNotContain("System.", body);
        Assert.DoesNotContain("LineNumber", body);
    }

    [Theory]
    [InlineData("name", "a\u0000b")]
    [InlineData("name", "tab\there")]
    [InlineData("name", "bell\u0007")]
    [InlineData("description", "a\u0000b")]
    [InlineData("description", "escape \u001b[31m")]
    public async Task Collection_ControlCharacters_AreRejected(string field, string value)
    {
        var alice = await factory.SignUpAsync();
        var request = new CollectionUpsertRequest { Name = "Clean", Description = "Clean" };
        if (field == "name")
        {
            request.Name = value;
        }
        else
        {
            request.Description = value;
        }

        using var response = await alice.Client.PostAsync("/api/collections", request);

        Assert.Contains(field, await response.ReadValidationKeysAsync(), StringComparer.OrdinalIgnoreCase);
    }

    [Theory]
    [InlineData("title", "a\u0000b")]
    [InlineData("mintMark", "A\u0000")]
    [InlineData("description", "del\u007f")]
    public async Task Coin_ControlCharacters_AreRejected(string field, string value)
    {
        var alice = await factory.SignUpAsync();
        var coin = TestUser.NewCoin((await alice.FirstCollectionAsync()).Id);
        switch (field)
        {
            case "title": coin.Title = value; break;
            case "mintMark": coin.MintMark = value; break;
            default: coin.Description = value; break;
        }

        using var response = await alice.Client.PostAsync("/api/coins", coin);

        Assert.Contains(field, await response.ReadValidationKeysAsync(), StringComparer.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Descriptions_KeepLineBreaksAndTabs()
    {
        var alice = await factory.SignUpAsync();
        const string text = "First line\r\nSecond line\n\tIndented";

        var collection = await alice.CreateCollectionAsync();
        using var update = await alice.Client.PutAsync($"/api/collections/{collection.Id}",
            new CollectionUpsertRequest { Name = collection.Name, Description = text });
        var coin = TestUser.NewCoin(collection.Id);
        coin.Description = text;
        using var create = await alice.Client.PostAsync("/api/coins", coin);

        Assert.Equal(text, (await update.ReadJsonAsync<CollectionResponse>()).Description);
        Assert.Equal(text, (await create.ReadJsonAsync<CoinResponse>()).Description);
    }

    [Fact]
    public async Task SignUpNames_ControlCharacters_AreRejected()
    {
        using var client = await factory.CreateAnonymousClientAsync();
        var request = TestUser.NewRegisterRequest() with { FirstName = "Ad\u0000a", LastName = "Love\u0007lace" };

        using var response = await client.PostAsync("/api/auth/register", request);

        var keys = await response.ReadValidationKeysAsync();
        Assert.Contains("FirstName", keys, StringComparer.OrdinalIgnoreCase);
        Assert.Contains("LastName", keys, StringComparer.OrdinalIgnoreCase);
    }

    private List<string> StoredFiles(TestUser user)
    {
        var folder = Path.Combine(factory.PhotoRoot, user.User.Id);
        return Directory.Exists(folder) ? Directory.GetFiles(folder, "*", SearchOption.AllDirectories).ToList() : [];
    }
}
