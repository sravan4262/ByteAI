using ByteAI.Core.Commands.Bytes;
using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Pgvector.EntityFrameworkCore;

namespace ByteAI.Core.Services.Feed;

public sealed class FeedService(AppDbContext db) : IFeedService
{
    public async Task<PagedResult<Entities.Byte>> GetForYouAsync(
        Guid userId, PaginationParams pagination, CancellationToken ct = default)
    {
        var user = await db.Users.FindAsync([userId], CancellationToken.None);
        if (user is null) return Empty(pagination);

        var followingIds = await db.UserFollowings
            .Where(f => f.UserId == userId)
            .Select(f => f.FollowingId)
            .ToListAsync(CancellationToken.None);

        var query = db.Bytes.AsNoTracking().AsQueryable();

        if (user.InterestEmbedding is not null)
        {
            var userVec = user.InterestEmbedding;
            query = query
                .Where(b => b.Embedding != null)
                .OrderBy(b => b.Embedding!.CosineDistance(userVec));
        }
        else
        {
            query = query.OrderByDescending(b => b.CreatedAt);
        }

        var total = await query.CountAsync(CancellationToken.None);
        var items = await query.Skip(pagination.Skip).Take(pagination.PageSize).ToListAsync(CancellationToken.None);

        if (followingIds.Count > 0)
        {
            items = items
                .OrderByDescending(b => followingIds.Contains(b.AuthorId) ? 1 : 0)
                .ThenBy(_ => 0)
                .ToList();
        }

        return new PagedResult<Entities.Byte>(items, total, pagination.Page, pagination.PageSize);
    }

    public async Task<PagedResult<Entities.Byte>> GetFollowingAsync(
        Guid userId, PaginationParams pagination, CancellationToken ct = default)
    {
        var followingIds = await db.UserFollowings
            .Where(f => f.UserId == userId)
            .Select(f => f.FollowingId)
            .ToListAsync(CancellationToken.None);

        if (followingIds.Count == 0) return Empty(pagination);

        var total = await db.Bytes.CountAsync(b => followingIds.Contains(b.AuthorId), ct);
        var items = await db.Bytes
            .AsNoTracking()
            .Where(b => followingIds.Contains(b.AuthorId))
            .OrderByDescending(b => b.CreatedAt)
            .Skip(pagination.Skip)
            .Take(pagination.PageSize)
            .ToListAsync(CancellationToken.None);

        return new PagedResult<Entities.Byte>(items, total, pagination.Page, pagination.PageSize);
    }

    public async Task<PagedResult<Entities.Byte>> GetTrendingAsync(
        PaginationParams pagination, CancellationToken ct = default)
    {
        var total = await db.Bytes.CountAsync(CancellationToken.None);
        var items = await db.Bytes
            .AsNoTracking()
            .OrderByDescending(b => b.CreatedAt)
            .Skip(pagination.Skip)
            .Take(pagination.PageSize)
            .ToListAsync(CancellationToken.None);

        return new PagedResult<Entities.Byte>(items, total, pagination.Page, pagination.PageSize);
    }

    public async Task<PagedResult<ByteResult>> GetFeedAsync(Guid? userId, PaginationParams pagination, List<string>? tags, string filter, CancellationToken ct)
    {
        List<ByteResult> items;
        int total;

        switch (filter)
        {
            case "following":
                (items, total) = await GetFollowingFeed(userId, pagination, tags, ct);
                break;

            case "trending":
                (items, total) = await GetTrendingFeed(pagination, tags, ct);
                break;

            default: // for_you
                (items, total) = await GetForYouFeed(pagination, tags, ct);
                break;
        }

        return new PagedResult<ByteResult>(items, total, pagination.Page, pagination.PageSize);
    }

    private IQueryable<Byte> ApplyTagFilter(IQueryable<Byte> query, List<string>? tags)
    {
        if (tags is null || tags.Count == 0) return query;

        var tagNamesLower = tags.Select(t => t.ToLower()).ToList();
        var matchingByteIds = db.ByteTechStacks
            .Where(bts => tagNamesLower.Contains(bts.TechStack.Name.ToLower()))
            .Select(bts => bts.ByteId);

        return query.Where(b => matchingByteIds.Contains(b.Id));
    }

