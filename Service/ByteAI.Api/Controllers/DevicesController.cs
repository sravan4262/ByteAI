using ByteAI.Api.Common.Auth;
using ByteAI.Api.ViewModels;
using ByteAI.Api.ViewModels.Common;
using ByteAI.Core.Business.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace ByteAI.Api.Controllers;

/// <summary>
/// Push-notification device registration. iOS calls these on every launch
/// (after APNs returns a token) and on sign-out. Android/web are forward-
/// compatible via the same routes.
/// </summary>
[ApiController]
[Route("api/users/me/devices")]
[RequireRole("user")]
[Produces("application/json")]
[Tags("Devices")]
public sealed class DevicesController(IDevicesBusiness devicesBusiness) : ControllerBase
{
    /// <summary>Register or refresh a push-notification device token.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiResponse<bool>>> Register(
        [FromBody] RegisterDeviceRequest request,
        CancellationToken ct)
    {
        var supabaseUserId = HttpContext.GetSupabaseUserId() ?? throw new UnauthorizedAccessException();
        if (request is null || string.IsNullOrWhiteSpace(request.Token))
        {
            return BadRequest(new ApiError("INVALID_REQUEST", "Token must be provided."));
        }
        try
        {
            await devicesBusiness.RegisterAsync(supabaseUserId, request.Platform, request.Token, ct);
            return Ok(ApiResponse<bool>.Success(true));
        }
        catch (UnauthorizedAccessException) { return Unauthorized(); }
    }

    /// <summary>Remove a device token. Called on sign-out so the device stops
    /// receiving pushes scoped to the prior account.</summary>
    [HttpDelete("{token}")]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiResponse<bool>>> Unregister(string token, CancellationToken ct)
    {
        var supabaseUserId = HttpContext.GetSupabaseUserId() ?? throw new UnauthorizedAccessException();
        try
        {
            await devicesBusiness.UnregisterAsync(supabaseUserId, token, ct);
            return Ok(ApiResponse<bool>.Success(true));
        }
        catch (UnauthorizedAccessException) { return Unauthorized(); }
    }
}
