using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using MediatR;

namespace ByteAI.Core.Commands.Bookmarks;

public sealed record CreateBookmarkCommand(Guid ByteId, Guid UserId) : IRequest<Bookmark>;
public sealed record DeleteBookmarkCommand(Guid ByteId, Guid UserId) : IRequest<bool>;
public sealed record GetUserBookmarksQuery(Guid UserId, PaginationParams Pagination) : IRequest<PagedResult<Byte>>;
