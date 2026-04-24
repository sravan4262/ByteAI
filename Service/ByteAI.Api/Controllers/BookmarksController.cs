using ByteAI.Api.Common.Auth;
using ByteAI.Api.Mappers;
using ByteAI.Api.ViewModels;
using ByteAI.Api.ViewModels.Common;
using ByteAI.Core.Business.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ByteAI.Api.Controllers;

[ApiController]
[Route("api/bytes/{byteId:guid}/bookmarks")]
[Produces("application/json")]
[Tags("Bookmarks")]
[RequireRole("user")]
public sealed class BookmarksController(IBookmarksBusiness bookmarksBusiness) : ControllerBase
{
    /// <summary>Toggle bookmark on a byte. Returns isSaved=true if now bookmarked, false if removed.</summary>
    [HttpPost]
    [Authorize]
    [EnableRateLimiting("social")]
    [ProducesResponseType(typeof(ApiResponse<object>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiResponse<object>>> ToggleBookmark(Guid byteId, CancellationToken ct)
    {
        var supabaseUserId = HttpContext.GetSupabaseUserId() ?? throw new UnauthorizedAccessException();

        try
        {
            var isSaved = await bookmarksBusiness.ToggleBookmarkAsync(supabaseUserId, byteId, ct);
            return Ok(ApiResponse<object>.Success(new { isSaved }));
        }
        catch (UnauthorizedAccessException) { return Unauthorized(); }
    }

    /// <summary>List the authenticated user's bookmarked bytes.</summary>
    [HttpGet("~/api/me/bookmarks")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<PagedResponse<ByteResponse>>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiResponse<PagedResponse<ByteResponse>>>> GetMyBookmarks(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
    {
        var supabaseUserId = HttpContext.GetSupabaseUserId() ?? throw new UnauthorizedAccessException();

        try
        {
            var result = await bookmarksBusiness.GetMyBookmarksAsync(supabaseUserId, page, pageSize, ct);
            var response = new PagedResponse<ByteResponse>(
                result.Items.Select(b => b.ToResponse()).ToList(),
                result.Total, result.Page, result.PageSize);
            return Ok(ApiResponse<PagedResponse<ByteResponse>>.Success(response));
        }
        catch (UnauthorizedAccessException) { return Unauthorized(); }
    }
}
