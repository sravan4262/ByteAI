namespace ByteAI.Core.Services.Moderation;

public interface IUserBlockService
{
    /// <summary>True iff there is a block in either direction between userA and userB.</summary>
    Task<bool> IsBlockedAsync(Guid userA, Guid userB, CancellationToken ct = default);

    /// <summary>True iff blockerId has explicitly blocked blockedId (one direction).</summary>
    Task<bool> HasBlockedAsync(Guid blockerId, Guid blockedId, CancellationToken ct = default);

    /// <summary>
    /// Idempotently inserts a block, then deletes any UserFollowers / UserFollowings
    /// rows in either direction so the social graph stops leaking content.
    /// </summary>
    Task BlockAsync(Guid blockerId, Guid blockedId, CancellationToken ct = default);

    /// <summary>Idempotently removes the (blockerId, blockedId) row. Follows are NOT auto-restored.</summary>
    Task UnblockAsync(Guid blockerId, Guid blockedId, CancellationToken ct = default);

    Task<IReadOnlyList<BlockedUserSummary>> GetBlockedUsersAsync(
        Guid blockerId, int page, int pageSize, CancellationToken ct = default);
}

public sealed record BlockedUserSummary(
    Guid Id,
    string Username,
    string DisplayName,
    string? AvatarUrl,
    DateTime BlockedAt);
