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
        int page, int pageSize, Guid? authorId, string? company, string? difficulty,
        List<string>? techStacks, string sort, CancellationToken ct) =>
        await interviewService.GetInterviewsAsync(
            new PaginationParams(page, Math.Min(pageSize, 50)),
            authorId, company, difficulty, techStacks, sort, ct);

    public async Task<Interview?> GetInterviewByIdAsync(Guid id, CancellationToken ct) =>
        await interviewService.GetInterviewByIdAsync(id, ct);

    // ── Writes ───────────────────────────────────────────────────────────────

    public async Task<Interview> CreateInterviewAsync(
        string clerkId, string title, string body, string? codeSnippet, string? language,
        string? company, string? role, string difficulty, string type, CancellationToken ct)
    {
        var userId = await ResolveUserIdAsync(clerkId, ct);
        return await interviewService.CreateInterviewAsync(userId, title, body, codeSnippet, language, company, role, difficulty, type, ct);
    }

    public async Task<Interview> CreateInterviewWithQuestionsAsync(
        string clerkId, string title, string? company, string? role, string difficulty,
        List<InterviewQuestionInput> questions, CancellationToken ct)
    {
        var userId = await ResolveUserIdAsync(clerkId, ct);
        return await interviewService.CreateInterviewWithQuestionsAsync(userId, title, company, role, difficulty, questions, ct);
    }

    public async Task<Interview> UpdateInterviewAsync(
        string clerkId, Guid id, string? title, string? body, string? codeSnippet,
        string? language, string? company, string? role, string? difficulty, CancellationToken ct)
    {
        var userId = await ResolveUserIdAsync(clerkId, ct);
        return await interviewService.UpdateInterviewAsync(id, userId, title, body, codeSnippet, language, company, role, difficulty, ct);
    }

    public async Task<bool> DeleteInterviewAsync(string clerkId, Guid id, CancellationToken ct)
    {
        var userId = await ResolveUserIdAsync(clerkId, ct);
        return await interviewService.DeleteInterviewAsync(id, userId, ct);
    }

    // ── Question interactions ────────────────────────────────────────────────

    public async Task LikeQuestionAsync(string clerkId, Guid questionId, CancellationToken ct)
    {
        var userId = await ResolveUserIdAsync(clerkId, ct);
        await interviewService.LikeQuestionAsync(questionId, userId, ct);
    }

    public async Task UnlikeQuestionAsync(string clerkId, Guid questionId, CancellationToken ct)
    {
        var userId = await ResolveUserIdAsync(clerkId, ct);
        await interviewService.UnlikeQuestionAsync(questionId, userId, ct);
    }

    public async Task<InterviewQuestionComment> AddQuestionCommentAsync(
        string clerkId, Guid questionId, string body, Guid? parentId, CancellationToken ct)
    {
        var userId = await ResolveUserIdAsync(clerkId, ct);
        return await interviewService.AddQuestionCommentAsync(questionId, userId, body, parentId, ct);
    }

    public async Task<PagedResult<InterviewQuestionComment>> GetQuestionCommentsAsync(
        Guid questionId, int page, int pageSize, CancellationToken ct) =>
        await interviewService.GetQuestionCommentsAsync(questionId, new PaginationParams(page, pageSize), ct);

    // ── Interview-level interactions ─────────────────────────────────────────

    public async Task<InterviewComment> AddCommentAsync(
        string clerkId, Guid id, string body, Guid? parentId, CancellationToken ct)
    {
        var userId = await ResolveUserIdAsync(clerkId, ct);
        return await interviewService.AddCommentAsync(id, userId, body, parentId, ct);
    }

    public async Task<PagedResult<InterviewComment>> GetCommentsAsync(
        Guid id, int page, int pageSize, CancellationToken ct) =>
        await interviewService.GetCommentsAsync(id, new PaginationParams(page, pageSize), ct);

    public async Task AddReactionAsync(string clerkId, Guid id, string reactionType, CancellationToken ct)
    {
        var userId = await ResolveUserIdAsync(clerkId, ct);
        await interviewService.AddReactionAsync(id, userId, reactionType, ct);
    }

    public async Task RemoveReactionAsync(string clerkId, Guid id, CancellationToken ct)
    {
        var userId = await ResolveUserIdAsync(clerkId, ct);
        await interviewService.RemoveReactionAsync(id, userId, ct);
    }

    public async Task<bool> ToggleBookmarkAsync(string clerkId, Guid id, CancellationToken ct)
    {
        var userId = await ResolveUserIdAsync(clerkId, ct);
        return await interviewService.ToggleBookmarkAsync(id, userId, ct);
    }

    public async Task<bool> DeleteCommentAsync(string clerkId, Guid commentId, CancellationToken ct)
    {
        var userId = await ResolveUserIdAsync(clerkId, ct);
        return await interviewService.DeleteCommentAsync(commentId, userId, ct);
    }

    public async Task<bool> DeleteQuestionCommentAsync(string clerkId, Guid commentId, CancellationToken ct)
    {
        var userId = await ResolveUserIdAsync(clerkId, ct);
        return await interviewService.DeleteQuestionCommentAsync(commentId, userId, ct);
    }

    public async Task<PagedResult<Interview>> GetUserInterviewBookmarksAsync(string clerkId, int page, int pageSize, CancellationToken ct)
    {
        var userId = await ResolveUserIdAsync(clerkId, ct);
        return await interviewService.GetUserBookmarksAsync(userId, new PaginationParams(page, Math.Min(pageSize, 100)), ct);
    }

    public async Task<PagedResult<Interview>> GetMyInterviewsAsync(string clerkId, int page, int pageSize, CancellationToken ct)
    {
        var authorId = await ResolveUserIdAsync(clerkId, ct);
        return await interviewService.GetMyInterviewsAsync(authorId, new PaginationParams(page, Math.Min(pageSize, 100)), ct);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private async Task<Guid> ResolveUserIdAsync(string clerkId, CancellationToken ct)
    {
        var userId = await currentUserService.GetCurrentUserIdAsync(clerkId, ct);
        if (userId is null) throw new UnauthorizedAccessException("User not found for the given Clerk ID.");
        return userId.Value;
    }
}
