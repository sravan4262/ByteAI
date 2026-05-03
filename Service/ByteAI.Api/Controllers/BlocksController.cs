using ByteAI.Api.Common.Auth;
using ByteAI.Api.ViewModels.Common;
using ByteAI.Core.Infrastructure.Persistence;
using ByteAI.Core.Infrastructure.Services;
using ByteAI.Core.Services.Moderation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;

namespace ByteAI.Api.Controllers;

/// <summary>
/// User-to-user block endpoints. Blocks are symmetric — once A blocks B, neither
/// sees the other's content (enforced by ExcludeBlockedFor on every list query).
/// </summary>
[ApiController]
[Route("api/users")]
[Produces("application/json")]
[Tags("Blocks")]
[Authorize]
[RequireRole("user")]
public sealed class BlocksController(
    IUserBlockService blockService,
    ICurrentUserService currentUserService,
    AppDbContext db) : ControllerBase
{
    /// <summary>Block another user. Idempotent — second call returns 200.</summary>
    [HttpPost("{userId:guid}/block")]
    [EnableRateLimiting("social")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Block(Guid userId, CancellationToken ct)
    {
        var supabaseUserId = HttpContext.GetSupabaseUserId() ?? throw new UnauthorizedAccessException();
        var blockerId = await currentUserService.GetCurrentUserIdAsync(supabaseUserId, ct);
        if (blockerId is null) return Unauthorized();

        if (blockerId == userId)
            return BadRequest(new { error = "CANNOT_BLOCK_SELF" });

        var targetExists = await db.Users.AsNoTracking().AnyAsync(u => u.Id == userId, ct);
        if (!targetExists) return NotFound();

        var alreadyBlocked = await blockService.HasBlockedAsync(blockerId.Value, userId, ct);
        await blockService.BlockAsync(blockerId.Value, userId, ct);

        return alreadyBlocked
            ? Ok(new { ok = true })
            : StatusCode(StatusCodes.Status201Created, new { ok = true });
    }

    /// <summary>Unblock a user. Idempotent — second call still returns 204.</summary>
    [HttpDelete("{userId:guid}/block")]
    [EnableRateLimiting("social")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Unblock(Guid userId, CancellationToken ct)
    {
        var supabaseUserId = HttpContext.GetSupabaseUserId() ?? throw new UnauthorizedAccessException();
        var blockerId = await currentUserService.GetCurrentUserIdAsync(supabaseUserId, ct);
        if (blockerId is null) return Unauthorized();

        await blockService.UnblockAsync(blockerId.Value, userId, ct);
        return NoContent();
    }

    /// <summary>List the users the caller has blocked. Paginated.</summary>
    [HttpGet("blocks")]
    [ProducesResponseType(typeof(ApiResponse<PagedResponse<BlockedUserResponse>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> ListBlocks(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        var supabaseUserId = HttpContext.GetSupabaseUserId() ?? throw new UnauthorizedAccessException();
        var blockerId = await currentUserService.GetCurrentUserIdAsync(supabaseUserId, ct);
        if (blockerId is null) return Unauthorized();

        var items = await blockService.GetBlockedUsersAsync(blockerId.Value, page, pageSize, ct);
        var total = await db.UserBlocks.CountAsync(b => b.BlockerId == blockerId.Value, ct);

        var response = new PagedResponse<BlockedUserResponse>(
            items.Select(b => new BlockedUserResponse(b.Id, b.Username, b.DisplayName, b.AvatarUrl, b.BlockedAt)).ToList(),
            total, page, pageSize);
        return Ok(ApiResponse<PagedResponse<BlockedUserResponse>>.Success(response));
    }
}

public sealed record BlockedUserResponse(
    Guid Id,
    string Username,
    string DisplayName,
    string? AvatarUrl,
    DateTime BlockedAt);
