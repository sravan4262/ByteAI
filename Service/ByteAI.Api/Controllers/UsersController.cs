using ByteAI.Api.Common.Auth;
using ByteAI.Api.Mappers;
using ByteAI.Api.ViewModels;
using ByteAI.Api.ViewModels.Common;
using ByteAI.Core.Business.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ByteAI.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
[Tags("Users")]
public sealed class UsersController(IUsersBusiness usersBusiness) : ControllerBase
{
    /// <summary>Get a user's public profile by ID.</summary>
    [HttpGet("{userId:guid}")]
    [ProducesResponseType(typeof(ApiResponse<UserResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<UserResponse>>> GetUserById(Guid userId, CancellationToken ct)
    {
        var user = await usersBusiness.GetUserByIdAsync(userId, ct);
        if (user is null) return NotFound(new { message = $"User {userId} not found" });
        return Ok(ApiResponse<UserResponse>.Success(user.ToResponse()));
    }

    /// <summary>Get a user's public profile by username.</summary>
    [HttpGet("username/{username}")]
    [ProducesResponseType(typeof(ApiResponse<UserResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<UserResponse>>> GetUserByUsername(string username, CancellationToken ct)
    {
        var user = await usersBusiness.GetUserByUsernameAsync(username, ct);
        if (user is null) return NotFound(new { message = $"User '{username}' not found" });
        return Ok(ApiResponse<UserResponse>.Success(user.ToResponse()));
    }

    /// <summary>Get the currently authenticated user's profile.</summary>
    [HttpGet("me")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<UserResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<UserResponse>>> GetCurrentUser(CancellationToken ct)
    {
        var clerkId = HttpContext.GetClerkUserId() ?? throw new UnauthorizedAccessException();
        var user = await usersBusiness.GetCurrentUserAsync(clerkId, ct);
        if (user is null) return NotFound(new { message = "User not found" });
        return Ok(ApiResponse<UserResponse>.Success(user.ToResponse()));
    }

    /// <summary>List a user's followers.</summary>
    [HttpGet("{userId:guid}/followers")]
    [ProducesResponseType(typeof(ApiResponse<PagedResponse<UserResponse>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<PagedResponse<UserResponse>>>> GetFollowers(
        Guid userId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
    {
        var result = await usersBusiness.GetFollowersAsync(userId, page, pageSize, ct);
        var response = new PagedResponse<UserResponse>(result.Items.Select(u => u.ToResponse()).ToList(), result.Total, result.Page, result.PageSize);
        return Ok(ApiResponse<PagedResponse<UserResponse>>.Success(response));
    }

    /// <summary>List the users that a user follows.</summary>
    [HttpGet("{userId:guid}/following")]
    [ProducesResponseType(typeof(ApiResponse<PagedResponse<UserResponse>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<PagedResponse<UserResponse>>>> GetFollowing(
        Guid userId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
    {
        var result = await usersBusiness.GetFollowingAsync(userId, page, pageSize, ct);
        var response = new PagedResponse<UserResponse>(result.Items.Select(u => u.ToResponse()).ToList(), result.Total, result.Page, result.PageSize);
        return Ok(ApiResponse<PagedResponse<UserResponse>>.Success(response));
    }

    /// <summary>Update the authenticated user's profile. Users may only update their own profile.</summary>
    [HttpPut("{userId:guid}/profile")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<UserResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<ApiResponse<UserResponse>>> UpdateProfile(Guid userId, [FromBody] UpdateProfileRequest request, CancellationToken ct)
    {
        var clerkId = HttpContext.GetClerkUserId() ?? throw new UnauthorizedAccessException();

        try
        {
            var result = await usersBusiness.UpdateProfileAsync(clerkId, userId, request.DisplayName, request.Bio, ct);
            return Ok(ApiResponse<UserResponse>.Success(result.ToResponse()));
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }
}
