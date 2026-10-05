using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using CoinPortal.Api.Contracts.Auth;

namespace CoinPortal.Api.Tests.Infrastructure;

/// <summary>
/// Talks to the API the way the Angular client does: cookies are kept, the readable XSRF-TOKEN
/// cookie is sent back in the X-XSRF-TOKEN header on unsafe requests, and the token is renewed
/// after every sign-in and sign-out (it is bound to the user).
/// </summary>
public sealed class ApiClient(HttpClient http) : IDisposable
{
    /// <summary>The API's JSON rules: camelCase, enums as names.</summary>
    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    private const string XsrfCookie = "XSRF-TOKEN=";

    private string? xsrfToken;

    public async Task RefreshAntiforgeryAsync()
    {
        using var response = await http.GetAsync("/api/auth/antiforgery");
        await response.ShouldHaveStatusAsync(System.Net.HttpStatusCode.NoContent);
        var cookie = response.Headers.GetValues("Set-Cookie").Single(c => c.StartsWith(XsrfCookie));
        var end = cookie.IndexOf(';');
        xsrfToken = Uri.UnescapeDataString(cookie[XsrfCookie.Length..(end < 0 ? cookie.Length : end)]);
    }

    public async Task<UserResponse> RegisterAsync(RegisterRequest request)
    {
        using var response = await PostAsync("/api/auth/register", request);
        var user = await response.ReadJsonAsync<UserResponse>();
        await RefreshAntiforgeryAsync();
        return user;
    }

    public async Task<HttpResponseMessage> LoginAsync(string userNameOrEmail, string password)
    {
        var response = await PostAsync("/api/auth/login", new LoginRequest(userNameOrEmail, password));
        if (response.IsSuccessStatusCode)
        {
            await RefreshAntiforgeryAsync();
        }
        return response;
    }

    public async Task LogoutAsync()
    {
        using var response = await PostAsync("/api/auth/logout");
        await response.ShouldHaveStatusAsync(System.Net.HttpStatusCode.NoContent);
        await RefreshAntiforgeryAsync();
    }

    public Task<HttpResponseMessage> GetAsync(string url) => http.GetAsync(url);

    /// <summary>A conditional GET: If-None-Match with the given entity tag.</summary>
    public Task<HttpResponseMessage> GetIfNoneMatchAsync(string url, EntityTagHeaderValue etag)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.IfNoneMatch.Add(etag);
        return http.SendAsync(request);
    }

    public async Task<T> GetJsonAsync<T>(string url)
    {
        using var response = await http.GetAsync(url);
        return await response.ReadJsonAsync<T>();
    }

    public Task<HttpResponseMessage> PostAsync(string url, object? body = null) =>
        SendAsync(HttpMethod.Post, url, body is null ? null : JsonContent.Create(body, options: Json));

    public Task<HttpResponseMessage> PutAsync(string url, object body) =>
        SendAsync(HttpMethod.Put, url, JsonContent.Create(body, options: Json));

    /// <summary>Sends the JSON text as is, for tests of the wire format.</summary>
    public Task<HttpResponseMessage> SendRawJsonAsync(HttpMethod method, string url, string json) =>
        SendAsync(method, url, new StringContent(json, Encoding.UTF8, "application/json"));

    public Task<HttpResponseMessage> DeleteAsync(string url) => SendAsync(HttpMethod.Delete, url);

    public Task<HttpResponseMessage> DeleteAsync(string url, object body) =>
        SendAsync(HttpMethod.Delete, url, JsonContent.Create(body, options: Json));

    /// <summary>Multipart upload in the field "file", like the photo and cover forms.</summary>
    public Task<HttpResponseMessage> PutFileAsync(string url, byte[] bytes, string fileName = "photo.png",
        string contentType = "image/png")
    {
        var file = new ByteArrayContent(bytes);
        file.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        return SendAsync(HttpMethod.Put, url, new MultipartFormDataContent { { file, "file", fileName } });
    }

    /// <summary>
    /// A coin with its photos in one multipart request, like the coin form: the field "coin" holds
    /// the request as JSON, the files are "national" and "common".
    /// </summary>
    public Task<HttpResponseMessage> PostCoinWithPhotosAsync(string url, object coin, byte[]? national = null,
        byte[]? common = null)
    {
        var content = new MultipartFormDataContent { { new StringContent(JsonSerializer.Serialize(coin, Json)), "coin" } };
        foreach (var (name, bytes) in new[] { ("national", national), ("common", common) })
        {
            if (bytes is not null)
            {
                var file = new ByteArrayContent(bytes);
                file.Headers.ContentType = new MediaTypeHeaderValue("image/png");
                content.Add(file, name, name + ".png");
            }
        }
        return SendAsync(HttpMethod.Post, url, content);
    }

    public async Task<HttpResponseMessage> SendAsync(HttpMethod method, string url, HttpContent? content = null,
        bool withAntiforgeryToken = true)
    {
        using var request = new HttpRequestMessage(method, url) { Content = content };
        if (withAntiforgeryToken && xsrfToken is not null)
        {
            request.Headers.Add("X-XSRF-TOKEN", xsrfToken);
        }
        return await http.SendAsync(request);
    }

    public void Dispose() => http.Dispose();
}
