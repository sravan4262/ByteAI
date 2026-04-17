namespace ByteAI.Core.Business.Interfaces;

public interface IFollowBusiness
{
    Task<bool> FollowUserAsync(string supabaseUserId, Guid targetUserId, CancellationToken ct);
    Task<bool> UnfollowUserAsync(string supabaseUserId, Guid targetUserId, CancellationToken ct);
}
