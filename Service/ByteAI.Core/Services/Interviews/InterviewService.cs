using ByteAI.Core.Commands.Interviews;
using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using MediatR;

namespace ByteAI.Core.Services.Interviews;

public sealed class InterviewService(IMediator mediator) : IInterviewService
{
    public Task<PagedResult<Interview>> GetInterviewsAsync(PaginationParams pagination, Guid? authorId, string? company, string? difficulty, List<string>? techStacks, string sort, CancellationToken ct)
        => mediator.Send(new GetInterviewsWithQuestionsQuery(pagination, authorId, company, difficulty, techStacks, sort), ct);

    public Task<Interview?> GetInterviewByIdAsync(Guid id, CancellationToken ct)
        => mediator.Send(new GetInterviewWithQuestionsQuery(id), ct);

    public Task<Interview> CreateInterviewAsync(Guid authorId, string title, string body, string? codeSnippet, string? language, string? company, string? role, string difficulty, string type, CancellationToken ct)
        => mediator.Send(new CreateInterviewCommand(authorId, title, body, codeSnippet, language, company, role, difficulty, type), ct);

    public Task<Interview> CreateInterviewWithQuestionsAsync(Guid authorId, string title, string? company, string? role, string difficulty, List<InterviewQuestionInput> questions, CancellationToken ct)
        => mediator.Send(new CreateInterviewWithQuestionsCommand(authorId, title, company, role, difficulty, questions), ct);

    public Task<Interview> UpdateInterviewAsync(Guid id, Guid requestingUserId, string? title, string? body, string? codeSnippet, string? language, string? company, string? role, string? difficulty, CancellationToken ct)
        => mediator.Send(new UpdateInterviewCommand(id, requestingUserId, title, body, codeSnippet, language, company, role, difficulty), ct);

    public Task<bool> DeleteInterviewAsync(Guid id, Guid requestingUserId, CancellationToken ct)
        => mediator.Send(new DeleteInterviewCommand(id, requestingUserId), ct);

    public async Task LikeQuestionAsync(Guid questionId, Guid userId, CancellationToken ct)
        => await mediator.Send(new LikeQuestionCommand(questionId, userId), ct);

    public async Task UnlikeQuestionAsync(Guid questionId, Guid userId, CancellationToken ct)
        => await mediator.Send(new UnlikeQuestionCommand(questionId, userId), ct);

    public Task<InterviewQuestionComment> AddQuestionCommentAsync(Guid questionId, Guid authorId, string body, Guid? parentId, CancellationToken ct)
        => mediator.Send(new AddQuestionCommentCommand(questionId, authorId, body, parentId), ct);

    public Task<PagedResult<InterviewQuestionComment>> GetQuestionCommentsAsync(Guid questionId, PaginationParams pagination, CancellationToken ct)
        => mediator.Send(new GetQuestionCommentsQuery(questionId, pagination), ct);

    public Task<InterviewComment> AddCommentAsync(Guid interviewId, Guid authorId, string body, Guid? parentId, CancellationToken ct)
        => mediator.Send(new AddInterviewCommentCommand(interviewId, authorId, body, parentId), ct);

    public Task<PagedResult<InterviewComment>> GetCommentsAsync(Guid interviewId, PaginationParams pagination, CancellationToken ct)
        => mediator.Send(new GetInterviewCommentsQuery(interviewId, pagination), ct);

    public async Task AddReactionAsync(Guid interviewId, Guid userId, string reactionType, CancellationToken ct)
        => await mediator.Send(new AddInterviewReactionCommand(interviewId, userId, reactionType), ct);

    public async Task RemoveReactionAsync(Guid interviewId, Guid userId, CancellationToken ct)
        => await mediator.Send(new RemoveInterviewReactionCommand(interviewId, userId), ct);

    public Task<bool> ToggleBookmarkAsync(Guid interviewId, Guid userId, CancellationToken ct)
        => mediator.Send(new AddInterviewBookmarkCommand(interviewId, userId), ct);

    public Task<PagedResult<Interview>> GetUserBookmarksAsync(Guid userId, PaginationParams pagination, CancellationToken ct)
        => mediator.Send(new GetUserInterviewBookmarksQuery(userId, pagination), ct);

    public Task<PagedResult<Interview>> GetMyInterviewsAsync(Guid authorId, PaginationParams pagination, CancellationToken ct)
        => mediator.Send(new GetMyInterviewsQuery(authorId, pagination), ct);

    public Task<bool> DeleteCommentAsync(Guid commentId, Guid authorId, CancellationToken ct)
        => mediator.Send(new DeleteInterviewCommentCommand(commentId, authorId), ct);

    public Task<bool> DeleteQuestionCommentAsync(Guid commentId, Guid authorId, CancellationToken ct)
        => mediator.Send(new DeleteInterviewQuestionCommentCommand(commentId, authorId), ct);
}
