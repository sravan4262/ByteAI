using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ByteAI.Core.Commands.Users;

public sealed class GetFollowersQueryHandler(AppDbContext db)
    : IRequestHandler<GetFollowersQuery, PagedResult<User>>
{
    public async Task<PagedResult<User>> Handle(GetFollowersQuery request, CancellationToken cancellationToken)
    {
        // users.followers: user_id = request.UserId → people who follow this user
        var query = db.UserFollowers
            .Where(f => f.UserId == request.UserId)
            .Include(f => f.Follower)
            .OrderByDescending(f => f.CreatedAt);

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip(request.Pagination.Skip)
            .Take(request.Pagination.PageSize)
            .Select(f => f.Follower)
            .ToListAsync(cancellationToken);

        return new PagedResult<User>(items, total, request.Pagination.Page, request.Pagination.PageSize);
    }
}

public sealed class GetFollowingQueryHandler(AppDbContext db)
    : IRequestHandler<GetFollowingQuery, PagedResult<User>>
{
    public async Task<PagedResult<User>> Handle(GetFollowingQuery request, CancellationToken cancellationToken)
    {
        // users.following: user_id = request.UserId → people this user follows
        var query = db.UserFollowings
            .Where(f => f.UserId == request.UserId)
            .Include(f => f.Following)
            .OrderByDescending(f => f.CreatedAt);

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .Skip(request.Pagination.Skip)
            .Take(request.Pagination.PageSize)
            .Select(f => f.Following)
            .ToListAsync(cancellationToken);

        return new PagedResult<User>(items, total, request.Pagination.Page, request.Pagination.PageSize);
    }
}
