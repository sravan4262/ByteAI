using ByteAI.Core.Commands.Interviews;
using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;

namespace ByteAI.Core.Business.Interfaces;

public interface IInterviewsBusiness
{
    // Reads
    Task<PagedResult<Interview>> GetInterviewsAsync(int page, int pageSize, Guid? authorId, string? company, string? role, string? location, List<string>? techStacks, string sort, CancellationToken ct, string? supabaseUserId = null);
    Task<Interview?> GetInterviewByIdAsync(Guid id, CancellationToken ct, string? supabaseUserId = null);
    Task<List<Company>> GetCompaniesAsync(CancellationToken ct);
    Task<List<InterviewRole>> GetRolesAsync(CancellationToken ct);
    Task<List<Location>> GetLocationsAsync(CancellationToken ct);

    // Writes
    Task<Interview> CreateInterviewAsync(string supabaseUserId, string title, string body, string? codeSnippet, string? language, string? company, string? role, string? location, string type, CancellationToken ct);
    Task<Interview> CreateInterviewWithQuestionsAsync(string supabaseUserId, string title, string? company, string? role, string? location, List<InterviewQuestionInput> questions, bool isAnonymous, CancellationToken ct);
    Task<Interview> UpdateInterviewAsync(string supabaseUserId, Guid id, string? title, string? body, string? codeSnippet, string? language, string? company, string? role, string? location, CancellationToken ct);
    Task<bool> DeleteInterviewAsync(string supabaseUserId, Guid id, CancellationToken ct);

    // Question interactions
    Task LikeQuestionAsync(string supabaseUserId, Guid questionId, CancellationToken ct);
    Task UnlikeQuestionAsync(string supabaseUserId, Guid questionId, CancellationToken ct);
    Task<InterviewQuestionComment> AddQuestionCommentAsync(string supabaseUserId, Guid questionId, string body, Guid? parentId, CancellationToken ct);
    Task<PagedResult<InterviewQuestionComment>> GetQuestionCommentsAsync(Guid questionId, int page, int pageSize, CancellationToken ct);

    // Interview-level interactions
    Task<InterviewComment> AddCommentAsync(string supabaseUserId, Guid id, string body, Guid? parentId, CancellationToken ct);
    Task<PagedResult<InterviewComment>> GetCommentsAsync(Guid id, int page, int pageSize, CancellationToken ct);
    Task AddReactionAsync(string supabaseUserId, Guid id, string reactionType, CancellationToken ct);
    Task RemoveReactionAsync(string supabaseUserId, Guid id, CancellationToken ct);
    Task<bool> ToggleBookmarkAsync(string supabaseUserId, Guid id, CancellationToken ct);
    Task<PagedResult<Interview>> GetUserInterviewBookmarksAsync(string supabaseUserId, int page, int pageSize, CancellationToken ct);
    Task<PagedResult<Interview>> GetMyInterviewsAsync(string supabaseUserId, int page, int pageSize, CancellationToken ct);

    // Comment deletes (full delete)
    Task<bool> DeleteCommentAsync(string supabaseUserId, Guid commentId, CancellationToken ct);
    Task<bool> DeleteQuestionCommentAsync(string supabaseUserId, Guid commentId, CancellationToken ct);
}
