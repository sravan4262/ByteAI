using ByteAI.Core.Infrastructure;
using MediatR;

namespace ByteAI.Core.Commands.Bytes;

public sealed record GetBytesQuery(
    PaginationParams Pagination,
    Guid? AuthorId = null,
    string Sort = "recent"
) : IRequest<PagedResult<ByteResult>>;

/// <summary>Returns ALL bytes (active + inactive) for the author — used on the profile "my posts" view.</summary>
public sealed record GetMyBytesQuery(Guid AuthorId, PaginationParams Pagination) : IRequest<PagedResult<ByteResult>>;
