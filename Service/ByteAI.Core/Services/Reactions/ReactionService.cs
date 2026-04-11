using ByteAI.Core.Commands.Reactions;
using ByteAI.Core.Infrastructure;
using MediatR;

namespace ByteAI.Core.Services.Reactions;

public sealed class ReactionService(IMediator mediator) : IReactionService
{
    public Task<ReactionsCount> GetReactionsAsync(Guid byteId, CancellationToken ct)
        => mediator.Send(new GetByteReactionsQuery(byteId), ct);

    public Task<ToggleLikeResult> ToggleReactionAsync(Guid byteId, Guid userId, string reactionType, CancellationToken ct)
        => mediator.Send(new CreateReactionCommand(byteId, userId, reactionType), ct);

    public Task<bool> DeleteReactionAsync(Guid byteId, Guid userId, CancellationToken ct)
        => mediator.Send(new DeleteReactionCommand(byteId, userId), ct);

    public Task<List<LikerInfo>> GetLikersAsync(Guid byteId, CancellationToken ct)
        => mediator.Send(new GetByteLikersQuery(byteId), ct);
}
