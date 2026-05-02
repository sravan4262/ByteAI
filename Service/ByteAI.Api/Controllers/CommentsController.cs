using ByteAI.Api.Common.Auth;
using ByteAI.Api.Mappers;
using ByteAI.Api.ViewModels;
using ByteAI.Api.ViewModels.Common;
using ByteAI.Core.Business.Interfaces;
using ByteAI.Core.Infrastructure.Persistence;
using ByteAI.Core.Infrastructure.Services;
using ByteAI.Core.Moderation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ByteAI.Api.Controllers;

[ApiController]
[Route("api/bytes/{byteId:guid}/comments")]
[Produces("application/json")]
[Tags("Comments")]
[RequireRole("user")]
public sealed class CommentsController(
    ICommentsBusiness commentsBusiness,
    IModerationService moderation,
    ICurrentUserService currentUserService,
    AppDbContext db) : ControllerBase
{
    /// <summary>List comments on a byte (includes author username and avatar).</summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<PagedResponse<CommentWithAuthorResponse>>), StatusCodes.Status200OK)]
    public async Task<ActionResult<ApiResponse<PagedResponse<CommentWithAuthorResponse>>>> GetComments(
        Guid byteId, [FromQuery] int page = 1, [FromQuery] int pageSize = 50, CancellationToken ct = default)
    {
        var result = await commentsBusiness.GetCommentsWithAuthorByByteAsync(byteId, page, pageSize, ct);
        var response = new PagedResponse<CommentWithAuthorResponse>(result.Items.Select(c => c.ToWithAuthorResponse()).ToList(), result.Total, result.Page, result.PageSize);
        return Ok(ApiResponse<PagedResponse<CommentWithAuthorResponse>>.Success(response));
    }

    /// <summary>Add a comment to a byte. Supports threaded replies via ParentCommentId.</summary>
    [HttpPost]
    [Authorize]
    [EnableRateLimiting("social")]
    [ProducesResponseType(typeof(ApiResponse<CommentResponse>), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<ApiResponse<CommentResponse>>> CreateComment(
        Guid byteId, [FromBody] CreateCommentRequest request, CancellationToken ct)
    {
        var supabaseUserId = HttpContext.GetSupabaseUserId() ?? throw new UnauthorizedAccessException();
        var authorId = await currentUserService.GetCurrentUserIdAsync(supabaseUserId, ct);

        await moderation.EnforceAsync(db, request.Body ?? string.Empty, ModerationContext.Comment, authorId: authorId, ct: ct);

        try
        {
            var result = await commentsBusiness.CreateCommentAsync(supabaseUserId, byteId, request.Body, request.ParentCommentId, ct);
            return CreatedAtAction(nameof(GetComments), new { byteId }, ApiResponse<CommentResponse>.Success(result.ToResponse()));
        }
        catch (UnauthorizedAccessException) { return Unauthorized(); }
    }

    /// <summary>Update a comment's body. Only the comment author may update it.</summary>
    [HttpPut("~/api/comments/{commentId:guid}")]
    [Authorize]
    [EnableRateLimiting("social")]
    [ProducesResponseType(typeof(ApiResponse<CommentResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<CommentResponse>>> UpdateComment(
        Guid commentId, [FromBody] UpdateCommentRequest request, CancellationToken ct)
    {
        var supabaseUserId = HttpContext.GetSupabaseUserId() ?? throw new UnauthorizedAccessException();
        var authorId = await currentUserService.GetCurrentUserIdAsync(supabaseUserId, ct);

        await moderation.EnforceAsync(db, request.Body ?? string.Empty, ModerationContext.Comment, contentId: commentId, authorId: authorId, ct: ct);

        try
        {
            var result = await commentsBusiness.UpdateCommentAsync(supabaseUserId, commentId, request.Body, ct);
            return Ok(ApiResponse<CommentResponse>.Success(result.ToResponse()));
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (KeyNotFoundException) { return NotFound(new { message = $"Comment {commentId} not found" }); }
    }

    /// <summary>Delete a comment. Only the comment author may delete it.</summary>
    [HttpDelete("~/api/comments/{commentId:guid}")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<bool>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteComment(Guid commentId, CancellationToken ct)
    {
        var supabaseUserId = HttpContext.GetSupabaseUserId() ?? throw new UnauthorizedAccessException();

        try
        {
            var ok = await commentsBusiness.DeleteCommentAsync(supabaseUserId, commentId, ct);
            if (!ok) return NotFound(new { message = $"Comment {commentId} not found" });
            return Ok(ApiResponse<bool>.Success(true));
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }
}
