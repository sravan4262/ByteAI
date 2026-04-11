using ByteAI.Core.Business.Interfaces;
using ByteAI.Core.Commands.Reactions;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Services;
using ByteAI.Core.Services.Reactions;

namespace ByteAI.Core.Business;

public sealed class ReactionsBusiness(IReactionService reactionService, ICurrentUserService currentUserService) : IReactionsBusiness
{
    public async Task<ReactionsCount> GetReactionsAsync(Guid byteId, CancellationToken ct) =>
        await reactionService.GetReactionsAsync(byteId, ct);

    public async Task<ToggleLikeResult> ToggleReactionAsync(string clerkId, Guid byteId, string reactionType, CancellationToken ct)
    {
        var userId = await ResolveUserIdAsync(clerkId, ct);
        return await reactionService.ToggleReactionAsync(byteId, userId, reactionType, ct);
    }

    public async Task<bool> DeleteReactionAsync(string clerkId, Guid byteId, CancellationToken ct)
    {
        var userId = await ResolveUserIdAsync(clerkId, ct);
        return await reactionService.DeleteReactionAsync(byteId, userId, ct);
    }

    public async Task<List<LikerInfo>> GetLikersAsync(Guid byteId, CancellationToken ct) =>
        await reactionService.GetLikersAsync(byteId, ct);

    private async Task<Guid> ResolveUserIdAsync(string clerkId, CancellationToken ct)
    {
        var userId = await currentUserService.GetCurrentUserIdAsync(clerkId, ct);
        if (userId is null) throw new UnauthorizedAccessException("User not found for the given Clerk ID.");
        return userId.Value;
    }
}
