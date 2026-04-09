using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using MediatR;

namespace ByteAI.Core.Commands.Reactions;

public sealed record CreateReactionCommand(Guid ByteId, Guid UserId, string Type = "like") : IRequest<Reaction>;
public sealed record DeleteReactionCommand(Guid ByteId, Guid UserId) : IRequest<bool>;
public sealed record GetByteReactionsQuery(Guid ByteId) : IRequest<ReactionsCount>;
