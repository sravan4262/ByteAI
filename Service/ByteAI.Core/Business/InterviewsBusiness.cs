using ByteAI.Core.Business.Interfaces;
using ByteAI.Core.Commands.Interviews;
using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Services;
using ByteAI.Core.Services.Interviews;

namespace ByteAI.Core.Business;

public sealed class InterviewsBusiness(IInterviewService interviewService, ICurrentUserService currentUserService) : IInterviewsBusiness
{
    // ── Reads ────────────────────────────────────────────────────────────────

    public async Task<PagedResult<Interview>> GetInterviewsAsync(
        int page, int pageSize, Guid? authorId, string? company, string? role, string? location,
        List<string>? techStacks, string? difficulty, string sort, CancellationToken ct, string? supabaseUserId = null)
    {
        var requesterId = supabaseUserId is not null ? await currentUserService.GetCurrentUserIdAsync(supabaseUserId, ct) : null;
        return await interviewService.GetInterviewsAsync(
            new PaginationParams(page, Math.Min(pageSize, 50)),
            authorId, company, role, location, techStacks, difficulty, sort, ct, requesterId);
    }

    public async Task<Interview?> GetInterviewByIdAsync(Guid id, CancellationToken ct, string? supabaseUserId = null)
    {
        var requesterId = supabaseUserId is not null ? await currentUserService.GetCurrentUserIdAsync(supabaseUserId, ct) : null;
        return await interviewService.GetInterviewByIdAsync(id, ct, requesterId);
    }

    public Task<List<Company>> GetCompaniesAsync(CancellationToken ct) =>
        interviewService.GetCompaniesAsync(ct);

    public Task<List<InterviewRole>> GetRolesAsync(CancellationToken ct) =>
        interviewService.GetRolesAsync(ct);

    public Task<List<Location>> GetLocationsAsync(CancellationToken ct) =>
        interviewService.GetLocationsAsync(ct);

    // ── Writes ───────────────────────────────────────────────────────────────

    public async Task<Interview> CreateInterviewAsync(
        string supabaseUserId, string title, string body, string? codeSnippet, string? language,
        string? company, string? role, string? location, string type, CancellationToken ct)
    {
        var userId = await ResolveUserIdAsync(supabaseUserId, ct);
        return await interviewService.CreateInterviewAsync(userId, title, body, codeSnippet, language, company, role, location, type, ct);
    }

    public async Task<Interview> CreateInterviewWithQuestionsAsync(
        string supabaseUserId, string title, string? company, string? role, string? location,
        string difficulty, List<InterviewQuestionInput> questions, bool isAnonymous, CancellationToken ct)
    {
        var userId = await ResolveUserIdAsync(supabaseUserId, ct);
        return await interviewService.CreateInterviewWithQuestionsAsync(userId, title, company, role, location, difficulty, questions, isAnonymous, ct);
    }

    public async Task<Interview> UpdateInterviewAsync(
        string supabaseUserId, Guid id, string? title, string? body, string? codeSnippet,
        string? language, string? company, string? role, string? location, CancellationToken ct)
    {
        var userId = await ResolveUserIdAsync(supabaseUserId, ct);
        return await interviewService.UpdateInterviewAsync(id, userId, title, body, codeSnippet, language, company, role, location, ct);
    }

    public async Task<bool> DeleteInterviewAsync(string supabaseUserId, Guid id, CancellationToken ct)
    {
        var userId = await ResolveUserIdAsync(supabaseUserId, ct);
        return await interviewService.DeleteInterviewAsync(id, userId, ct);
    }

    // ── Question interactions ────────────────────────────────────────────────

    public async Task LikeQuestionAsync(string supabaseUserId, Guid questionId, CancellationToken ct)
    {
        var userId = await ResolveUserIdAsync(supabaseUserId, ct);
        await interviewService.LikeQuestionAsync(questionId, userId, ct);
    }

    public async Task UnlikeQuestionAsync(string supabaseUserId, Guid questionId, CancellationToken ct)
    {
        var userId = await ResolveUserIdAsync(supabaseUserId, ct);
        await interviewService.UnlikeQuestionAsync(questionId, userId, ct);
    }

