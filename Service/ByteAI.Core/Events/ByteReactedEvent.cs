using MediatR;

namespace ByteAI.Core.Events;

public sealed record ByteReactedEvent(
    Guid ByteId,
    Guid ReactorUserId,
    Guid AuthorUserId,
    string ReactionType
) : INotification;
