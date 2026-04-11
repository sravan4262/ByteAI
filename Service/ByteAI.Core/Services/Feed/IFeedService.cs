using ByteAI.Core.Commands.Bytes;
using ByteAI.Core.Infrastructure;

namespace ByteAI.Core.Services.Feed;

public interface IFeedService
{
    Task<PagedResult<Entities.Byte>> GetForYouAsync(Guid userId, PaginationParams pagination, CancellationToken ct = default);
    Task<PagedResult<Entities.Byte>> GetFollowingAsync(Guid userId, PaginationParams pagination, CancellationToken ct = default);
    Task<PagedResult<Entities.Byte>> GetTrendingAsync(PaginationParams pagination, CancellationToken ct = default);
    Task<PagedResult<ByteResult>> GetFeedAsync(Guid? userId, PaginationParams pagination, List<string>? tags, string filter, CancellationToken ct);
}
