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
///   trending  — bytes ranked by time-decayed view count from user_views (past 48h)
///</summary>
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

        var total = await query.CountAsync(CancellationToken.None);
        var items = await query
            .Skip(request.Pagination.Skip)
            .Take(request.Pagination.PageSize)
            .Join(db.Users, b => b.AuthorId, u => u.Id, (b, u) => new ByteResult(
                b.Id, b.AuthorId, b.Title, b.Body, b.CodeSnippet, b.Language, b.Type,
                b.CreatedAt, b.UpdatedAt, b.Comments.Count(), b.UserLikes.Count(), false, false,
                u.Username, u.DisplayName ?? u.Username, u.AvatarUrl, u.RoleTitle, u.Company))
            .ToListAsync(CancellationToken.None);

        return (items, total);
    }

    private async Task<(List<ByteResult>, int)> GetFollowingFeed(GetFeedQuery request, CancellationToken ct)
    {
        if (!request.UserId.HasValue)
            return ([], 0);

        var followedIds = await db.UserFollowings
            .Where(f => f.UserId == request.UserId.Value)
            .Select(f => f.FollowingId)
            .ToListAsync(CancellationToken.None);

        if (followedIds.Count == 0)
            return ([], 0);

        var query = ApplyTagFilter(
            db.Bytes.AsNoTracking()
                .Where(b => b.IsActive && followedIds.Contains(b.AuthorId))
                .OrderByDescending(b => b.CreatedAt),
            request.Tags, db);

        var total = await query.CountAsync(CancellationToken.None);
        var items = await query
            .Skip(request.Pagination.Skip)
            .Take(request.Pagination.PageSize)
            .Join(db.Users, b => b.AuthorId, u => u.Id, (b, u) => new ByteResult(
                b.Id, b.AuthorId, b.Title, b.Body, b.CodeSnippet, b.Language, b.Type,
                b.CreatedAt, b.UpdatedAt, b.Comments.Count(), b.UserLikes.Count(), false, false,
                u.Username, u.DisplayName ?? u.Username, u.AvatarUrl, u.RoleTitle, u.Company))
            .ToListAsync(CancellationToken.None);

        return (items, total);
    }

    private async Task<(List<ByteResult>, int)> GetTrendingFeed(GetFeedQuery request, CancellationToken ct)
    {
        var since48h = DateTime.UtcNow.AddHours(-48);
        var since24h = DateTime.UtcNow.AddHours(-24);

        var trendingIds = await db.UserViews
            .AsNoTracking()
            .Where(v => v.ViewedAt >= since48h && v.UserId != null)
            .GroupBy(v => v.ByteId)
            .Select(g => new
            {
                ByteId = g.Key,
                Score  = g.Count(v => v.ViewedAt >= since24h) * 2 + g.Count(v => v.ViewedAt < since24h),
            })
            .OrderByDescending(x => x.Score)
            .Take(200)
            .Select(x => x.ByteId)
            .ToListAsync(CancellationToken.None);

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

        // Load with author join — trending sort applied in memory to preserve order
        var candidates = await query
            .Join(db.Users, b => b.AuthorId, u => u.Id, (b, u) => new ByteResult(
                b.Id, b.AuthorId, b.Title, b.Body, b.CodeSnippet, b.Language, b.Type,
                b.CreatedAt, b.UpdatedAt, b.Comments.Count(), b.UserLikes.Count(), false, false,
                u.Username, u.DisplayName ?? u.Username, u.AvatarUrl, u.RoleTitle, u.Company))
            .ToListAsync(CancellationToken.None);

        var sorted = trendingIds.Count > 0
            ? candidates.OrderBy(b => trendingIds.IndexOf(b.Id)).ToList()
            : candidates;

        var total = sorted.Count;
        var items = sorted.Skip(request.Pagination.Skip).Take(request.Pagination.PageSize).ToList();
        return (items, total);
    }
}
