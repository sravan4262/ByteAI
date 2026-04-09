using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ByteAI.Core.Commands.Feed;

/// <summary>
/// Feed ranking: followed-user bytes first, then scored by engagement / recency.
/// Score = (LikeCount × 10 + CommentCount × 5) / (days_old + 1)
/// </summary>
public sealed class GetFeedQueryHandler(AppDbContext db)
    : IRequestHandler<GetFeedQuery, PagedResult<Byte>>
{
    public async Task<PagedResult<Byte>> Handle(GetFeedQuery request, CancellationToken cancellationToken)
    {
        var followedIds = await db.Follows
            .Where(f => f.FollowerId == request.UserId)
            .Select(f => f.FollowingId)
            .ToListAsync(cancellationToken);

        var query = db.Bytes.AsQueryable();

        if (request.Tags?.Count > 0)
            query = query.Where(b => b.Tags.Any(t => request.Tags.Contains(t)));

        // Pull all candidates into memory for in-process scoring (MVP — add DB function later)
        var now = DateTime.UtcNow;
        var candidates = await query.ToListAsync(cancellationToken);

        var sorted = candidates
            .Select(b => new
            {
                Byte = b,
                IsFollowed = followedIds.Contains(b.AuthorId),
                RankScore = (b.LikeCount * 10 + b.CommentCount * 5) / ((now - b.CreatedAt).TotalDays + 1)
            })
            .OrderByDescending(s => s.IsFollowed ? 1 : 0)
            .ThenByDescending(s => request.Sort == "trending" ? s.RankScore : 0)
            .ThenByDescending(s => s.Byte.CreatedAt)
            .ToList();

        var total = sorted.Count;
        var items = sorted
            .Skip(request.Pagination.Skip)
            .Take(request.Pagination.PageSize)
            .Select(s => s.Byte)
            .ToList();

        return new PagedResult<Byte>(items, total, request.Pagination.Page, request.Pagination.PageSize);
    }
}