    public async Task<InterviewQuestionComment> AddQuestionCommentAsync(
        string supabaseUserId, Guid questionId, string body, Guid? parentId, CancellationToken ct)
    {
        var userId = await ResolveUserIdAsync(supabaseUserId, ct);
        return await interviewService.AddQuestionCommentAsync(questionId, userId, body, parentId, ct);
    }

    public async Task<PagedResult<InterviewQuestionComment>> GetQuestionCommentsAsync(
        Guid questionId, int page, int pageSize, CancellationToken ct, string? supabaseUserId = null)
    {
        var requesterId = supabaseUserId is not null ? await currentUserService.GetCurrentUserIdAsync(supabaseUserId, ct) : null;
        return await interviewService.GetQuestionCommentsAsync(questionId, new PaginationParams(page, pageSize), ct, requesterId);
    }

    // ── Interview-level interactions ─────────────────────────────────────────

    public async Task<InterviewComment> AddCommentAsync(
        string supabaseUserId, Guid id, string body, Guid? parentId, CancellationToken ct)
    {
        var userId = await ResolveUserIdAsync(supabaseUserId, ct);
        return await interviewService.AddCommentAsync(id, userId, body, parentId, ct);
    }

    public async Task<PagedResult<InterviewComment>> GetCommentsAsync(
        Guid id, int page, int pageSize, CancellationToken ct, string? supabaseUserId = null)
    {
        var requesterId = supabaseUserId is not null ? await currentUserService.GetCurrentUserIdAsync(supabaseUserId, ct) : null;
        return await interviewService.GetCommentsAsync(id, new PaginationParams(page, pageSize), ct, requesterId);
    }

    public async Task AddReactionAsync(string supabaseUserId, Guid id, string reactionType, CancellationToken ct)
    {
        var userId = await ResolveUserIdAsync(supabaseUserId, ct);
        await interviewService.AddReactionAsync(id, userId, reactionType, ct);
    }

    public async Task RemoveReactionAsync(string supabaseUserId, Guid id, CancellationToken ct)
    {
        var userId = await ResolveUserIdAsync(supabaseUserId, ct);
        await interviewService.RemoveReactionAsync(id, userId, ct);
    }

    public async Task<bool> ToggleBookmarkAsync(string supabaseUserId, Guid id, CancellationToken ct)
    {
        var userId = await ResolveUserIdAsync(supabaseUserId, ct);
        return await interviewService.ToggleBookmarkAsync(id, userId, ct);
    }

    public async Task<bool> DeleteCommentAsync(string supabaseUserId, Guid commentId, CancellationToken ct)
    {
        var userId = await ResolveUserIdAsync(supabaseUserId, ct);
        return await interviewService.DeleteCommentAsync(commentId, userId, ct);
    }

    public async Task<bool> DeleteQuestionCommentAsync(string supabaseUserId, Guid commentId, CancellationToken ct)
    {
        var userId = await ResolveUserIdAsync(supabaseUserId, ct);
        return await interviewService.DeleteQuestionCommentAsync(commentId, userId, ct);
    }

    public async Task<PagedResult<Interview>> GetUserInterviewBookmarksAsync(string supabaseUserId, int page, int pageSize, CancellationToken ct)
    {
        var userId = await ResolveUserIdAsync(supabaseUserId, ct);
        return await interviewService.GetUserBookmarksAsync(userId, new PaginationParams(page, Math.Min(pageSize, 100)), ct);
    }

    public async Task<PagedResult<Interview>> GetMyInterviewsAsync(string supabaseUserId, int page, int pageSize, CancellationToken ct)
    {
        var authorId = await ResolveUserIdAsync(supabaseUserId, ct);
        return await interviewService.GetMyInterviewsAsync(authorId, new PaginationParams(page, Math.Min(pageSize, 100)), ct);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private async Task<Guid> ResolveUserIdAsync(string supabaseUserId, CancellationToken ct)
    {
        var userId = await currentUserService.GetCurrentUserIdAsync(supabaseUserId, ct);
        if (userId is null) throw new UnauthorizedAccessException("User not found.");
        return userId.Value;
    }
}
