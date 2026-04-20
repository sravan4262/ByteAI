using MediatR;

namespace ByteAI.Core.Events;

public sealed record UserViewedByteEvent(Guid UserId, Guid ByteId) : INotification;
