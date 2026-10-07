using System.Globalization;
using CoinPortal.Api.Accounts;
using CoinPortal.Api.Contracts.Admin;
using CoinPortal.Api.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.EntityFrameworkCore;

namespace CoinPortal.Api.Controllers.Admin;

/// <summary>
/// The one-time request to verify the e-mail address (VerificationRequests): how many accounts are
/// left, and starting a run, which sends in the background. The start is written to the audit log
/// with the number of accounts.
/// </summary>
[Route("api/admin/verification-requests")]
public class AdminVerificationRequestsController(AppDbContext db, VerificationRequests requests)
    : AdminControllerBase
{
    [HttpGet]
    public async Task<AdminVerificationRequestsResponse> Get(CancellationToken ct) =>
        new(await VerificationRequests.Pending(db).CountAsync(ct), AdminVerificationRunResponse.From(requests.LastRun));

    /// <summary>202 with the run; 409 already_running while one goes.</summary>
    [HttpPost]
    [ProducesResponseType<AdminVerificationRequestsResponse>(StatusCodes.Status202Accepted)]
    [ProducesResponseType<ProblemDetails>(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Start(
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] AdminNoteRequest? request, CancellationToken ct)
    {
        var pending = await VerificationRequests.Pending(db).CountAsync(ct);
        if (!requests.TryStart(out var run))
        {
            return this.CodedProblem("already_running", "Verification e-mails are being sent already.",
                StatusCodes.Status409Conflict);
        }
        Audit(db, AuditAction.VerificationEmailsRequested, note: request?.Note).NewValue =
            pending.ToString(CultureInfo.InvariantCulture);
        await db.SaveChangesAsync(ct);
        return Accepted(new AdminVerificationRequestsResponse(pending, AdminVerificationRunResponse.From(run)));
    }
}
