using ByteAI.Core.Commands.Interviews;
using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;

namespace ByteAI.Core.Business.Interfaces;

public interface IInterviewsBusiness
{
    // Reads
    Task<PagedResult<Interview>> GetInterviewsAsync(int page, int pageSize, Guid? authorId, string? company, string? difficulty, List<string>? techStacks, string sort, CancellationToken ct, string? clerkId = null);
    Task<Interview?> GetInterviewByIdAsync(Guid id, CancellationToken ct, string? clerkId = null);

    // Writes
    Task<Interview> CreateInterviewAsync(string clerkId, string title, string body, string? codeSnippet, string? language, string? company, string? role, string difficulty, string type, CancellationToken ct);
    Task<Interview> CreateInterviewWithQuestionsAsync(string clerkId, string title, string? company, string? role, string difficulty, List<InterviewQuestionInput> questions, CancellationToken ct);
    Task<Interview> UpdateInterviewAsync(string clerkId, Guid id, string? title, string? body, string? codeSnippet, string? language, string? company, string? role, string? difficulty, CancellationToken ct);
    Task<bool> DeleteInterviewAsync(string clerkId, Guid id, CancellationToken ct);

    // Question interactions
    Task LikeQuestionAsync(string clerkId, Guid questionId, CancellationToken ct);
    Task UnlikeQuestionAsync(string clerkId, Guid questionId, CancellationToken ct);
    Task<InterviewQuestionComment> AddQuestionCommentAsync(string clerkId, Guid questionId, string body, Guid? parentId, CancellationToken ct);
    Task<PagedResult<InterviewQuestionComment>> GetQuestionCommentsAsync(Guid questionId, int page, int pageSize, CancellationToken ct);

    // Interview-level interactions
    Task<InterviewComment> AddCommentAsync(string clerkId, Guid id, string body, Guid? parentId, CancellationToken ct);
    Task<PagedResult<InterviewComment>> GetCommentsAsync(Guid id, int page, int pageSize, CancellationToken ct);
    Task AddReactionAsync(string clerkId, Guid id, string reactionType, CancellationToken ct);
    Task RemoveReactionAsync(string clerkId, Guid id, CancellationToken ct);
    Task<bool> ToggleBookmarkAsync(string clerkId, Guid id, CancellationToken ct);
    Task<PagedResult<Interview>> GetUserInterviewBookmarksAsync(string clerkId, int page, int pageSize, CancellationToken ct);
    Task<PagedResult<Interview>> GetMyInterviewsAsync(string clerkId, int page, int pageSize, CancellationToken ct);

    // Comment deletes (full delete)
    Task<bool> DeleteCommentAsync(string clerkId, Guid commentId, CancellationToken ct);
    Task<bool> DeleteQuestionCommentAsync(string clerkId, Guid commentId, CancellationToken ct);
}
