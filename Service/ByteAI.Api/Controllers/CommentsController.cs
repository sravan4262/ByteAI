using ByteAI.Api.Common.Auth;
using ByteAI.Api.Mappers;
using ByteAI.Api.ViewModels;
using ByteAI.Api.ViewModels.Common;
using ByteAI.Core.Commands.Comments;
using ByteAI.Core.Infrastructure;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ByteAI.Api.Controllers;

[ApiController]
[Route("api/bytes/{byteId:guid}/comments")]
public sealed class CommentsController(IMediator mediator) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<ApiResponse<PagedResponse<CommentResponse>>>> GetComments(
        Guid byteId, [FromQuery] int page = 1, [FromQuery] int pageSize = 50, CancellationToken ct = default)
    {
        var result = await mediator.Send(new GetCommentsByByteQuery(byteId, new PaginationParams(page, Math.Min(pageSize, 200))), ct);
        var response = new PagedResponse<CommentResponse>(result.Items.Select(c => c.ToResponse()).ToList(), result.Total, result.Page, result.PageSize);
        return Ok(ApiResponse<PagedResponse<CommentResponse>>.Success(response));
    }

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<ApiResponse<CommentResponse>>> CreateComment(
        Guid byteId, [FromBody] CreateCommentRequest request, CancellationToken ct)
    {
        var clerkId = HttpContext.GetClerkUserId() ?? throw new UnauthorizedAccessException();
        if (!Guid.TryParse(clerkId, out var authorId)) return Unauthorized();

        var result = await mediator.Send(new CreateCommentCommand(byteId, authorId, request.Body, request.ParentCommentId), ct);
        return CreatedAtAction(nameof(GetComments), new { byteId }, ApiResponse<CommentResponse>.Success(result.ToResponse()));
    }

    [HttpPut("~/api/comments/{commentId:guid}")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<CommentResponse>>> UpdateComment(
        Guid commentId, [FromBody] UpdateCommentRequest request, CancellationToken ct)
    {
        var clerkId = HttpContext.GetClerkUserId() ?? throw new UnauthorizedAccessException();
        if (!Guid.TryParse(clerkId, out var authorId)) return Unauthorized();

        try
        {
            var result = await mediator.Send(new UpdateCommentCommand(commentId, authorId, request.Body), ct);
            return Ok(ApiResponse<CommentResponse>.Success(result.ToResponse()));
        }
        catch (KeyNotFoundException) { return NotFound(new { message = $"Comment {commentId} not found" }); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    [HttpDelete("~/api/comments/{commentId:guid}")]
    [Authorize]
    public async Task<ActionResult<ApiResponse<bool>>> DeleteComment(Guid commentId, CancellationToken ct)
    {
        var clerkId = HttpContext.GetClerkUserId() ?? throw new UnauthorizedAccessException();
        if (!Guid.TryParse(clerkId, out var authorId)) return Unauthorized();

        try
        {
            var ok = await mediator.Send(new DeleteCommentCommand(commentId, authorId), ct);
            if (!ok) return NotFound(new { message = $"Comment {commentId} not found" });
            return Ok(ApiResponse<bool>.Success(true));
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }
}