    private async Task<(List<ByteResult>, int)> GetForYouFeed(PaginationParams pagination, List<string>? tags, CancellationToken ct)
    {
        var query = ApplyTagFilter(
            db.Bytes.AsNoTracking().Where(b => b.IsActive).OrderByDescending(b => b.CreatedAt),
            tags);

        var total = await query.CountAsync(CancellationToken.None);
        var items = await query
            .Skip(pagination.Skip)
            .Take(pagination.PageSize)
            .Select(b => new ByteResult(
                b.Id, b.AuthorId, b.Title, b.Body, b.CodeSnippet, b.Language, b.Type,
                b.CreatedAt, b.UpdatedAt, b.Comments.Count(), b.UserLikes.Count()))
            .ToListAsync(CancellationToken.None);

        return (items, total);
    }

    private async Task<(List<ByteResult>, int)> GetFollowingFeed(Guid? userId, PaginationParams pagination, List<string>? tags, CancellationToken ct)
    {
        if (!userId.HasValue)
            return ([], 0);

        var followedIds = await db.UserFollowings
            .Where(f => f.UserId == userId.Value)
            .Select(f => f.FollowingId)
            .ToListAsync(CancellationToken.None);

        if (followedIds.Count == 0)
            return ([], 0);

        var query = ApplyTagFilter(
            db.Bytes.AsNoTracking()
                .Where(b => b.IsActive && followedIds.Contains(b.AuthorId))
                .OrderByDescending(b => b.CreatedAt),
            tags);

        var total = await query.CountAsync(CancellationToken.None);
        var items = await query
            .Skip(pagination.Skip)
            .Take(pagination.PageSize)
            .Select(b => new ByteResult(
                b.Id, b.AuthorId, b.Title, b.Body, b.CodeSnippet, b.Language, b.Type,
                b.CreatedAt, b.UpdatedAt, b.Comments.Count(), b.UserLikes.Count()))
            .ToListAsync(CancellationToken.None);

        return (items, total);
    }

    private async Task<(List<ByteResult>, int)> GetTrendingFeed(PaginationParams pagination, List<string>? tags, CancellationToken ct)
    {
        var since = DateTime.UtcNow.AddHours(-24);

        var trendingIds = await db.TrendingEvents
            .Where(t => t.ContentType == "byte" && t.ClickedAt >= since)
            .GroupBy(t => t.ContentId)
            .OrderByDescending(g => g.Count())
            .Select(g => g.Key)
            .Take(200)
            .ToListAsync(CancellationToken.None);

        IQueryable<Byte> query;

        if (trendingIds.Count == 0)
        {
            query = ApplyTagFilter(db.Bytes.AsNoTracking().Where(b => b.IsActive).OrderByDescending(b => b.CreatedAt), tags);
        }
        else
        {
            query = ApplyTagFilter(
                db.Bytes.AsNoTracking().Where(b => b.IsActive && trendingIds.Contains(b.Id)),
                tags);
        }

        var candidates = await query
            .Select(b => new ByteResult(
                b.Id, b.AuthorId, b.Title, b.Body, b.CodeSnippet, b.Language, b.Type,
                b.CreatedAt, b.UpdatedAt, b.Comments.Count(), b.UserLikes.Count()))
            .ToListAsync(CancellationToken.None);

        var sorted = trendingIds.Count > 0
            ? candidates.OrderBy(b => trendingIds.IndexOf(b.Id)).ToList()
            : candidates;

        var total = sorted.Count;
        var items = sorted.Skip(pagination.Skip).Take(pagination.PageSize).ToList();
        return (items, total);
    }

    private static PagedResult<Entities.Byte> Empty(PaginationParams p) =>
        new([], 0, p.Page, p.PageSize);
}
