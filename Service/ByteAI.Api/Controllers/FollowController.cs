using ByteAI.Api.Common.Auth;
using ByteAI.Api.ViewModels.Common;
using ByteAI.Core.Business.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ByteAI.Api.Controllers;

[ApiController]
[Route("api/users/{userId:guid}/follow")]
[Produces("application/json")]
[Tags("Follow")]
[RequireRole("user")]
public sealed class FollowController(IFollowBusiness followBusiness) : ControllerBase
{
    /// <summary>Follow a user.</summary>
    [HttpPost]
    [Authorize]
    [EnableRateLimiting("social")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiResponse<bool>>> FollowUser(Guid userId, CancellationToken ct)
    {
        var supabaseUserId = HttpContext.GetSupabaseUserId() ?? throw new UnauthorizedAccessException();

        try
        {
            var ok = await followBusiness.FollowUserAsync(supabaseUserId, userId, ct);
            return Ok(ApiResponse<bool>.Success(ok));
        }
        catch (UnauthorizedAccessException) { return Unauthorized(); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>Unfollow a user.</summary>
    [HttpDelete]
    [Authorize]
    [EnableRateLimiting("social")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<bool>>> UnfollowUser(Guid userId, CancellationToken ct)
    {
        var supabaseUserId = HttpContext.GetSupabaseUserId() ?? throw new UnauthorizedAccessException();

        try
        {
            var ok = await followBusiness.UnfollowUserAsync(supabaseUserId, userId, ct);
            if (!ok) return NotFound(new { message = "Follow relationship not found" });
            return Ok(ApiResponse<bool>.Success(true));
        }
        catch (UnauthorizedAccessException) { return Unauthorized(); }
    }
}
