using ByteAI.Api.Common.Auth;
using ByteAI.Api.Mappers;
using ByteAI.Api.ViewModels;
using ByteAI.Api.ViewModels.Common;
using ByteAI.Core.Commands.Feed;
using ByteAI.Core.Infrastructure;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ByteAI.Api.Controllers;

[ApiController]
[Route("api/feed")]
public sealed class FeedController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    // [Authorize]
    public async Task<ActionResult<ApiResponse<PagedResponse<ByteResponse>>>> GetFeed(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? tags = null,
        [FromQuery] string sort = "trending",
        CancellationToken ct = default)
    {
        var clerkId = HttpContext.GetClerkUserId() ?? throw new UnauthorizedAccessException();
        if (!Guid.TryParse(clerkId, out var userId)) return Unauthorized();

        var tagList = string.IsNullOrEmpty(tags) ? null : tags.Split(',').ToList();
        var result = await mediator.Send(new GetFeedQuery(userId, new PaginationParams(page, Math.Min(pageSize, 100)), tagList, sort), ct);
        var response = new PagedResponse<ByteResponse>(result.Items.Select(b => b.ToResponse()).ToList(), result.Total, result.Page, result.PageSize);
        return Ok(ApiResponse<PagedResponse<ByteResponse>>.Success(response));
    }
}
