using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using MediatR;

namespace ByteAI.Core.Commands.Comments;

public sealed record CreateCommentCommand(Guid ByteId, Guid AuthorId, string Body, Guid? ParentCommentId = null) : IRequest<Comment>;
public sealed record GetCommentsByByteQuery(Guid ByteId, PaginationParams Pagination) : IRequest<PagedResult<Comment>>;
public sealed record UpdateCommentCommand(Guid CommentId, Guid AuthorId, string Body) : IRequest<Comment>;
public sealed record DeleteCommentCommand(Guid CommentId, Guid AuthorId) : IRequest<bool>;
