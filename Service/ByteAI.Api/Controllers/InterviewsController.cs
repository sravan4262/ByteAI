using ByteAI.Api.Common.Auth;
using ByteAI.Api.ViewModels;
using ByteAI.Api.ViewModels.Common;
using ByteAI.Core.Business.Interfaces;
using ByteAI.Core.Commands.Interviews;
using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ByteAI.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
[Tags("Interviews")]
[RequireRole("user")]
public sealed class InterviewsController(IInterviewsBusiness interviewsBusiness, ICurrentUserService currentUserService) : ControllerBase
{
    // ── Mappers ──────────────────────────────────────────────────────────────

    static InterviewResponse ToResponse(Interview i) => new(
        i.Id, i.AuthorId, i.Title, i.Body, i.CodeSnippet, i.Language,
        i.Company, i.Role, i.Difficulty, i.Type, i.CreatedAt, i.UpdatedAt);

    static InterviewQuestionResponse ToQuestionResponse(InterviewQuestion q, Guid? userId = null) => new(
        q.Id, q.Question, q.Answer, q.OrderIndex,
        q.Likes.Count, q.Comments.Count,
        userId.HasValue && q.Likes.Any(l => l.UserId == userId.Value));

    static InterviewWithQuestionsResponse ToFullResponse(Interview i, Guid? userId = null) => new(
        i.Id, i.AuthorId, i.Title, i.Company, i.Role, i.Difficulty, i.Type, i.CreatedAt,
        i.Comments.Count,
        i.Questions.OrderBy(q => q.OrderIndex).Select(q => ToQuestionResponse(q, userId)).ToList(),
        i.Author?.Username ?? "",
        i.Author?.DisplayName ?? i.Author?.Username ?? "",
        i.Author?.AvatarUrl,
        i.Author?.RoleTitle,
        i.Author?.Company,
        userId.HasValue && i.Bookmarks.Any(b => b.UserId == userId.Value));

    // ── Reads ─────────────────────────────────────────────────────────────────

