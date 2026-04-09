using ByteAI.Core.Infrastructure.Persistence;
using MediatR;

namespace ByteAI.Core.Commands.Notifications;

public sealed class MarkNotificationReadCommandHandler(AppDbContext db)
    : IRequestHandler<MarkNotificationReadCommand, bool>
{
    public async Task<bool> Handle(MarkNotificationReadCommand request, CancellationToken cancellationToken)
    {
        var notification = await db.Notifications.FindAsync([request.NotificationId], cancellationToken);
        if (notification is null || notification.UserId != request.UserId) return false;

        notification.Read = true;
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }
}
