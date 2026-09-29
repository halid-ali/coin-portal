using Microsoft.AspNetCore.Mvc;

namespace CoinPortal.Api.Controllers;

public static class CodedProblemExtensions
{
    /// <summary>
    /// ProblemDetails with a machine readable "code" extension, so the client can show its own
    /// (localized) message, e.g. { "title": "...", "code": "last_collection" }.
    /// </summary>
    public static ObjectResult CodedProblem(this ControllerBase controller, string code, string title,
        int status = StatusCodes.Status400BadRequest)
    {
        var problem = controller.ProblemDetailsFactory.CreateProblemDetails(controller.HttpContext, status, title);
        problem.Extensions["code"] = code;
        return new ObjectResult(problem) { StatusCode = status };
    }
}
