namespace ByteAI.Core.Services.Follow;

public interface IFollowService
{
    Task<bool> FollowUserAsync(Guid followerId, Guid targetUserId, CancellationToken ct);
    Task<bool> UnfollowUserAsync(Guid followerId, Guid targetUserId, CancellationToken ct);
}
