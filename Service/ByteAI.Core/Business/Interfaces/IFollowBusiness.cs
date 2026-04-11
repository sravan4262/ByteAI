namespace ByteAI.Core.Business.Interfaces;

public interface IFollowBusiness
{
    Task<bool> FollowUserAsync(string clerkId, Guid targetUserId, CancellationToken ct);
    Task<bool> UnfollowUserAsync(string clerkId, Guid targetUserId, CancellationToken ct);
}
