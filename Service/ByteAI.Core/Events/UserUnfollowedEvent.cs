using MediatR;

namespace ByteAI.Core.Events;

public sealed record UserUnfollowedEvent(Guid FollowerId, Guid FollowingId) : INotification;
