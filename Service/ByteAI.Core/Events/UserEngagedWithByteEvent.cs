using MediatR;

namespace ByteAI.Core.Events;

/// <summary>
/// Published when a user likes or bookmarks a byte.
/// Triggers an EMA update of User.InterestEmbedding toward the byte's embedding.
/// </summary>
public sealed record UserEngagedWithByteEvent(Guid UserId, Guid ByteId) : INotification;
