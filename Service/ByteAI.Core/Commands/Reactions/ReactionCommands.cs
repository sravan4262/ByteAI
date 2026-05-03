using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using MediatR;

namespace ByteAI.Core.Commands.Reactions;

public sealed record ToggleLikeResult(Guid ByteId, Guid UserId, bool IsLiked);
public sealed record LikerInfo(Guid UserId, string Username, string DisplayName, bool IsVerified);

public sealed record CreateReactionCommand(Guid ByteId, Guid UserId, string Type = "like") : IRequest<ToggleLikeResult>;
public sealed record DeleteReactionCommand(Guid ByteId, Guid UserId) : IRequest<bool>;
public sealed record GetByteReactionsQuery(Guid ByteId) : IRequest<ReactionsCount>;
public sealed record GetByteLikersQuery(Guid ByteId, Guid? RequesterId = null) : IRequest<List<LikerInfo>>;
