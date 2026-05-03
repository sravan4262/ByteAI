using ByteAI.Core.Commands.Reactions;
using ByteAI.Core.Infrastructure;

namespace ByteAI.Core.Services.Reactions;

public interface IReactionService
{
    Task<ReactionsCount> GetReactionsAsync(Guid byteId, CancellationToken ct);
    Task<ToggleLikeResult> ToggleReactionAsync(Guid byteId, Guid userId, string reactionType, CancellationToken ct);
    Task<bool> DeleteReactionAsync(Guid byteId, Guid userId, CancellationToken ct);
    Task<List<LikerInfo>> GetLikersAsync(Guid byteId, CancellationToken ct, Guid? requesterId = null);
}
