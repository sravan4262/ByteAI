using ByteAI.Core.Business.Interfaces;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Services;
using ByteAI.Core.Services.Trending;

namespace ByteAI.Core.Business;

public sealed class TrendingBusiness(ITrendingService trendingService, ICurrentUserService currentUserService) : ITrendingBusiness
{
    public async Task RecordClickAsync(Guid contentId, string contentType, string? clerkId, CancellationToken ct)
    {
        Guid? userId = null;
        if (clerkId is not null)
            userId = await currentUserService.GetCurrentUserIdAsync(clerkId, ct);
        await trendingService.RecordClickAsync(contentId, contentType, userId, ct);
    }

    public async Task<List<Guid>> GetTrendingAsync(int page, int pageSize, string contentType, CancellationToken ct) =>
        await trendingService.GetTrendingIdsAsync(new PaginationParams(page, Math.Min(pageSize, 100)), contentType, ct);
}
