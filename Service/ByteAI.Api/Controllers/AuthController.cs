using ByteAI.Api.Common.Auth;
using ByteAI.Api.ViewModels.Common;
using ByteAI.Core.Business.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ByteAI.Api.Controllers;

[ApiController]
[Route("api/auth")]
[Produces("application/json")]
[Tags("Auth")]
public sealed class AuthController(
    IUsersBusiness usersBusiness,
    ILogger<AuthController> logger) : ControllerBase
{
    /// <summary>
    /// Provision a user profile after Supabase OAuth sign-in.
    /// Creates the profile on first call; subsequent calls are idempotent.
    /// Called by the frontend immediately after the OAuth callback completes.
    /// </summary>
    [HttpPost("provision")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<ProvisionResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiResponse<ProvisionResponse>>> Provision(
        [FromBody] ProvisionRequest request,
        CancellationToken ct)
    {
        var supabaseUserId = HttpContext.GetSupabaseUserId();
        if (supabaseUserId is null) return Unauthorized();

        var user = await usersBusiness.ProvisionUserAsync(
            supabaseUserId,
            request.DisplayName,
            request.AvatarUrl,
            request.Email,
            ct);

        logger.LogInformation("Provisioned user {UserId} (supabase: {SupabaseUserId})", user.Id, supabaseUserId);

        return Ok(ApiResponse<ProvisionResponse>.Success(
            new ProvisionResponse(user.Id, user.Username, user.IsOnboarded)));
    }

    /// <summary>
    /// Delete the current user's app profile. The Supabase auth.users record is
    /// deleted separately via the Supabase admin SDK or dashboard.
    /// </summary>
    [HttpDelete("account")]
    [Authorize]
    [RequireRole("user")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteAccount(CancellationToken ct)
    {
        var supabaseUserId = HttpContext.GetSupabaseUserId();
        if (supabaseUserId is null) return Unauthorized();

        var deleted = await usersBusiness.DeleteUserAsync(supabaseUserId, ct);
        if (!deleted) return NotFound();

        logger.LogInformation("Deleted app profile for supabase user {SupabaseUserId}", supabaseUserId);
        return NoContent();
    }
}

public sealed record ProvisionRequest(
    string DisplayName,
    string? AvatarUrl,
    string? Email);

public sealed record ProvisionResponse(
    Guid UserId,
    string Username,
    bool IsOnboarded);
