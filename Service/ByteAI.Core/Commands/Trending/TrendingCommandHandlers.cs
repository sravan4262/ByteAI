using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ByteAI.Core.Commands.Trending;

public sealed class RecordClickCommandHandler(AppDbContext db)
    : IRequestHandler<RecordClickCommand>
{
    public async Task Handle(RecordClickCommand request, CancellationToken ct)
    {
        db.TrendingEvents.Add(new TrendingEvent
        {
            Id = Guid.NewGuid(),
            ContentId = request.ContentId,
            ContentType = request.ContentType,
            UserId = request.UserId,
            ClickedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync(ct);
    }
}

public sealed class GetTrendingQueryHandler(AppDbContext db)
    : IRequestHandler<GetTrendingQuery, List<Guid>>
{
    public async Task<List<Guid>> Handle(GetTrendingQuery request, CancellationToken ct)
    {
        var since = DateTime.UtcNow.AddHours(-24);
        return await db.TrendingEvents
            .Where(t => t.ContentType == request.ContentType && t.ClickedAt >= since)
            .GroupBy(t => t.ContentId)
            .OrderByDescending(g => g.Count())
            .Select(g => g.Key)
            .Skip(request.Pagination.Skip)
            .Take(request.Pagination.PageSize)
            .ToListAsync(CancellationToken.None);
    }
}
