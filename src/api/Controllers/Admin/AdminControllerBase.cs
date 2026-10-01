using System.Security.Claims;
using CoinPortal.Api.Authorization;
using CoinPortal.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CoinPortal.Api.Controllers.Admin;

/// <summary>
/// Base of every api/admin controller: the Admin policy comes with it, so no admin endpoint can
/// be left open by a forgotten attribute.
/// </summary>
[ApiController]
[Authorize(Policy = AuthPolicies.Admin)]
[ProducesResponseType(StatusCodes.Status401Unauthorized)]
[ProducesResponseType(StatusCodes.Status403Forbidden)]
public abstract class AdminControllerBase : ControllerBase
{
    /// <summary>
    /// Adds an audit log entry for the signed-in admin; it is saved with the action's own changes.
    /// The target user is the collection's owner when only a collection is given (Owner loaded).
    /// </summary>
    protected AuditLogEntry Audit(AppDbContext db, AuditAction action, ApplicationUser? user = null,
        Collection? collection = null, string? note = null)
    {
        var owner = user ?? collection?.Owner;
        var entry = new AuditLogEntry
        {
            CreatedAtUtc = DateTime.UtcNow,
            ActorId = User.FindFirstValue(ClaimTypes.NameIdentifier)!,
            ActorUserName = User.Identity!.Name!,
            Action = action,
            TargetUserId = owner?.Id,
            TargetUserName = owner?.UserName,
            TargetCollectionId = collection?.Id,
            TargetCollectionName = collection?.Name,
            Note = string.IsNullOrWhiteSpace(note) ? null : note.Trim(),
        };
        db.AuditLog.Add(entry);
        return entry;
    }
}
