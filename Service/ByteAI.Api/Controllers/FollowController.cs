using ByteAI.Api.Common.Auth;
using ByteAI.Api.ViewModels.Common;
using ByteAI.Core.Commands.Follow;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ByteAI.Api.Controllers;

[ApiController]
[Route("api/users/{userId:guid}/follow")]
public sealed class FollowController(IMediator mediator) : ControllerBase
{
    [HttpPost]
    [Authorize]
    public async Task<ActionResult<ApiResponse<bool>>> FollowUser(Guid userId, CancellationToken ct)
    {
        var clerkId = HttpContext.GetClerkUserId() ?? throw new UnauthorizedAccessException();
        if (!Guid.TryParse(clerkId, out var followerId)) return Unauthorized();
        if (followerId == userId) return BadRequest(new { message = "Cannot follow yourself" });

        var ok = await mediator.Send(new FollowUserCommand(followerId, userId), ct);
        return Ok(ApiResponse<bool>.Success(ok));
    }

    [HttpDelete]
    [Authorize]
    public async Task<ActionResult<ApiResponse<bool>>> UnfollowUser(Guid userId, CancellationToken ct)
    {
        var clerkId = HttpContext.GetClerkUserId() ?? throw new UnauthorizedAccessException();
        if (!Guid.TryParse(clerkId, out var followerId)) return Unauthorized();

        var ok = await mediator.Send(new UnfollowUserCommand(followerId, userId), ct);
        if (!ok) return NotFound(new { message = "Follow relationship not found" });
        return Ok(ApiResponse<bool>.Success(true));
    }
}
