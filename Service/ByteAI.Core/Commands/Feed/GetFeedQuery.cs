using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using MediatR;

namespace ByteAI.Core.Commands.Feed;

public sealed record GetFeedQuery(
    Guid UserId,
    PaginationParams Pagination,
    List<string>? Tags = null,
    string Sort = "trending"
) : IRequest<PagedResult<Byte>>;
