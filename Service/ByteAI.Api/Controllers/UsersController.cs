using ByteAI.Api.Common.Auth;
using ByteAI.Api.Mappers;
using ByteAI.Api.ViewModels;
using ByteAI.Api.ViewModels.Common;
using ByteAI.Core.Commands.Users;
using ByteAI.Core.Infrastructure;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ByteAI.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class UsersController(IMediator mediator) : ControllerBase
{
    [HttpGet("{userId:guid}")]
    public async Task<ActionResult<ApiResponse<UserResponse>>> GetUserById(Guid userId, CancellationToken ct)
    {
        var user = await mediator.Send(new GetUserByIdQuery(userId), ct);
        if (user is null) return NotFound(new { message = $"User {userId} not found" });
        return Ok(ApiResponse<UserResponse>.Success(user.ToResponse()));
    }

    [HttpGet("username/{username}")]
    public async Task<ActionResult<ApiResponse<UserResponse>>> GetUserByUsername(string username, CancellationToken ct)
    {
        var user = await mediator.Send(new GetUserByUsernameQuery(username), ct);
        if (user is null) return NotFound(new { message = $"User '{username}' not found" });
        return Ok(ApiResponse<UserResponse>.Success(user.ToResponse()));
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<UserResponse>>> GetCurrentUser(CancellationToken ct)
    {
        var clerkId = HttpContext.GetClerkUserId() ?? throw new UnauthorizedAccessException();
        if (!Guid.TryParse(clerkId, out var userId)) return Unauthorized();

        var user = await mediator.Send(new GetUserByIdQuery(userId), ct);
        if (user is null) return NotFound(new { message = "User not found" });
        return Ok(ApiResponse<UserResponse>.Success(user.ToResponse()));
    }

    [HttpGet("{userId:guid}/followers")]
    public async Task<ActionResult<ApiResponse<PagedResponse<UserResponse>>>> GetFollowers(
        Guid userId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
    {
        var result = await mediator.Send(new GetFollowersQuery(userId, new PaginationParams(page, Math.Min(pageSize, 100))), ct);
        var response = new PagedResponse<UserResponse>(result.Items.Select(u => u.ToResponse()).ToList(), result.Total, result.Page, result.PageSize);
        return Ok(ApiResponse<PagedResponse<UserResponse>>.Success(response));
    }

    [HttpGet("{userId:guid}/following")]
    public async Task<ActionResult<ApiResponse<PagedResponse<UserResponse>>>> GetFollowing(
        Guid userId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
    {
        var result = await mediator.Send(new GetFollowingQuery(userId, new PaginationParams(page, Math.Min(pageSize, 100))), ct);
        var response = new PagedResponse<UserResponse>(result.Items.Select(u => u.ToResponse()).ToList(), result.Total, result.Page, result.PageSize);
        return Ok(ApiResponse<PagedResponse<UserResponse>>.Success(response));
    }

    [HttpPut("{userId:guid}/profile")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<UserResponse>>> UpdateProfile(Guid userId, [FromBody] UpdateProfileRequest request, CancellationToken ct)
    {
        var clerkId = HttpContext.GetClerkUserId() ?? throw new UnauthorizedAccessException();
        if (!Guid.TryParse(clerkId, out var userGuid) || userGuid != userId) return Forbid();

        var result = await mediator.Send(new UpdateProfileCommand(userId, request.DisplayName, request.Bio, request.TechStack, request.FeedPreferences), ct);
        return Ok(ApiResponse<UserResponse>.Success(result.ToResponse()));
    }
}
