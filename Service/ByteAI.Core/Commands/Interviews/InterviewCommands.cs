using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using MediatR;

namespace ByteAI.Core.Commands.Interviews;

public sealed record CreateInterviewCommand(
    Guid AuthorId,
    string Title,
    string Body,
    string? CodeSnippet,
    string? Language,
    string? Company,
    string? Role,
    string Difficulty,
    string Type
) : IRequest<Interview>;

public sealed record GetInterviewsQuery(
    PaginationParams Pagination,
    Guid? AuthorId = null,
    string? Company = null,
    string? Difficulty = null,
    string Sort = "recent"
) : IRequest<PagedResult<Interview>>;

public sealed record GetInterviewByIdQuery(Guid Id) : IRequest<Interview?>;

public sealed record UpdateInterviewCommand(
    Guid Id,
    Guid RequestingUserId,
    string? Title,
    string? Body,
    string? CodeSnippet,
    string? Language,
    string? Company,
    string? Role,
    string? Difficulty
) : IRequest<Interview>;

public sealed record DeleteInterviewCommand(Guid Id, Guid RequestingUserId) : IRequest<bool>;

public sealed record InterviewQuestionInput(string Question, string Answer);

public sealed record CreateInterviewWithQuestionsCommand(
    Guid AuthorId,
    string Title,
    string? Company,
    string? Role,
    string Difficulty,
    List<InterviewQuestionInput> Questions
) : IRequest<Interview>;

// Comments
public sealed record AddInterviewCommentCommand(Guid InterviewId, Guid AuthorId, string Body, Guid? ParentId) : IRequest<InterviewComment>;
public sealed record GetInterviewCommentsQuery(Guid InterviewId, PaginationParams Pagination) : IRequest<PagedResult<InterviewComment>>;
public sealed record DeleteInterviewCommentCommand(Guid CommentId, Guid AuthorId) : IRequest<bool>;
public sealed record DeleteInterviewQuestionCommentCommand(Guid CommentId, Guid AuthorId) : IRequest<bool>;

// Reactions (likes)
public sealed record AddInterviewReactionCommand(Guid InterviewId, Guid UserId, string Type) : IRequest<bool>;
public sealed record RemoveInterviewReactionCommand(Guid InterviewId, Guid UserId) : IRequest<bool>;

// Bookmarks
public sealed record AddInterviewBookmarkCommand(Guid InterviewId, Guid UserId) : IRequest<bool>;
public sealed record RemoveInterviewBookmarkCommand(Guid InterviewId, Guid UserId) : IRequest<bool>;

// Question comments
public sealed record AddQuestionCommentCommand(
    Guid QuestionId, Guid AuthorId, string Body, Guid? ParentId
) : IRequest<InterviewQuestionComment>;

public sealed record GetQuestionCommentsQuery(
    Guid QuestionId, PaginationParams Pagination
) : IRequest<PagedResult<InterviewQuestionComment>>;

// Question likes
public sealed record LikeQuestionCommand(Guid QuestionId, Guid UserId) : IRequest<bool>;
public sealed record UnlikeQuestionCommand(Guid QuestionId, Guid UserId) : IRequest<bool>;

// Get interview with questions (for display)
public sealed record GetInterviewWithQuestionsQuery(Guid InterviewId) : IRequest<Interview?>;
public sealed record GetInterviewsWithQuestionsQuery(
    PaginationParams Pagination,
    Guid? AuthorId = null,
    string? Company = null,
    string? Difficulty = null,
    List<string>? TechStacks = null,
    string Sort = "recent"
) : IRequest<PagedResult<Interview>>;

// User bookmarks
public sealed record GetUserInterviewBookmarksQuery(Guid UserId, PaginationParams Pagination) : IRequest<PagedResult<Interview>>;

// My interviews (author view — active only)
public sealed record GetMyInterviewsQuery(Guid AuthorId, PaginationParams Pagination) : IRequest<PagedResult<Interview>>;
