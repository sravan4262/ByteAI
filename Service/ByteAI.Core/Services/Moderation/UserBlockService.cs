using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace ByteAI.Core.Services.Moderation;

public sealed class UserBlockService(AppDbContext db) : IUserBlockService
{
    public Task<bool> IsBlockedAsync(Guid userA, Guid userB, CancellationToken ct = default) =>
        db.UserBlocks.AsNoTracking().AnyAsync(
            b => (b.BlockerId == userA && b.BlockedId == userB)
              || (b.BlockerId == userB && b.BlockedId == userA),
            ct);

    public Task<bool> HasBlockedAsync(Guid blockerId, Guid blockedId, CancellationToken ct = default) =>
        db.UserBlocks.AsNoTracking().AnyAsync(
            b => b.BlockerId == blockerId && b.BlockedId == blockedId, ct);

    public async Task BlockAsync(Guid blockerId, Guid blockedId, CancellationToken ct = default)
    {
        if (blockerId == blockedId)
            throw new ArgumentException("Cannot block self", nameof(blockedId));

        var exists = await db.UserBlocks
            .AnyAsync(b => b.BlockerId == blockerId && b.BlockedId == blockedId, ct);

        if (!exists)
        {
            db.UserBlocks.Add(new UserBlock
            {
                BlockerId = blockerId,
                BlockedId = blockedId,
                CreatedAt = DateTime.UtcNow,
            });
        }

        // D2 — delete follow relationships in both directions.
        await db.UserFollowers
            .Where(f => (f.UserId == blockerId && f.FollowerId == blockedId)
                     || (f.UserId == blockedId && f.FollowerId == blockerId))
            .ExecuteDeleteAsync(ct);

        await db.UserFollowings
            .Where(f => (f.UserId == blockerId && f.FollowingId == blockedId)
                     || (f.UserId == blockedId && f.FollowingId == blockerId))
            .ExecuteDeleteAsync(ct);

        await db.SaveChangesAsync(ct);
        // D3: chats are soft-hidden via the Phase 2 list filter; no chat-table mutation here.
    }

    public async Task UnblockAsync(Guid blockerId, Guid blockedId, CancellationToken ct = default)
    {
        await db.UserBlocks
            .Where(b => b.BlockerId == blockerId && b.BlockedId == blockedId)
            .ExecuteDeleteAsync(ct);
    }

    public async Task<IReadOnlyList<BlockedUserSummary>> GetBlockedUsersAsync(
        Guid blockerId, int page, int pageSize, CancellationToken ct = default)
    {
        if (page < 1) page = 1;
        if (pageSize is < 1 or > 100) pageSize = 20;

        return await db.UserBlocks.AsNoTracking()
            .Where(b => b.BlockerId == blockerId)
            .OrderByDescending(b => b.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Join(db.Users.AsNoTracking(),
                b => b.BlockedId,
                u => u.Id,
                (b, u) => new BlockedUserSummary(
                    u.Id, u.Username, u.DisplayName, u.AvatarUrl, b.CreatedAt))
            .ToListAsync(ct);
    }
}
