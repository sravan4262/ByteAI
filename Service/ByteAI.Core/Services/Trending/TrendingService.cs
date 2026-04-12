using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ByteAI.Core.Services.Trending;

public sealed class TrendingService(AppDbContext db) : ITrendingService
{
    public async Task RecordClickAsync(Guid contentId, string contentType, Guid? userId, CancellationToken ct)
    {
        db.TrendingEvents.Add(new TrendingEvent
        {
            Id = Guid.NewGuid(),
            ContentId = contentId,
            ContentType = contentType,
            UserId = userId,
            ClickedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync(ct);
    }

    public Task<List<Guid>> GetTrendingIdsAsync(PaginationParams pagination, string contentType, CancellationToken ct)
    {
        var since = DateTime.UtcNow.AddHours(-24);
        return db.TrendingEvents
            .Where(t => t.ContentType == contentType && t.ClickedAt >= since)
            .GroupBy(t => t.ContentId)
            .OrderByDescending(g => g.Count())
            .Select(g => g.Key)
            .Skip(pagination.Skip)
            .Take(pagination.PageSize)
            .ToListAsync(CancellationToken.None);
    }
}
