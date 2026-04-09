using MediatR;

namespace ByteAI.Core.Commands.Notifications;

public sealed record MarkNotificationReadCommand(Guid NotificationId, Guid UserId) : IRequest<bool>;
