using ByteAI.Core.Commands.Bytes;
using ByteAI.Core.Commands.Feed;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Persistence;
using ByteAI.Core.Services.AI;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Pgvector.EntityFrameworkCore;

namespace ByteAI.Core.Services.Feed;

public sealed class FeedService(
    AppDbContext db,
    IEmbeddingService embedding,
    ILogger<FeedService> logger,
    IMediator mediator) : IFeedService
{
    public async Task<PagedResult<Entities.Byte>> GetForYouAsync(
        Guid userId, PaginationParams pagination, CancellationToken ct = default)
    {
        var user = await db.Users.FindAsync([userId], ct);
        if (user is null) return Empty(pagination);

        var followingIds = await db.Follows
            .Where(f => f.FollowerId == userId)
            .Select(f => f.FollowingId)
            .ToListAsync(ct);

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

        var total = await query.CountAsync(ct);
        var items = await query.Skip(pagination.Skip).Take(pagination.PageSize).ToListAsync(ct);

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
        PaginationParams pagination, CancellationToken ct = default)
    {
        var total = await db.Bytes.CountAsync(ct);
        var items = await db.Bytes
            .AsNoTracking()
            .OrderByDescending(b => b.CreatedAt)
            .Skip(pagination.Skip)
            .Take(pagination.PageSize)
            .ToListAsync(ct);

        return new PagedResult<Entities.Byte>(items, total, pagination.Page, pagination.PageSize);
    }

    public Task<PagedResult<ByteResult>> GetFeedAsync(Guid? userId, PaginationParams pagination, List<string>? tags, string filter, CancellationToken ct)
        => mediator.Send(new GetFeedQuery(userId, pagination, tags, filter), ct);

    private static PagedResult<Entities.Byte> Empty(PaginationParams p) =>
        new([], 0, p.Page, p.PageSize);
}
