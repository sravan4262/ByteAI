using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Persistence;
using ByteAI.Core.Services.AI;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Pgvector.EntityFrameworkCore;

namespace ByteAI.Core.Services.Feed;

public sealed class FeedService(
    AppDbContext db,
    IEmbeddingService embedding,
    ILogger<FeedService> logger) : IFeedService
{
    public async Task<PagedResult<Entities.Byte>> GetForYouAsync(
        Guid userId, PaginationParams pagination, List<string>? tags, CancellationToken ct = default)
    {
        var user = await db.Users.FindAsync([userId], ct);
        if (user is null) return Empty(pagination);

        // Get IDs the user follows for following boost
        var followingIds = await db.Follows
            .Where(f => f.FollowerId == userId)
            .Select(f => f.FollowingId)
            .ToListAsync(ct);

        var query = db.Bytes.AsNoTracking().AsQueryable();

        if (tags?.Count > 0)
            query = query.Where(b => b.Tags.Any(t => tags.Contains(t)));

        // Prefer pgvector semantic ordering when user has an interest embedding
        if (user.InterestEmbedding is not null)
        {
            var userVec = user.InterestEmbedding;

            // Order by cosine distance (ascending = more similar) as primary sort
            // then fall back to recency. Full weighted scoring requires a DB function
            // or raw SQL; this gives a good semantic ordering for MVP.
            query = query
                .Where(b => b.Embedding != null)
                .OrderBy(b => b.Embedding!.CosineDistance(userVec));
        }
        else
        {
            // No embedding — fall back to engagement score
            query = query.OrderByDescending(b => b.LikeCount * 10 + b.CommentCount * 5);
        }

        var total = await query.CountAsync(ct);
        var items = await query.Skip(pagination.Skip).Take(pagination.PageSize).ToListAsync(ct);

        // Apply following boost in-memory (re-sort: followed authors first)
        if (followingIds.Count > 0)
        {
            items = items
                .OrderByDescending(b => followingIds.Contains(b.AuthorId) ? 1 : 0)
                .ThenBy(_ => 0) // preserve original order otherwise
                .ToList();
        }

        return new PagedResult<Entities.Byte>(items, total, pagination.Page, pagination.PageSize);
    }

    public async Task<PagedResult<Entities.Byte>> GetFollowingAsync(
        Guid userId, PaginationParams pagination, CancellationToken ct = default)
    {
        var followingIds = await db.Follows
            .Where(f => f.FollowerId == userId)
            .Select(f => f.FollowingId)
            .ToListAsync(ct);

        if (followingIds.Count == 0) return Empty(pagination);

        var total = await db.Bytes.CountAsync(b => followingIds.Contains(b.AuthorId), ct);
        var items = await db.Bytes
            .AsNoTracking()
            .Where(b => followingIds.Contains(b.AuthorId))
            .OrderByDescending(b => b.CreatedAt)
            .Skip(pagination.Skip)
            .Take(pagination.PageSize)
            .ToListAsync(ct);

        return new PagedResult<Entities.Byte>(items, total, pagination.Page, pagination.PageSize);
    }

    public async Task<PagedResult<Entities.Byte>> GetTrendingAsync(
        PaginationParams pagination, List<string>? tags, CancellationToken ct = default)
    {
        var query = db.Bytes.AsNoTracking().AsQueryable();

        if (tags?.Count > 0)
            query = query.Where(b => b.Tags.Any(t => tags.Contains(t)));

        // Trending: engagement-weighted recency score evaluated in-memory for MVP
        var now = DateTime.UtcNow;
        var candidates = await query.ToListAsync(ct);

        var sorted = candidates
            .OrderByDescending(b => (b.LikeCount * 10 + b.CommentCount * 5) /
                                    ((now - b.CreatedAt).TotalDays + 1))
            .ToList();

        return new PagedResult<Entities.Byte>(
            sorted.Skip(pagination.Skip).Take(pagination.PageSize).ToList(),
            sorted.Count, pagination.Page, pagination.PageSize);
    }

    private static PagedResult<Entities.Byte> Empty(PaginationParams p) =>
        new([], 0, p.Page, p.PageSize);
}
