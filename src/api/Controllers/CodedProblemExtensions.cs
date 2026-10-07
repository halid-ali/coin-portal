using CoinPortal.Api.Data;
using CoinPortal.Api.Publishing;
using Microsoft.AspNetCore.Mvc;

namespace CoinPortal.Api.Controllers;

public static class CodedProblemExtensions
{
    /// <summary>
    /// ProblemDetails with a machine readable "code" extension, so the client can show its own
    /// (localized) message, e.g. { "title": "...", "code": "last_collection" }. Further
    /// extensions carry the values the client's message needs.
    /// </summary>
    public static ObjectResult CodedProblem(this ControllerBase controller, string code, string title,
        int status = StatusCodes.Status400BadRequest, IReadOnlyDictionary<string, object?>? extensions = null)
    {
        var problem = controller.ProblemDetailsFactory.CreateProblemDetails(controller.HttpContext, status, title);
        problem.Extensions["code"] = code;
        foreach (var (key, value) in extensions ?? new Dictionary<string, object?>())
        {
            problem.Extensions[key] = value;
        }
        return new ObjectResult(problem) { StatusCode = status };
    }

    /// <summary>
    /// 400 public_requirements: the collection cannot become Public yet; the counts let the client
    /// say what is missing.
    /// </summary>
    public static ObjectResult PublicRequirementsNotMet(this ControllerBase controller, PublicationStatus status) =>
        controller.CodedProblem("public_requirements",
            "A public collection needs photos of all its coins and a minimum number of photographed coins.",
            extensions: new Dictionary<string, object?>
            {
                ["coinCount"] = status.CoinCount,
                ["photographedCoinCount"] = status.PhotographedCoinCount,
                ["minPublicCoins"] = status.MinPublicCoins,
            });

    /// <summary>
    /// 403 email_not_confirmed: sharing a collection (Public or Unlisted) or opening another one
    /// needs a verified e-mail address (Accounts.UnverifiedAccounts). What is shared already stays
    /// shared.
    /// </summary>
    public static ObjectResult EmailNotConfirmed(this ControllerBase controller) =>
        controller.CodedProblem("email_not_confirmed",
            "Confirm your e-mail address first.", StatusCodes.Status403Forbidden);

    /// <summary>
    /// 403 unverified_coin_limit: an account without a verified e-mail address holds as many coins
    /// as the site allows it (SiteSettings.UnverifiedMaxCoins, in "maxCoins").
    /// </summary>
    public static ObjectResult UnverifiedCoinLimit(this ControllerBase controller, int maxCoins) =>
        controller.CodedProblem("unverified_coin_limit",
            "Confirm your e-mail address to add more coins.", StatusCodes.Status403Forbidden,
            new Dictionary<string, object?> { ["maxCoins"] = maxCoins });

    /// <summary>
    /// 409 would_unpublish: the action would break the rule of these Public collections. Sent again
    /// with ?unpublish=true it goes ahead and makes them Unlisted.
    /// </summary>
    public static ObjectResult WouldUnpublish(this ControllerBase controller, IEnumerable<Collection> collections) =>
        controller.CodedProblem("would_unpublish",
            "This would take a public collection below its requirements. Confirm with unpublish=true to make it unlisted.",
            StatusCodes.Status409Conflict,
            new Dictionary<string, object?>
            {
                ["collections"] = collections.Select(c => new { id = c.Id, name = c.Name }).ToList(),
            });
}
