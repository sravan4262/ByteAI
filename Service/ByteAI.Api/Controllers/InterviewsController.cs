using ByteAI.Api.Common.Auth;
using ByteAI.Api.ViewModels;
using ByteAI.Api.ViewModels.Common;
using ByteAI.Core.Business.Interfaces;
using ByteAI.Core.Commands.Interviews;
using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure.Persistence;
using ByteAI.Core.Infrastructure.Services;
using ByteAI.Core.Moderation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace ByteAI.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
[Tags("Interviews")]
[RequireRole("user")]
public sealed class InterviewsController(
    IInterviewsBusiness interviewsBusiness,
    ICurrentUserService currentUserService,
    IModerationService moderation,
    AppDbContext db) : ControllerBase
{
    // ── Mappers ──────────────────────────────────────────────────────────────

    static string? FirstLocation(Interview i) =>
        i.Locations.FirstOrDefault()?.Location?.Name;

    static InterviewResponse ToResponse(Interview i) => new(
        i.Id, i.AuthorId, i.Title, i.Body, i.CodeSnippet, i.Language,
        i.Company, i.Role, FirstLocation(i), i.Difficulty, i.Type, i.CreatedAt, i.UpdatedAt);

    static InterviewQuestionResponse ToQuestionResponse(InterviewQuestion q, Guid? userId = null) => new(
        q.Id, q.Question, q.Answer, q.OrderIndex,
        q.Likes.Count, q.Comments.Count,
        userId.HasValue && q.Likes.Any(l => l.UserId == userId.Value));

    static InterviewWithQuestionsResponse ToFullResponse(Interview i, Guid? userId = null) => new(
        i.Id, i.AuthorId, i.Title, i.Company, i.Role, FirstLocation(i), i.Difficulty, i.Type, i.CreatedAt,
        i.Comments.Count,
        i.Questions.OrderBy(q => q.OrderIndex).Select(q => ToQuestionResponse(q, userId)).ToList(),
        AuthorUsername:    i.IsAnonymous ? "anonymous" : (i.Author?.Username ?? ""),
        AuthorDisplayName: i.IsAnonymous ? "Anonymous" : (i.Author?.DisplayName ?? i.Author?.Username ?? ""),
        AuthorAvatarUrl:   i.IsAnonymous ? null : i.Author?.AvatarUrl,
        AuthorRole:        i.IsAnonymous ? null : i.Author?.RoleTitle,
        AuthorCompany:     i.IsAnonymous ? null : i.Author?.Company,
        IsBookmarked:      userId.HasValue && i.Bookmarks.Any(b => b.UserId == userId.Value),
        IsAnonymous:       i.IsAnonymous);

    // ── Reads ─────────────────────────────────────────────────────────────────

    /// <summary>List all companies from posted interviews.</summary>
    [HttpGet("companies")]
    [ProducesResponseType(typeof(ApiResponse<List<string>>), 200)]
    public async Task<ActionResult<ApiResponse<List<string>>>> GetCompanies(CancellationToken ct)
    {
        var companies = await interviewsBusiness.GetCompaniesAsync(ct);
        return Ok(ApiResponse<List<string>>.Success(companies.Select(c => c.Name).ToList()));
    }

    /// <summary>List all roles from posted interviews.</summary>
    [HttpGet("roles")]
    [ProducesResponseType(typeof(ApiResponse<List<string>>), 200)]
    public async Task<ActionResult<ApiResponse<List<string>>>> GetRoles(CancellationToken ct)
    {
        var roles = await interviewsBusiness.GetRolesAsync(ct);
        return Ok(ApiResponse<List<string>>.Success(roles.Select(r => r.Name).ToList()));
    }

    /// <summary>List all locations (cities) for interview filtering.</summary>
    [HttpGet("locations")]
    [ProducesResponseType(typeof(ApiResponse<List<string>>), 200)]
    public async Task<ActionResult<ApiResponse<List<string>>>> GetLocations(CancellationToken ct)
    {
        var locations = await interviewsBusiness.GetLocationsAsync(ct);
        return Ok(ApiResponse<List<string>>.Success(locations.Select(l => l.Name).ToList()));
    }

    /// <summary>
    /// List interviews with embedded questions.
    /// Supports filtering by company, role, and tech stacks (comma-separated).
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(ApiResponse<PagedResponse<InterviewWithQuestionsResponse>>), 200)]
    public async Task<ActionResult<ApiResponse<PagedResponse<InterviewWithQuestionsResponse>>>> GetInterviews(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] Guid? authorId = null,
        [FromQuery] string? company = null,
        [FromQuery] string? role = null,
        [FromQuery] string? location = null,
        [FromQuery] string? stack = null,
        [FromQuery] string? difficulty = null,
        [FromQuery] string sort = "recent",
        CancellationToken ct = default)
    {
        var supabaseUserId = HttpContext.GetSupabaseUserId();
        var userId = supabaseUserId is not null ? await currentUserService.GetCurrentUserIdAsync(supabaseUserId, ct) : null;
        var techStacks = string.IsNullOrEmpty(stack) ? null : stack.Split(',').Select(s => s.Trim()).ToList();
        var result = await interviewsBusiness.GetInterviewsAsync(page, pageSize, authorId, company, role, location, techStacks, difficulty, sort, ct, supabaseUserId);

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
        var supabaseUserId = HttpContext.GetSupabaseUserId();
        var userId = supabaseUserId is not null ? await currentUserService.GetCurrentUserIdAsync(supabaseUserId, ct) : null;
        var result = await interviewsBusiness.GetInterviewByIdAsync(id, ct, supabaseUserId);
        if (result is null) return NotFound();
        return Ok(ApiResponse<InterviewWithQuestionsResponse>.Success(ToFullResponse(result, userId)));
    }

    // ── Writes ────────────────────────────────────────────────────────────────

    [HttpPost]
    [Authorize]
    [EnableRateLimiting("write")]
    [ProducesResponseType(typeof(ApiResponse<InterviewResponse>), 201)]
    public async Task<ActionResult<ApiResponse<InterviewResponse>>> Create(
        [FromBody] CreateInterviewRequest request, CancellationToken ct)
    {
        var supabaseUserId = HttpContext.GetSupabaseUserId() ?? throw new UnauthorizedAccessException();

        await moderation.EnforceAsync(db,
            string.Join("\n", new[] { request.Title, request.Body }.Where(s => !string.IsNullOrWhiteSpace(s))),
            ModerationContext.Interview, ct: ct);

        try
        {
            var result = await interviewsBusiness.CreateInterviewAsync(
                supabaseUserId, request.Title, request.Body, request.CodeSnippet, request.Language,
                request.Company, request.Role, request.Location, request.Type, ct);
            return CreatedAtAction(nameof(GetById), new { id = result.Id },
                ApiResponse<InterviewResponse>.Success(ToResponse(result)));
        }
        catch (UnauthorizedAccessException) { return Unauthorized(); }
    }

    /// <summary>Create an interview with structured Q&A questions.</summary>
    [HttpPost("with-questions")]
    [Authorize]
    [EnableRateLimiting("write")]
    [ProducesResponseType(typeof(ApiResponse<InterviewWithQuestionsResponse>), 201)]
    public async Task<ActionResult<ApiResponse<InterviewWithQuestionsResponse>>> CreateWithQuestions(
        [FromBody] CreateInterviewWithQuestionsRequest request, CancellationToken ct)
    {
        var supabaseUserId = HttpContext.GetSupabaseUserId() ?? throw new UnauthorizedAccessException();

        if (request.Questions is null || request.Questions.Count == 0)
            return BadRequest(new { error = "At least one question is required." });

        // Moderate the title plus every question/answer in one pass — joined with newlines
        // so a single rejection bubbles up with all offending text considered together.
        var combined = string.Join("\n", new[]
        {
            request.Title,
            string.Join("\n",
                request.Questions.SelectMany(q => new[] { q.Question, q.Answer })
                                 .Where(s => !string.IsNullOrWhiteSpace(s)))
        }.Where(s => !string.IsNullOrWhiteSpace(s)));
        await moderation.EnforceAsync(db, combined, ModerationContext.Interview, ct: ct);

        try
        {
            var questionInputs = request.Questions
                .Select(q => new InterviewQuestionInput(q.Question, q.Answer))
                .ToList();

            var result = await interviewsBusiness.CreateInterviewWithQuestionsAsync(
                supabaseUserId, request.Title, request.Company, request.Role, request.Location, request.Difficulty, questionInputs, request.IsAnonymous, ct);

            return CreatedAtAction(nameof(GetById), new { id = result.Id },
                ApiResponse<InterviewWithQuestionsResponse>.Success(ToFullResponse(result)));
        }
        catch (UnauthorizedAccessException) { return Unauthorized(); }
    }

    [HttpPut("{id:guid}")]
    [Authorize]
    [EnableRateLimiting("write")]
    [ProducesResponseType(typeof(ApiResponse<InterviewResponse>), 200)]
    public async Task<ActionResult<ApiResponse<InterviewResponse>>> Update(
        Guid id, [FromBody] UpdateInterviewRequest request, CancellationToken ct)
    {
        var supabaseUserId = HttpContext.GetSupabaseUserId() ?? throw new UnauthorizedAccessException();

        try
        {
            var result = await interviewsBusiness.UpdateInterviewAsync(
                supabaseUserId, id, request.Title, request.Body, request.CodeSnippet, request.Language,
                request.Company, request.Role, request.Location, ct);
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
        var supabaseUserId = HttpContext.GetSupabaseUserId() ?? throw new UnauthorizedAccessException();

        try
        {
            var ok = await interviewsBusiness.DeleteInterviewAsync(supabaseUserId, id, ct);
            if (!ok) return NotFound();
            return Ok(ApiResponse<bool>.Success(true));
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    // ── Question likes ────────────────────────────────────────────────────────

    [HttpPost("questions/{questionId:guid}/likes")]
    [Authorize]
    [EnableRateLimiting("social")]
    public async Task<ActionResult> LikeQuestion(Guid questionId, CancellationToken ct)
    {
        var supabaseUserId = HttpContext.GetSupabaseUserId() ?? throw new UnauthorizedAccessException();
        try
        {
            await interviewsBusiness.LikeQuestionAsync(supabaseUserId, questionId, ct);
            return Ok(ApiResponse<bool>.Success(true));
        }
        catch (UnauthorizedAccessException) { return Unauthorized(); }
    }

    [HttpDelete("questions/{questionId:guid}/likes")]
    [Authorize]
    public async Task<ActionResult> UnlikeQuestion(Guid questionId, CancellationToken ct)
    {
        var supabaseUserId = HttpContext.GetSupabaseUserId() ?? throw new UnauthorizedAccessException();
        try
        {
            await interviewsBusiness.UnlikeQuestionAsync(supabaseUserId, questionId, ct);
            return Ok(ApiResponse<bool>.Success(true));
        }
        catch (UnauthorizedAccessException) { return Unauthorized(); }
    }

    // ── Question comments ─────────────────────────────────────────────────────

    [HttpPost("questions/{questionId:guid}/comments")]
    [Authorize]
    [EnableRateLimiting("social")]
    public async Task<ActionResult> AddQuestionComment(
        Guid questionId, [FromBody] AddInterviewCommentRequest request, CancellationToken ct)
    {
        var supabaseUserId = HttpContext.GetSupabaseUserId() ?? throw new UnauthorizedAccessException();

        await moderation.EnforceAsync(db, request.Body ?? string.Empty, ModerationContext.Comment, ct: ct);

        try
        {
            var result = await interviewsBusiness.AddQuestionCommentAsync(supabaseUserId, questionId, request.Body, request.ParentId, ct);
            return Ok(ApiResponse<object>.Success(new
            {
                result.Id, result.Body, result.AuthorId, result.CreatedAt,
                AuthorUsername    = result.Author?.Username ?? "",
                AuthorDisplayName = result.Author?.DisplayName ?? result.Author?.Username ?? "",
                AuthorAvatarUrl   = result.Author?.AvatarUrl,
                AuthorRoleTitle   = result.Author?.RoleTitle,
            }));
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
                    AuthorUsername    = c.Author?.Username ?? "",
                    AuthorDisplayName = c.Author?.DisplayName ?? c.Author?.Username ?? "",
                    AuthorAvatarUrl   = c.Author?.AvatarUrl,
                    AuthorRoleTitle   = c.Author?.RoleTitle,
                    c.VoteCount, c.CreatedAt, c.ParentId
                }).ToList(),
                result.Total, result.Page, result.PageSize)));
    }

    // ── Interview-level comments ──────────────────────────────────────────────

    [HttpPost("{id:guid}/comments")]
    [Authorize]
    [EnableRateLimiting("social")]
    public async Task<ActionResult> AddComment(Guid id, [FromBody] AddInterviewCommentRequest request, CancellationToken ct)
    {
        var supabaseUserId = HttpContext.GetSupabaseUserId() ?? throw new UnauthorizedAccessException();

        await moderation.EnforceAsync(db, request.Body ?? string.Empty, ModerationContext.Comment, ct: ct);

        try
        {
            var result = await interviewsBusiness.AddCommentAsync(supabaseUserId, id, request.Body, request.ParentId, ct);
            return Ok(ApiResponse<object>.Success(new
            {
                result.Id, result.Body, result.AuthorId, result.CreatedAt,
                AuthorUsername    = result.Author?.Username ?? "",
                AuthorDisplayName = result.Author?.DisplayName ?? result.Author?.Username ?? "",
                AuthorAvatarUrl   = result.Author?.AvatarUrl,
                AuthorRoleTitle   = result.Author?.RoleTitle,
            }));
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
                result.Items.Select(c => (object)new
                {
                    c.Id, c.Body, c.AuthorId,
                    AuthorUsername    = c.Author?.Username ?? "",
                    AuthorDisplayName = c.Author?.DisplayName ?? c.Author?.Username ?? "",
                    AuthorAvatarUrl   = c.Author?.AvatarUrl,
                    AuthorRoleTitle   = c.Author?.RoleTitle,
                    c.VoteCount, c.CreatedAt, c.ParentId
                }).ToList(),
                result.Total, result.Page, result.PageSize)));
    }

    // ── Reactions ─────────────────────────────────────────────────────────────

    [HttpPost("{id:guid}/reactions")]
    [Authorize]
    [EnableRateLimiting("social")]
    public async Task<ActionResult> AddReaction(Guid id, [FromBody] AddInterviewReactionRequest request, CancellationToken ct)
    {
        var supabaseUserId = HttpContext.GetSupabaseUserId() ?? throw new UnauthorizedAccessException();
        try
        {
            await interviewsBusiness.AddReactionAsync(supabaseUserId, id, request.Type, ct);
            return Ok(ApiResponse<bool>.Success(true));
        }
        catch (UnauthorizedAccessException) { return Unauthorized(); }
    }

    [HttpDelete("{id:guid}/reactions")]
    [Authorize]
    public async Task<ActionResult> RemoveReaction(Guid id, CancellationToken ct)
    {
        var supabaseUserId = HttpContext.GetSupabaseUserId() ?? throw new UnauthorizedAccessException();
        try
        {
            await interviewsBusiness.RemoveReactionAsync(supabaseUserId, id, ct);
            return Ok(ApiResponse<bool>.Success(true));
        }
        catch (UnauthorizedAccessException) { return Unauthorized(); }
    }

    // ── Bookmarks ─────────────────────────────────────────────────────────────

    /// <summary>Toggle bookmark on an interview. Returns isSaved=true if now bookmarked, false if removed.</summary>
    [HttpPost("{id:guid}/bookmarks")]
    [Authorize]
    [EnableRateLimiting("social")]
    public async Task<ActionResult> ToggleBookmark(Guid id, CancellationToken ct)
    {
        var supabaseUserId = HttpContext.GetSupabaseUserId() ?? throw new UnauthorizedAccessException();
        try
        {
            var isSaved = await interviewsBusiness.ToggleBookmarkAsync(supabaseUserId, id, ct);
            return Ok(ApiResponse<object>.Success(new { isSaved }));
        }
        catch (UnauthorizedAccessException) { return Unauthorized(); }
    }

    // ── Comment deletes ───────────────────────────────────────────────────────

    [HttpDelete("{id:guid}/comments/{commentId:guid}")]
    [Authorize]
    public async Task<ActionResult> DeleteComment(Guid id, Guid commentId, CancellationToken ct)
    {
        var supabaseUserId = HttpContext.GetSupabaseUserId() ?? throw new UnauthorizedAccessException();
        try
        {
            var ok = await interviewsBusiness.DeleteCommentAsync(supabaseUserId, commentId, ct);
            if (!ok) return NotFound();
            return Ok(ApiResponse<bool>.Success(true));
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
    }

    [HttpDelete("questions/comments/{commentId:guid}")]
    [Authorize]
    public async Task<ActionResult> DeleteQuestionComment(Guid commentId, CancellationToken ct)
    {
        var supabaseUserId = HttpContext.GetSupabaseUserId() ?? throw new UnauthorizedAccessException();
        try
        {
            var ok = await interviewsBusiness.DeleteQuestionCommentAsync(supabaseUserId, commentId, ct);
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
        var supabaseUserId = HttpContext.GetSupabaseUserId() ?? throw new UnauthorizedAccessException();
        try
        {
            var result = await interviewsBusiness.GetMyInterviewsAsync(supabaseUserId, page, pageSize, ct);
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
        var supabaseUserId = HttpContext.GetSupabaseUserId() ?? throw new UnauthorizedAccessException();
        try
        {
            var result = await interviewsBusiness.GetUserInterviewBookmarksAsync(supabaseUserId, page, pageSize, ct);
            var response = new PagedResponse<InterviewWithQuestionsResponse>(
                result.Items.Select(i => ToFullResponse(i)).ToList(),
                result.Total, result.Page, result.PageSize);
            return Ok(ApiResponse<PagedResponse<InterviewWithQuestionsResponse>>.Success(response));
        }
        catch (UnauthorizedAccessException) { return Unauthorized(); }
    }
}
