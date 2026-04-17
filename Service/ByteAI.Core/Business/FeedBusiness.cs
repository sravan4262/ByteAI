using ByteAI.Core.Business.Interfaces;
using ByteAI.Core.Commands.Bytes;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Services;
using ByteAI.Core.Services.Feed;

namespace ByteAI.Core.Business;

public sealed class FeedBusiness(IFeedService feedService, ICurrentUserService currentUserService) : IFeedBusiness
{
    public async Task<PagedResult<ByteResult>> GetFeedAsync(string? supabaseUserId, int page, int pageSize, List<string>? tags, string filter, CancellationToken ct)
    {
        Guid? userId = null;
        if (supabaseUserId is not null)
            userId = await currentUserService.GetCurrentUserIdAsync(supabaseUserId, ct);

        return await feedService.GetFeedAsync(userId, new PaginationParams(page, Math.Min(pageSize, 100)), tags, filter, ct);
    }
}
