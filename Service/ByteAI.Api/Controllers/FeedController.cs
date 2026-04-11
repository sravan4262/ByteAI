using ByteAI.Api.Common.Auth;
using ByteAI.Api.Mappers;
using ByteAI.Api.ViewModels;
using ByteAI.Api.ViewModels.Common;
using ByteAI.Core.Business.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace ByteAI.Api.Controllers;

[ApiController]
[Route("api/feed")]
[Produces("application/json")]
[Tags("Feed")]
public sealed class FeedController(IFeedBusiness feedBusiness) : ControllerBase
{
    /// <summary>
    /// Get the personalised feed.
    /// filter=for_you: ranked by engagement + user preferences.
    /// filter=following: bytes from users this user follows.
    /// filter=trending: ranked by click count in past 24 hours.
    /// </summary>
    /// <param name="filter">Feed mode: <c>for_you</c> | <c>following</c> | <c>trending</c>.</param>
    /// <param name="stack">Tag/tech-stack filter (comma-separated).</param>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<PagedResponse<ByteResponse>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<PagedResponse<ByteResponse>>>> GetFeed(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? stack = null,
        [FromQuery] string filter = "for_you",
        CancellationToken ct = default)
    {
        var clerkId = HttpContext.GetClerkUserId();
        var tagList = string.IsNullOrEmpty(stack) ? null : stack.Split(',').ToList();

        var result = await feedBusiness.GetFeedAsync(clerkId, page, pageSize, tagList, filter, ct);

        var response = new PagedResponse<ByteResponse>(
            result.Items.Select(b => b.ToResponse()).ToList(),
            result.Total, result.Page, result.PageSize);

        return Ok(ApiResponse<PagedResponse<ByteResponse>>.Success(response));
    }
}
