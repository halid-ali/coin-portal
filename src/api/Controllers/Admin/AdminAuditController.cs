using CoinPortal.Api.Contracts.Admin;
using CoinPortal.Api.Contracts.Common;
using CoinPortal.Api.Data;
using CoinPortal.Api.Querying;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CoinPortal.Api.Controllers.Admin;

/// <summary>What admins did, newest first. Entries are only ever added (by the other admin endpoints).</summary>
[Route("api/admin/audit")]
public class AdminAuditController(AppDbContext db) : AdminControllerBase
{
    [HttpGet]
    [ProducesResponseType<ValidationProblemDetails>(StatusCodes.Status400BadRequest)]
    public async Task<PagedResponse<AdminAuditEntryResponse>> List([FromQuery] AdminAuditQuery query, CancellationToken ct)
    {
        var entries = db.AuditLog.AsNoTracking();
        if (query.Action is { } action)
        {
            entries = entries.Where(e => e.Action == action);
        }
        if (!string.IsNullOrWhiteSpace(query.UserId))
        {
            entries = entries.Where(e => e.TargetUserId == query.UserId);
        }
        if (query.CollectionId is { } collectionId)
        {
            entries = entries.Where(e => e.TargetCollectionId == collectionId);
        }

        return await entries.OrderByDescending(e => e.CreatedAtUtc).ThenByDescending(e => e.Id)
            .ToPagedAsync(query.Page, query.PageSize, e => new AdminAuditEntryResponse(
                e.Id, e.CreatedAtUtc, e.ActorId, e.ActorUserName, e.Action, e.TargetUserId, e.TargetUserName,
                e.TargetCollectionId, e.TargetCollectionName, e.Note), ct);
    }
}
