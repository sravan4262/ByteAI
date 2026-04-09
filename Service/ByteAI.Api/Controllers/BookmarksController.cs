using ByteAI.Api.Common.Auth;
using ByteAI.Api.Mappers;
using ByteAI.Api.ViewModels;
using ByteAI.Api.ViewModels.Common;
using ByteAI.Core.Commands.Bookmarks;
using ByteAI.Core.Infrastructure;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ByteAI.Api.Controllers;

[ApiController]
[Route("api/bytes/{byteId:guid}/bookmarks")]
[Produces("application/json")]
[Tags("Bookmarks")]
public sealed class BookmarksController(IMediator mediator) : ControllerBase
{
    /// <summary>Bookmark a byte.</summary>
    [HttpPost]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<BookmarkResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiResponse<BookmarkResponse>>> CreateBookmark(Guid byteId, CancellationToken ct)
    {
        var clerkId = HttpContext.GetClerkUserId() ?? throw new UnauthorizedAccessException();
        if (!Guid.TryParse(clerkId, out var userId)) return Unauthorized();

        try
        {
            var result = await mediator.Send(new CreateBookmarkCommand(byteId, userId), ct);
            return CreatedAtAction(nameof(GetMyBookmarks), null, ApiResponse<BookmarkResponse>.Success(result.ToResponse()));
        }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    /// <summary>Remove a bookmark.</summary>
    [HttpDelete]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteBookmark(Guid byteId, CancellationToken ct)
    {
        var clerkId = HttpContext.GetClerkUserId() ?? throw new UnauthorizedAccessException();
        if (!Guid.TryParse(clerkId, out var userId)) return Unauthorized();

        var ok = await mediator.Send(new DeleteBookmarkCommand(byteId, userId), ct);
        if (!ok) return NotFound(new { message = "Bookmark not found" });
        return Ok(ApiResponse<bool>.Success(true));
    }

    /// <summary>List the authenticated user's bookmarked bytes.</summary>
    [HttpGet("~/api/me/bookmarks")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<PagedResponse<ByteResponse>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiResponse<PagedResponse<ByteResponse>>>> GetMyBookmarks(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
    {
        var clerkId = HttpContext.GetClerkUserId() ?? throw new UnauthorizedAccessException();
        if (!Guid.TryParse(clerkId, out var userId)) return Unauthorized();

        var result = await mediator.Send(new GetUserBookmarksQuery(userId, new PaginationParams(page, Math.Min(pageSize, 100))), ct);
        var response = new PagedResponse<ByteResponse>(result.Items.Select(b => b.ToResponse()).ToList(), result.Total, result.Page, result.PageSize);
        return Ok(ApiResponse<PagedResponse<ByteResponse>>.Success(response));
    }
}
