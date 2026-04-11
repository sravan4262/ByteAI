using ByteAI.Core.Commands.Bytes;
using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ByteAI.Core.Commands.Feed;

/// <summary>
/// Feed ranking by mode:
///   for_you   — bytes ranked by recency
///   following — bytes authored by users this user follows, ranked by recency
///   trending  — bytes ranked by click count in the trending table (past 24h)
/// </summary>
public sealed class GetFeedQueryHandler(AppDbContext db)
    : IRequestHandler<GetFeedQuery, PagedResult<ByteResult>>
{
    public async Task<PagedResult<ByteResult>> Handle(GetFeedQuery request, CancellationToken cancellationToken)
    {
        List<ByteResult> items;
        int total;

        switch (request.Sort)
        {
            case "following":
                (items, total) = await GetFollowingFeed(request, cancellationToken);
                break;

            case "trending":
                (items, total) = await GetTrendingFeed(request, cancellationToken);
                break;

            default: // for_you
                (items, total) = await GetForYouFeed(request, cancellationToken);
                break;
        }

        return new PagedResult<ByteResult>(items, total, request.Pagination.Page, request.Pagination.PageSize);
    }

    private static IQueryable<Byte> ApplyTagFilter(IQueryable<Byte> query, List<string>? tags, AppDbContext db)
    {
        if (tags is null || tags.Count == 0) return query;

        var tagNamesLower = tags.Select(t => t.ToLower()).ToList();
        var matchingByteIds = db.ByteTechStacks
            .Where(bts => tagNamesLower.Contains(bts.TechStack.Name.ToLower()))
            .Select(bts => bts.ByteId);

        return query.Where(b => matchingByteIds.Contains(b.Id));
    }

    private async Task<(List<ByteResult>, int)> GetForYouFeed(GetFeedQuery request, CancellationToken ct)
    {
        var query = ApplyTagFilter(
            db.Bytes.AsNoTracking().Where(b => b.IsActive).OrderByDescending(b => b.CreatedAt),
            request.Tags, db);

        var total = await query.CountAsync(ct);
        var items = await query
            .Skip(request.Pagination.Skip)
            .Take(request.Pagination.PageSize)
            .Select(b => new ByteResult(
                b.Id, b.AuthorId, b.Title, b.Body, b.CodeSnippet, b.Language, b.Type,
                b.CreatedAt, b.UpdatedAt, b.Comments.Count(), b.UserLikes.Count()))
            .ToListAsync(ct);

        return (items, total);
    }

    private async Task<(List<ByteResult>, int)> GetFollowingFeed(GetFeedQuery request, CancellationToken ct)
    {
        if (!request.UserId.HasValue)
            return ([], 0);

        var followedIds = await db.Follows
            .Where(f => f.FollowerId == request.UserId.Value)
            .Select(f => f.FollowingId)
            .ToListAsync(ct);

        if (followedIds.Count == 0)
            return ([], 0);

        var query = ApplyTagFilter(
            db.Bytes.AsNoTracking()
                .Where(b => b.IsActive && followedIds.Contains(b.AuthorId))
                .OrderByDescending(b => b.CreatedAt),
            request.Tags, db);

        var total = await query.CountAsync(ct);
        var items = await query
            .Skip(request.Pagination.Skip)
            .Take(request.Pagination.PageSize)
            .Select(b => new ByteResult(
                b.Id, b.AuthorId, b.Title, b.Body, b.CodeSnippet, b.Language, b.Type,
                b.CreatedAt, b.UpdatedAt, b.Comments.Count(), b.UserLikes.Count()))
            .ToListAsync(ct);

        return (items, total);
    }

    private async Task<(List<ByteResult>, int)> GetTrendingFeed(GetFeedQuery request, CancellationToken ct)
    {
        var since = DateTime.UtcNow.AddHours(-24);

        var trendingIds = await db.TrendingEvents
            .Where(t => t.ContentType == "byte" && t.ClickedAt >= since)
            .GroupBy(t => t.ContentId)
            .OrderByDescending(g => g.Count())
            .Select(g => g.Key)
            .Take(200)
            .ToListAsync(ct);

        IQueryable<Byte> query;

        if (trendingIds.Count == 0)
        {
            query = ApplyTagFilter(db.Bytes.AsNoTracking().Where(b => b.IsActive).OrderByDescending(b => b.CreatedAt), request.Tags, db);
        }
        else
        {
            query = ApplyTagFilter(
                db.Bytes.AsNoTracking().Where(b => b.IsActive && trendingIds.Contains(b.Id)),
                request.Tags, db);
        }

        // Load with comment counts — trending sort applied in memory to preserve order
        var candidates = await query
            .Select(b => new ByteResult(
                b.Id, b.AuthorId, b.Title, b.Body, b.CodeSnippet, b.Language, b.Type,
                b.CreatedAt, b.UpdatedAt, b.Comments.Count(), b.UserLikes.Count()))
            .ToListAsync(ct);

        var sorted = trendingIds.Count > 0
            ? candidates.OrderBy(b => trendingIds.IndexOf(b.Id)).ToList()
            : candidates;

        var total = sorted.Count;
        var items = sorted.Skip(request.Pagination.Skip).Take(request.Pagination.PageSize).ToList();
        return (items, total);
    }
}
