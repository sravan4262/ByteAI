using ByteAI.Core.Commands.Interviews;
using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;

namespace ByteAI.Core.Services.Interviews;

public interface IInterviewService
{
    Task<PagedResult<Interview>> GetInterviewsAsync(PaginationParams pagination, Guid? authorId, string? company, string? role, string? location, List<string>? techStacks, string sort, CancellationToken ct, Guid? requesterId = null);
    Task<Interview?> GetInterviewByIdAsync(Guid id, CancellationToken ct);
    Task<List<Company>> GetCompaniesAsync(CancellationToken ct);
    Task<List<InterviewRole>> GetRolesAsync(CancellationToken ct);
    Task<List<Location>> GetLocationsAsync(CancellationToken ct);
    Task<Interview> CreateInterviewAsync(Guid authorId, string title, string body, string? codeSnippet, string? language, string? company, string? role, string? location, string type, CancellationToken ct);
    Task<Interview> CreateInterviewWithQuestionsAsync(Guid authorId, string title, string? company, string? role, string? location, List<InterviewQuestionInput> questions, bool isAnonymous, CancellationToken ct);
    Task<Interview> UpdateInterviewAsync(Guid id, Guid requestingUserId, string? title, string? body, string? codeSnippet, string? language, string? company, string? role, string? location, CancellationToken ct);
    Task<bool> DeleteInterviewAsync(Guid id, Guid requestingUserId, CancellationToken ct);
    Task LikeQuestionAsync(Guid questionId, Guid userId, CancellationToken ct);
    Task UnlikeQuestionAsync(Guid questionId, Guid userId, CancellationToken ct);
    Task<InterviewQuestionComment> AddQuestionCommentAsync(Guid questionId, Guid authorId, string body, Guid? parentId, CancellationToken ct);
    Task<PagedResult<InterviewQuestionComment>> GetQuestionCommentsAsync(Guid questionId, PaginationParams pagination, CancellationToken ct);
    Task<InterviewComment> AddCommentAsync(Guid interviewId, Guid authorId, string body, Guid? parentId, CancellationToken ct);
    Task<PagedResult<InterviewComment>> GetCommentsAsync(Guid interviewId, PaginationParams pagination, CancellationToken ct);
    Task AddReactionAsync(Guid interviewId, Guid userId, string reactionType, CancellationToken ct);
    Task RemoveReactionAsync(Guid interviewId, Guid userId, CancellationToken ct);
    Task<bool> ToggleBookmarkAsync(Guid interviewId, Guid userId, CancellationToken ct);
    Task<PagedResult<Interview>> GetUserBookmarksAsync(Guid userId, PaginationParams pagination, CancellationToken ct);
    Task<PagedResult<Interview>> GetMyInterviewsAsync(Guid authorId, PaginationParams pagination, CancellationToken ct);
    Task<bool> DeleteCommentAsync(Guid commentId, Guid authorId, CancellationToken ct);
    Task<bool> DeleteQuestionCommentAsync(Guid commentId, Guid authorId, CancellationToken ct);
}
