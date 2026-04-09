using MediatR;

namespace ByteAI.Core.Events;

public sealed record UserFollowedEvent(Guid FollowerId, Guid FollowingId) : INotification;
