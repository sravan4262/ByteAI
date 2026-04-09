using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using MediatR;

namespace ByteAI.Core.Commands.Bytes;

public sealed record GetBytesQuery(
    PaginationParams Pagination,
    Guid? AuthorId = null,
    List<string>? Tags = null,
    string Sort = "recent"
) : IRequest<PagedResult<Byte>>;
