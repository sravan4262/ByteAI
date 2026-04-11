using ByteAI.Core.Commands.Reactions;
using ByteAI.Core.Infrastructure;

namespace ByteAI.Core.Business.Interfaces;

public interface IReactionsBusiness
{
    Task<ReactionsCount> GetReactionsAsync(Guid byteId, CancellationToken ct);
    Task<ToggleLikeResult> ToggleReactionAsync(string clerkId, Guid byteId, string reactionType, CancellationToken ct);
    Task<bool> DeleteReactionAsync(string clerkId, Guid byteId, CancellationToken ct);
    Task<List<LikerInfo>> GetLikersAsync(Guid byteId, CancellationToken ct);
}
