using ByteAI.Api.Common.Auth;
using ByteAI.Api.ViewModels.Common;
using ByteAI.Core.Business.Interfaces;
using ByteAI.Core.Services.Avatar;
using ByteAI.Core.Services.Supabase;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ByteAI.Api.Controllers;

[ApiController]
[Route("api/auth")]
[Produces("application/json")]
[Tags("Auth")]
public sealed class AuthController(
    IUsersBusiness usersBusiness,
    ISupabaseAdminService supabaseAdmin,
    IAvatarService avatarService,
    ILogger<AuthController> logger) : ControllerBase
{
    /// <summary>
    /// Provision a user profile after Supabase OAuth sign-in.
    /// Creates the profile on first call; subsequent calls are idempotent.
    /// Called by the frontend immediately after the OAuth callback completes.
    /// </summary>
    [HttpPost("provision")]
    [Authorize]
    [EnableRateLimiting("auth")]
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
    /// Permanently delete the current user's account: removes the app profile (with all
    /// cascaded data) then removes the Supabase auth.users record so the identity
    /// cannot be reused to provision a fresh profile.
    /// </summary>
    [HttpDelete("account")]
    [Authorize]
    [EnableRateLimiting("auth")]
    [RequireRole("user")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeleteAccount(CancellationToken ct)
    {
        var supabaseUserId = HttpContext.GetSupabaseUserId();
        if (supabaseUserId is null) return Unauthorized();

        // 1. Invalidate all active sessions immediately
        await supabaseAdmin.SignOutAllSessionsAsync(supabaseUserId, ct);

        // 2. Delete app profile — anonymizes feedback/logs, cascades all child data
        var user = await usersBusiness.DeleteUserAsync(supabaseUserId, ct);
        if (user is null) return NotFound();

        logger.LogInformation("Deleted app profile for supabase user {SupabaseUserId}", supabaseUserId);

        // 3. Delete avatar from Supabase Storage (non-fatal if missing)
        if (user.AvatarUrl is not null)
            await avatarService.DeleteAsync(user.Id, ct);

        // 4. Delete Supabase auth identity — if this fails the app profile is already
        //    gone so the user cannot re-provision; log for manual cleanup
        try
        {
            await supabaseAdmin.DeleteAuthUserAsync(supabaseUserId, ct);
        }
        catch (Exception ex)
        {
            logger.LogError(ex,
                "App profile deleted but Supabase auth deletion failed for {SupabaseUserId}. Manual cleanup required.",
                supabaseUserId);
        }

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
