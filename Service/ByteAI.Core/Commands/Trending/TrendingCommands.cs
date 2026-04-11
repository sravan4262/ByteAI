using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using MediatR;

namespace ByteAI.Core.Commands.Trending;

public sealed record RecordClickCommand(Guid ContentId, string ContentType, Guid? UserId) : IRequest;

public sealed record GetTrendingQuery(
    PaginationParams Pagination,
    string ContentType = "byte"
) : IRequest<List<Guid>>;
