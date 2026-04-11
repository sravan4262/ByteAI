using ByteAI.Core.Infrastructure;

namespace ByteAI.Core.Services.Trending;

public interface ITrendingService
{
    Task RecordClickAsync(Guid contentId, string contentType, Guid? userId, CancellationToken ct);
    Task<List<Guid>> GetTrendingIdsAsync(PaginationParams pagination, string contentType, CancellationToken ct);
}
