using ByteAI.Api.Common.Auth;
using ByteAI.Api.ViewModels.Common;
using ByteAI.Core.Business.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace ByteAI.Api.Controllers;

[ApiController]
[Route("api/feature-flags")]
[Produces("application/json")]
[Tags("Feature Flags")]
[RequireRole("user")]
public sealed class FeatureFlagsController(IAdminBusiness adminBusiness) : ControllerBase
{
    /// <summary>
    /// Returns a list of all currently enabled feature flags.
    /// Polled by the frontend to sync state. Public endpoint (no auth required).
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<Dictionary<string, bool>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<Dictionary<string, bool>>>> GetEnabledFlags(CancellationToken ct)
    {
        var clerkId = HttpContext.GetClerkUserId();
        var flags = await adminBusiness.GetEnabledFeatureFlagsAsync(clerkId, ct);
        
        // Return as a dictionary { "key": true } for easy client-side lookup
        var dict = flags.ToDictionary(f => f.Key, f => true);
        return Ok(ApiResponse<Dictionary<string, bool>>.Success(dict));
    }
}
