using ByteAI.Core.Business.Interfaces;
using ByteAI.Core.Infrastructure.Services;
using ByteAI.Core.Services.Follow;

namespace ByteAI.Core.Business;

public sealed class FollowBusiness(IFollowService followService, ICurrentUserService currentUserService) : IFollowBusiness
{
    public async Task<bool> FollowUserAsync(string supabaseUserId, Guid targetUserId, CancellationToken ct)
    {
        var followerId = await ResolveUserIdAsync(supabaseUserId, ct);
        return await followService.FollowUserAsync(followerId, targetUserId, ct);
    }

    public async Task<bool> UnfollowUserAsync(string supabaseUserId, Guid targetUserId, CancellationToken ct)
    {
        var followerId = await ResolveUserIdAsync(supabaseUserId, ct);
        return await followService.UnfollowUserAsync(followerId, targetUserId, ct);
    }

    private async Task<Guid> ResolveUserIdAsync(string supabaseUserId, CancellationToken ct)
    {
        var userId = await currentUserService.GetCurrentUserIdAsync(supabaseUserId, ct);
        if (userId is null) throw new UnauthorizedAccessException("User not found.");
        return userId.Value;
    }
}
