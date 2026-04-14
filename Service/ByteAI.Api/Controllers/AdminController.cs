using ByteAI.Api.Common.Auth;
using ByteAI.Api.ViewModels.Common;
using ByteAI.Core.Business.Interfaces;
using ByteAI.Core.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ByteAI.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Produces("application/json")]
[Tags("Admin")]
[Authorize]
[RequireRole("admin")] // Only admins can access these endpoints
public sealed class AdminController(IAdminBusiness adminBusiness) : ControllerBase
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
}
