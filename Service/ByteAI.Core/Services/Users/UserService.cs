using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ByteAI.Core.Services.Users;

public sealed class UserService(AppDbContext db) : IUserService
{
    public Task<User?> GetByIdAsync(Guid userId, CancellationToken ct) =>
        db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);

    public Task<User?> GetByUsernameAsync(string username, CancellationToken ct) =>
        db.Users.FirstOrDefaultAsync(u => u.Username == username, ct);

    public async Task<PagedResult<User>> GetFollowersAsync(Guid userId, PaginationParams pagination, CancellationToken ct)
    {
        var query = db.Follows
            .Where(f => f.FollowingId == userId)
            .Include(f => f.Follower)
            .OrderByDescending(f => f.CreatedAt);

        var total = await query.CountAsync(ct);
        var items = await query
            .Skip(pagination.Skip)
            .Take(pagination.PageSize)
            .Select(f => f.Follower)
            .ToListAsync(ct);

        return new PagedResult<User>(items, total, pagination.Page, pagination.PageSize);
    }

    public async Task<PagedResult<User>> GetFollowingAsync(Guid userId, PaginationParams pagination, CancellationToken ct)
    {
        var query = db.Follows
            .Where(f => f.FollowerId == userId)
            .Include(f => f.Following)
            .OrderByDescending(f => f.CreatedAt);

        var total = await query.CountAsync(ct);
        var items = await query
            .Skip(pagination.Skip)
            .Take(pagination.PageSize)
            .Select(f => f.Following)
            .ToListAsync(ct);

        return new PagedResult<User>(items, total, pagination.Page, pagination.PageSize);
    }

    public async Task<User> UpdateProfileAsync(Guid userId, string? displayName, string? bio, CancellationToken ct)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new InvalidOperationException($"User {userId} not found");

        if (!string.IsNullOrWhiteSpace(displayName)) user.DisplayName = displayName;
        if (!string.IsNullOrWhiteSpace(bio)) user.Bio = bio;
        user.UpdatedAt = DateTime.UtcNow;

        await db.SaveChangesAsync(ct);
        return user;
    }
}
