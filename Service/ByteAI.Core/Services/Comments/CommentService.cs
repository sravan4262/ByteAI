using ByteAI.Core.Commands.Comments;
using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using MediatR;

namespace ByteAI.Core.Services.Comments;

public sealed class CommentService(IMediator mediator) : ICommentService
{
    public Task<PagedResult<Comment>> GetCommentsByByteAsync(Guid byteId, PaginationParams pagination, CancellationToken ct)
        => mediator.Send(new GetCommentsByByteQuery(byteId, pagination), ct);

    public Task<Comment> CreateCommentAsync(Guid byteId, Guid authorId, string body, Guid? parentCommentId, CancellationToken ct)
        => mediator.Send(new CreateCommentCommand(byteId, authorId, body, parentCommentId), ct);

    public Task<Comment> UpdateCommentAsync(Guid commentId, Guid authorId, string body, CancellationToken ct)
        => mediator.Send(new UpdateCommentCommand(commentId, authorId, body), ct);

    public Task<bool> DeleteCommentAsync(Guid commentId, Guid authorId, CancellationToken ct)
        => mediator.Send(new DeleteCommentCommand(commentId, authorId), ct);
}
