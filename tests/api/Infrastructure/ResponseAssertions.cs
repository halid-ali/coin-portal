using System.Net;
using System.Net.Http.Json;
using System.Text.Json;

namespace CoinPortal.Api.Tests.Infrastructure;

public static class ResponseAssertions
{
    /// <summary>Fails with the response body in the message, which usually explains why.</summary>
    public static async Task ShouldHaveStatusAsync(this HttpResponseMessage response, HttpStatusCode expected)
    {
        if (response.StatusCode != expected)
        {
            var body = await response.Content.ReadAsStringAsync();
            Assert.Fail($"Expected {(int)expected} {expected}, got {(int)response.StatusCode} {response.StatusCode}: {body}");
        }
    }

    /// <summary>Expects a 2xx response and reads its JSON body.</summary>
    public static async Task<T> ReadJsonAsync<T>(this HttpResponseMessage response)
    {
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync();
            Assert.Fail($"Expected success, got {(int)response.StatusCode} {response.StatusCode}: {body}");
        }
        return (await response.Content.ReadFromJsonAsync<T>(ApiClient.Json))!;
    }

    /// <summary>The "code" of a coded ProblemDetails (CodedProblem in the API), after checking the status.</summary>
    public static async Task<string?> ReadProblemCodeAsync(this HttpResponseMessage response,
        HttpStatusCode expected = HttpStatusCode.BadRequest)
    {
        await response.ShouldHaveStatusAsync(expected);
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return json.RootElement.TryGetProperty("code", out var code) ? code.GetString() : null;
    }

    /// <summary>Keys of a 400 ValidationProblemDetails ("errors"), e.g. "BirthDate" or "DuplicateName".</summary>
    public static async Task<IReadOnlyList<string>> ReadValidationKeysAsync(this HttpResponseMessage response)
    {
        await response.ShouldHaveStatusAsync(HttpStatusCode.BadRequest);
        using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return json.RootElement.GetProperty("errors").EnumerateObject().Select(p => p.Name).ToList();
    }
}
