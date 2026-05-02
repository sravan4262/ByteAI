using ByteAI.Api.Common.Auth;
using ByteAI.Api.ViewModels;
using ByteAI.Api.ViewModels.Common;
using ByteAI.Core.Business;
using ByteAI.Core.Business.Interfaces;
using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ByteAI.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Produces("application/json")]
[Tags("Admin")]
[Authorize]
[RequireRole("admin")] // Only admins can access these endpoints
public sealed class AdminController(
    IAdminBusiness adminBusiness,
    ISupportBusiness supportBusiness,
    ICurrentUserService currentUserService) : ControllerBase
{
    public sealed record UpsertFeatureFlagRequest(string Key, string Name, string? Description, bool GlobalOpen);
    public sealed record ToggleFeatureFlagRequest(bool GlobalOpen);

    [HttpGet("feature-flags")]
    [ProducesResponseType(typeof(ApiResponse<List<FeatureFlagType>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<FeatureFlagType>>>> GetAllFeatureFlags(CancellationToken ct)
    {
        var flags = await adminBusiness.GetAllFeatureFlagsAsync(ct);
        return Ok(ApiResponse<List<FeatureFlagType>>.Success(flags));
    }

    [HttpPost("feature-flags")]
    [ProducesResponseType(typeof(ApiResponse<FeatureFlagType>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<FeatureFlagType>>> UpsertFeatureFlag([FromBody] UpsertFeatureFlagRequest request, CancellationToken ct)
    {
        var flag = await adminBusiness.UpsertFeatureFlagAsync(request.Key, request.Name, request.Description, request.GlobalOpen, ct);
        return Ok(ApiResponse<FeatureFlagType>.Success(flag));
    }

    [HttpPut("feature-flags/{key}")]
    [ProducesResponseType(typeof(ApiResponse<FeatureFlagType>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<FeatureFlagType>>> ToggleFeatureFlag(string key, [FromBody] ToggleFeatureFlagRequest request, CancellationToken ct)
    {
        try
        {
            var flag = await adminBusiness.SetFeatureFlagEnabledAsync(key, request.GlobalOpen, ct);
            return Ok(ApiResponse<FeatureFlagType>.Success(flag));
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = $"Feature flag '{key}' not found." });
        }
    }

    [HttpDelete("feature-flags/{key}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteFeatureFlag(string key, CancellationToken ct)
    {
        var deleted = await adminBusiness.DeleteFeatureFlagAsync(key, ct);
        if (!deleted) return NotFound(new { message = $"Feature flag '{key}' not found." });
        return NoContent();
    }

    [HttpPost("feature-flags/{key}/users/{userId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> AssignFeatureFlagToUser(string key, Guid userId, CancellationToken ct)
    {
        try
        {
            await adminBusiness.AssignFeatureFlagToUserAsync(key, userId, ct);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = $"Feature flag '{key}' not found." });
        }
    }

    [HttpDelete("feature-flags/{key}/users/{userId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> RemoveFeatureFlagFromUser(string key, Guid userId, CancellationToken ct)
    {
        try
        {
            await adminBusiness.RemoveFeatureFlagFromUserAsync(key, userId, ct);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = $"Feature flag '{key}' not found." });
        }
    }

    [HttpGet("feature-flags/users/{userId:guid}")]
    [ProducesResponseType(typeof(ApiResponse<List<string>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<string>>>> GetUserAssignedFeatureFlags(Guid userId, CancellationToken ct)
    {
        var flagKeys = await adminBusiness.GetUserAssignedFeatureFlagsAsync(userId, ct);
        return Ok(ApiResponse<List<string>>.Success(flagKeys));
    }

    // ── Role management ──────────────────────────────────────────────────────

    public sealed record CreateRoleRequest(string Name, string Label, string? Description);

    [HttpGet("roles")]
    [ProducesResponseType(typeof(ApiResponse<List<RoleResponse>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<RoleResponse>>>> GetAllRoles(CancellationToken ct)
    {
        var roles = await adminBusiness.GetAllRolesAsync(ct);
        return Ok(ApiResponse<List<RoleResponse>>.Success(roles.Select(ToRoleResponse).ToList()));
    }

    [HttpPost("roles")]
    [ProducesResponseType(typeof(ApiResponse<RoleResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<ApiResponse<RoleResponse>>> CreateRole([FromBody] CreateRoleRequest request, CancellationToken ct)
    {
        try
        {
            var role = await adminBusiness.CreateRoleAsync(request.Name, request.Label, request.Description, ct);
            return StatusCode(201, ApiResponse<RoleResponse>.Success(ToRoleResponse(role)));
        }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpGet("users/{userId:guid}/roles")]
    [ProducesResponseType(typeof(ApiResponse<List<RoleResponse>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<RoleResponse>>>> GetUserRoles(Guid userId, CancellationToken ct)
    {
        var roles = await adminBusiness.GetUserRolesAsync(userId, ct);
        return Ok(ApiResponse<List<RoleResponse>>.Success(roles.Select(ToRoleResponse).ToList()));
    }

    [HttpPost("users/{userId:guid}/roles/{roleId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> AssignRoleToUser(Guid userId, Guid roleId, CancellationToken ct)
    {
        try { await adminBusiness.AssignRoleToUserAsync(userId, roleId, ct); return NoContent(); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    [HttpDelete("users/{userId:guid}/roles/{roleId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> RevokeRoleFromUser(Guid userId, Guid roleId, CancellationToken ct)
    {
        try { await adminBusiness.RevokeRoleFromUserAsync(userId, roleId, ct); return NoContent(); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    static RoleResponse ToRoleResponse(ByteAI.Core.Entities.RoleType r) =>
        new(r.Id, r.Name, r.Label, r.Description);

    public sealed record RoleResponse(Guid Id, string Name, string Label, string? Description);

    // ── User activity ────────────────────────────────────────────────────────

    [HttpGet("users/activity")]
    [ProducesResponseType(typeof(ApiResponse<UserActivityResponse>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<UserActivityResponse>>> GetUserActivity(
        [FromQuery] int page     = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct     = default)
    {
        var result = await adminBusiness.GetUserActivityAsync(page, pageSize, ct);
        return Ok(ApiResponse<UserActivityResponse>.Success(result));
    }

    // ── Feedback management ──────────────────────────────────────────────────

    /// <summary>List all user feedback. Filter by type (good|bad|idea) and status (open|reviewed|closed).</summary>
    [HttpGet("feedback")]
    [ProducesResponseType(typeof(ApiResponse<PagedResponse<AdminFeedbackResponse>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<PagedResponse<AdminFeedbackResponse>>>> GetAllFeedback(
        [FromQuery] string? type,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var result = await supportBusiness.GetAllFeedbackAsync(type, status, page, pageSize, ct);
        var items  = result.Items.Select(f => f.ToAdminResponse()).ToList();
        return Ok(ApiResponse<PagedResponse<AdminFeedbackResponse>>.Success(
            new PagedResponse<AdminFeedbackResponse>(items, result.Total, result.Page, result.PageSize)));
    }

    // ── Moderation watchlist & bans ──────────────────────────────────────────

    public sealed record BanUserRequest(Guid UserId, string Reason, DateTime? ExpiresAt);

    /// <summary>Users whose own content has been flagged more than <paramref name="threshold"/> times.</summary>
    [HttpGet("moderation/flagged-users")]
    [ProducesResponseType(typeof(ApiResponse<List<FlaggedUserDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<FlaggedUserDto>>>> GetFlaggedUsers(
        [FromQuery] int threshold = 5, CancellationToken ct = default)
    {
        var users = await adminBusiness.GetFlaggedUsersAsync(threshold, ct);
        return Ok(ApiResponse<List<FlaggedUserDto>>.Success(users));
    }

    /// <summary>All currently active bans (expired bans are excluded).</summary>
    [HttpGet("moderation/bans")]
    [ProducesResponseType(typeof(ApiResponse<List<BannedUserDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<BannedUserDto>>>> GetBannedUsers(CancellationToken ct)
    {
        var bans = await adminBusiness.GetBannedUsersAsync(ct);
        return Ok(ApiResponse<List<BannedUserDto>>.Success(bans));
    }

    /// <summary>Ban a user. Re-banning updates the existing ban record.</summary>
    [HttpPost("moderation/bans")]
    [ProducesResponseType(typeof(ApiResponse<UserBanDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<UserBanDto>>> BanUser(
        [FromBody] BanUserRequest request, CancellationToken ct)
    {
        var adminSupabaseId = HttpContext.GetSupabaseUserId() ?? throw new UnauthorizedAccessException();
        var adminId = await currentUserService.GetCurrentUserIdAsync(adminSupabaseId, ct) ?? Guid.Empty;

        var ban = await adminBusiness.BanUserAsync(request.UserId, request.Reason, adminId, request.ExpiresAt, ct);
        return Ok(ApiResponse<UserBanDto>.Success(ban));
    }

    /// <summary>Lift a ban. No-ops if the user is not currently banned.</summary>
    [HttpDelete("moderation/bans/{userId:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> UnbanUser(Guid userId, CancellationToken ct)
    {
        await adminBusiness.UnbanUserAsync(userId, ct);
        return NoContent();
    }

    /// <summary>Update feedback status and optionally leave a note. Fires a notification to the user when status changes.</summary>
    [HttpPut("feedback/{feedbackId:guid}")]
    [ProducesResponseType(typeof(ApiResponse<AdminFeedbackResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<AdminFeedbackResponse>>> UpdateFeedbackStatus(
        Guid feedbackId, [FromBody] UpdateFeedbackStatusRequest request, CancellationToken ct)
    {
        try
        {
            var updated = await supportBusiness.UpdateFeedbackStatusAsync(feedbackId, request.Status, request.AdminNote, ct);
            return Ok(ApiResponse<AdminFeedbackResponse>.Success(updated.ToAdminResponse()));
        }
        catch (ArgumentException ex)   { return BadRequest(new { message = ex.Message }); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    // ── Flag triage ──────────────────────────────────────────────────────────

    public sealed record UpdateFlagStatusRequest(string Status, string? Note);

    /// <summary>List flagged_content rows with optional filters. Default ordering is newest first.</summary>
    [HttpGet("moderation/flags")]
    [ProducesResponseType(typeof(ApiResponse<PagedResponse<FlaggedContentDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<PagedResponse<FlaggedContentDto>>>> GetFlaggedContent(
        [FromQuery] string? status,
        [FromQuery] string? contentType,
        [FromQuery] string? severity,
        [FromQuery] Guid?   authorId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var filter = new FlagFilter(status, contentType, severity, authorId, from, to);
        var result = await adminBusiness.GetFlaggedContentAsync(filter, page, pageSize, ct);
        var response = new PagedResponse<FlaggedContentDto>(
            result.Items.ToList(), result.Total, result.Page, result.PageSize);
        return Ok(ApiResponse<PagedResponse<FlaggedContentDto>>.Success(response));
    }

    /// <summary>All flag rows authored by a specific user. Powers the per-user drilldown.</summary>
    [HttpGet("moderation/users/{userId:guid}/flags")]
    [ProducesResponseType(typeof(ApiResponse<List<FlaggedContentDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<FlaggedContentDto>>>> GetUserFlags(
        Guid userId, CancellationToken ct)
    {
        var flags = await adminBusiness.GetUserFlagsAsync(userId, ct);
        return Ok(ApiResponse<List<FlaggedContentDto>>.Success(flags));
    }

    /// <summary>
    /// Update a flag's status. On <c>removed</c> with a real <c>content_id</c>, the source
    /// content is hidden (bytes/interviews) or hard-deleted (comments).
    /// </summary>
    [HttpPut("moderation/flags/{flagId:guid}")]
    [ProducesResponseType(typeof(ApiResponse<FlaggedContentDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<FlaggedContentDto>>> UpdateFlagStatus(
        Guid flagId, [FromBody] UpdateFlagStatusRequest request, CancellationToken ct)
    {
        try
        {
            var adminSupabaseId = HttpContext.GetSupabaseUserId() ?? throw new UnauthorizedAccessException();
            var adminId = await currentUserService.GetCurrentUserIdAsync(adminSupabaseId, ct) ?? Guid.Empty;

            var updated = await adminBusiness.UpdateFlagStatusAsync(flagId, request.Status, request.Note, adminId, ct);
            if (updated is null)
                return NotFound(new { message = $"Flag {flagId} not found" });

            return Ok(ApiResponse<FlaggedContentDto>.Success(updated));
        }
        catch (ArgumentException ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>Append-only ban audit history for one user, newest first.</summary>
    [HttpGet("moderation/users/{userId:guid}/ban-history")]
    [ProducesResponseType(typeof(ApiResponse<List<UserBanHistoryDto>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<List<UserBanHistoryDto>>>> GetUserBanHistory(
        Guid userId, CancellationToken ct)
    {
        var history = await adminBusiness.GetUserBanHistoryAsync(userId, ct);
        return Ok(ApiResponse<List<UserBanHistoryDto>>.Success(history));
    }
}