    /// <summary>
    /// List interviews with embedded questions.
    /// Supports filtering by company, difficulty, and tech stacks (comma-separated).
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<PagedResponse<InterviewWithQuestionsResponse>>), 200)]
    public async Task<ActionResult<ApiResponse<PagedResponse<InterviewWithQuestionsResponse>>>> GetInterviews(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] Guid? authorId = null,
        [FromQuery] string? company = null,
        [FromQuery] string? difficulty = null,
        [FromQuery] string? stack = null,
        [FromQuery] string sort = "recent",
        CancellationToken ct = default)
    {
        var clerkId = HttpContext.GetClerkUserId();
        var userId = clerkId is not null ? await currentUserService.GetCurrentUserIdAsync(clerkId, ct) : null;
        var techStacks = string.IsNullOrEmpty(stack) ? null : stack.Split(',').Select(s => s.Trim()).ToList();
        var result = await interviewsBusiness.GetInterviewsAsync(page, pageSize, authorId, company, difficulty, techStacks, sort, ct, clerkId);

        var response = new PagedResponse<InterviewWithQuestionsResponse>(
            result.Items.Select(i => ToFullResponse(i, userId)).ToList(),
            result.Total, result.Page, result.PageSize);
        return Ok(ApiResponse<PagedResponse<InterviewWithQuestionsResponse>>.Success(response));
    }

    /// <summary>Get a single interview with all its questions.</summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(ApiResponse<InterviewWithQuestionsResponse>), 200)]
    [ProducesResponseType(404)]
    public async Task<ActionResult<ApiResponse<InterviewWithQuestionsResponse>>> GetById(Guid id, CancellationToken ct)
    {
        var clerkId = HttpContext.GetClerkUserId();
        var userId = clerkId is not null ? await currentUserService.GetCurrentUserIdAsync(clerkId, ct) : null;
        var result = await interviewsBusiness.GetInterviewByIdAsync(id, ct, clerkId);
        if (result is null) return NotFound();
        return Ok(ApiResponse<InterviewWithQuestionsResponse>.Success(ToFullResponse(result, userId)));
    }

    // ── Writes ────────────────────────────────────────────────────────────────

    [HttpPost]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<InterviewResponse>), 201)]
    public async Task<ActionResult<ApiResponse<InterviewResponse>>> Create(
        [FromBody] CreateInterviewRequest request, CancellationToken ct)
    {
        var clerkId = HttpContext.GetClerkUserId() ?? throw new UnauthorizedAccessException();

        try
        {
            var result = await interviewsBusiness.CreateInterviewAsync(
                clerkId, request.Title, request.Body, request.CodeSnippet, request.Language,
                request.Company, request.Role, request.Difficulty, request.Type, ct);
            return CreatedAtAction(nameof(GetById), new { id = result.Id },
                ApiResponse<InterviewResponse>.Success(ToResponse(result)));
        }
        catch (UnauthorizedAccessException) { return Unauthorized(); }
    }

    /// <summary>Create an interview with structured Q&A questions.</summary>
    [HttpPost("with-questions")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<InterviewWithQuestionsResponse>), 201)]
    public async Task<ActionResult<ApiResponse<InterviewWithQuestionsResponse>>> CreateWithQuestions(
        [FromBody] CreateInterviewWithQuestionsRequest request, CancellationToken ct)
    {
        var clerkId = HttpContext.GetClerkUserId() ?? throw new UnauthorizedAccessException();

        if (request.Questions is null || request.Questions.Count == 0)
            return BadRequest(new { error = "At least one question is required." });

        try
        {
            var questionInputs = request.Questions
                .Select(q => new InterviewQuestionInput(q.Question, q.Answer))
                .ToList();

            var result = await interviewsBusiness.CreateInterviewWithQuestionsAsync(
                clerkId, request.Title, request.Company, request.Role, request.Difficulty, questionInputs, ct);

            return CreatedAtAction(nameof(GetById), new { id = result.Id },
                ApiResponse<InterviewWithQuestionsResponse>.Success(ToFullResponse(result)));
        }
        catch (UnauthorizedAccessException) { return Unauthorized(); }
    }

    [HttpPut("{id:guid}")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<InterviewResponse>), 200)]
    public async Task<ActionResult<ApiResponse<InterviewResponse>>> Update(
        Guid id, [FromBody] UpdateInterviewRequest request, CancellationToken ct)
    {
        var clerkId = HttpContext.GetClerkUserId() ?? throw new UnauthorizedAccessException();

        try
        {
            var result = await interviewsBusiness.UpdateInterviewAsync(
                clerkId, id, request.Title, request.Body, request.CodeSnippet, request.Language,
                request.Company, request.Role, request.Difficulty, ct);
            return Ok(ApiResponse<InterviewResponse>.Success(ToResponse(result)));
        }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    [HttpDelete("{id:guid}")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<bool>), 200)]
    public async Task<ActionResult<ApiResponse<bool>>> Delete(Guid id, CancellationToken ct)
    {
        var clerkId = HttpContext.GetClerkUserId() ?? throw new UnauthorizedAccessException();

        try
        {
            var ok = await interviewsBusiness.DeleteInterviewAsync(clerkId, id, ct);
            if (!ok) return NotFound();
            return Ok(ApiResponse<bool>.Success(true));
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    // ── Question likes ────────────────────────────────────────────────────────

    [HttpPost("questions/{questionId:guid}/likes")]
    [Authorize]
    public async Task<ActionResult> LikeQuestion(Guid questionId, CancellationToken ct)
    {
        var clerkId = HttpContext.GetClerkUserId() ?? throw new UnauthorizedAccessException();
        try
        {
            await interviewsBusiness.LikeQuestionAsync(clerkId, questionId, ct);
            return Ok(ApiResponse<bool>.Success(true));
        }
        catch (UnauthorizedAccessException) { return Unauthorized(); }
    }

    [HttpDelete("questions/{questionId:guid}/likes")]
    [Authorize]
    public async Task<ActionResult> UnlikeQuestion(Guid questionId, CancellationToken ct)
    {
        var clerkId = HttpContext.GetClerkUserId() ?? throw new UnauthorizedAccessException();
        try
        {
            await interviewsBusiness.UnlikeQuestionAsync(clerkId, questionId, ct);
            return Ok(ApiResponse<bool>.Success(true));
        }
        catch (UnauthorizedAccessException) { return Unauthorized(); }
    }

    // ── Question comments ─────────────────────────────────────────────────────

    [HttpPost("questions/{questionId:guid}/comments")]
    [Authorize]
    public async Task<ActionResult> AddQuestionComment(
        Guid questionId, [FromBody] AddInterviewCommentRequest request, CancellationToken ct)
    {
        var clerkId = HttpContext.GetClerkUserId() ?? throw new UnauthorizedAccessException();
        try
        {
            var result = await interviewsBusiness.AddQuestionCommentAsync(clerkId, questionId, request.Body, request.ParentId, ct);
            return Ok(ApiResponse<object>.Success(new { result.Id, result.Body, result.AuthorId, result.CreatedAt }));
        }
        catch (UnauthorizedAccessException) { return Unauthorized(); }
    }

    [HttpGet("questions/{questionId:guid}/comments")]
    public async Task<ActionResult> GetQuestionComments(
        Guid questionId, [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
    {
        var result = await interviewsBusiness.GetQuestionCommentsAsync(questionId, page, pageSize, ct);
        return Ok(ApiResponse<PagedResponse<object>>.Success(
            new PagedResponse<object>(
                result.Items.Select(c => (object)new
                {
                    c.Id, c.Body, c.AuthorId,
                    AuthorUsername = c.Author?.Username ?? "",
                    c.VoteCount, c.CreatedAt, c.ParentId
                }).ToList(),
                result.Total, result.Page, result.PageSize)));
    }

    // ── Interview-level comments ──────────────────────────────────────────────

    [HttpPost("{id:guid}/comments")]
    [Authorize]
    public async Task<ActionResult> AddComment(Guid id, [FromBody] AddInterviewCommentRequest request, CancellationToken ct)
    {
        var clerkId = HttpContext.GetClerkUserId() ?? throw new UnauthorizedAccessException();
        try
        {
            var result = await interviewsBusiness.AddCommentAsync(clerkId, id, request.Body, request.ParentId, ct);
            return Ok(ApiResponse<object>.Success(new { result.Id, result.Body, result.CreatedAt }));
        }
        catch (UnauthorizedAccessException) { return Unauthorized(); }
    }

    [HttpGet("{id:guid}/comments")]
    public async Task<ActionResult> GetComments(Guid id,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
    {
        var result = await interviewsBusiness.GetCommentsAsync(id, page, pageSize, ct);
        return Ok(ApiResponse<PagedResponse<object>>.Success(
            new PagedResponse<object>(
                result.Items.Select(c => (object)new { c.Id, c.Body, c.AuthorId, c.VoteCount, c.CreatedAt, c.ParentId }).ToList(),
                result.Total, result.Page, result.PageSize)));
    }

    // ── Reactions ─────────────────────────────────────────────────────────────

    [HttpPost("{id:guid}/reactions")]
    [Authorize]
    public async Task<ActionResult> AddReaction(Guid id, [FromBody] AddInterviewReactionRequest request, CancellationToken ct)
    {
        var clerkId = HttpContext.GetClerkUserId() ?? throw new UnauthorizedAccessException();
        try
        {
            await interviewsBusiness.AddReactionAsync(clerkId, id, request.Type, ct);
            return Ok(ApiResponse<bool>.Success(true));
        }
        catch (UnauthorizedAccessException) { return Unauthorized(); }
    }

    [HttpDelete("{id:guid}/reactions")]
    [Authorize]
    public async Task<ActionResult> RemoveReaction(Guid id, CancellationToken ct)
    {
        var clerkId = HttpContext.GetClerkUserId() ?? throw new UnauthorizedAccessException();
        try
        {
            await interviewsBusiness.RemoveReactionAsync(clerkId, id, ct);
            return Ok(ApiResponse<bool>.Success(true));
        }
        catch (UnauthorizedAccessException) { return Unauthorized(); }
    }

    // ── Bookmarks ─────────────────────────────────────────────────────────────

    /// <summary>Toggle bookmark on an interview. Returns isSaved=true if now bookmarked, false if removed.</summary>
    [HttpPost("{id:guid}/bookmarks")]
    [Authorize]
    public async Task<ActionResult> ToggleBookmark(Guid id, CancellationToken ct)
    {
        var clerkId = HttpContext.GetClerkUserId() ?? throw new UnauthorizedAccessException();
        try
        {
            var isSaved = await interviewsBusiness.ToggleBookmarkAsync(clerkId, id, ct);
            return Ok(ApiResponse<object>.Success(new { isSaved }));
        }
        catch (UnauthorizedAccessException) { return Unauthorized(); }
    }

    // ── Comment deletes ───────────────────────────────────────────────────────

    [HttpDelete("{id:guid}/comments/{commentId:guid}")]
    [Authorize]
    public async Task<ActionResult> DeleteComment(Guid id, Guid commentId, CancellationToken ct)
    {
        var clerkId = HttpContext.GetClerkUserId() ?? throw new UnauthorizedAccessException();
        try
        {
            var ok = await interviewsBusiness.DeleteCommentAsync(clerkId, commentId, ct);
            if (!ok) return NotFound();
            return Ok(ApiResponse<bool>.Success(true));
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    [HttpDelete("questions/comments/{commentId:guid}")]
    [Authorize]
    public async Task<ActionResult> DeleteQuestionComment(Guid commentId, CancellationToken ct)
    {
        var clerkId = HttpContext.GetClerkUserId() ?? throw new UnauthorizedAccessException();
        try
        {
            var ok = await interviewsBusiness.DeleteQuestionCommentAsync(clerkId, commentId, ct);
            if (!ok) return NotFound();
            return Ok(ApiResponse<bool>.Success(true));
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    /// <summary>List the authenticated user's own active interviews (for the profile "my posts" view).</summary>
    [HttpGet("~/api/me/interviews")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<PagedResponse<InterviewWithQuestionsResponse>>), 200)]
    public async Task<ActionResult> GetMyInterviews(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 50, CancellationToken ct = default)
    {
        var clerkId = HttpContext.GetClerkUserId() ?? throw new UnauthorizedAccessException();
        try
        {
            var result = await interviewsBusiness.GetMyInterviewsAsync(clerkId, page, pageSize, ct);
            var response = new PagedResponse<InterviewWithQuestionsResponse>(
                result.Items.Select(i => ToFullResponse(i)).ToList(),
                result.Total, result.Page, result.PageSize);
            return Ok(ApiResponse<PagedResponse<InterviewWithQuestionsResponse>>.Success(response));
        }
        catch (UnauthorizedAccessException) { return Unauthorized(); }
    }

    /// <summary>List the authenticated user's bookmarked interviews.</summary>
    [HttpGet("~/api/me/interview-bookmarks")]
    [Authorize]
    [ProducesResponseType(typeof(ApiResponse<PagedResponse<InterviewWithQuestionsResponse>>), 200)]
    public async Task<ActionResult> GetMyInterviewBookmarks(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
    {
        var clerkId = HttpContext.GetClerkUserId() ?? throw new UnauthorizedAccessException();
        try
        {
            var result = await interviewsBusiness.GetUserInterviewBookmarksAsync(clerkId, page, pageSize, ct);
            var response = new PagedResponse<InterviewWithQuestionsResponse>(
                result.Items.Select(i => ToFullResponse(i)).ToList(),
                result.Total, result.Page, result.PageSize);
            return Ok(ApiResponse<PagedResponse<InterviewWithQuestionsResponse>>.Success(response));
        }
        catch (UnauthorizedAccessException) { return Unauthorized(); }
    }
}
