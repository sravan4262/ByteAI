using ByteAI.Core.Commands.Notifications;
using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Persistence;
using MediatR;
using System.Text.Json;

namespace ByteAI.Core.Services.Notifications;

public sealed class NotificationService(AppDbContext db, IMediator mediator) : INotificationService
{
    public async Task CreateAsync(Guid userId, string type, object payload, CancellationToken ct = default)
    {
        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Type = type,
            Payload = JsonSerializer.SerializeToDocument(payload),
            Read = false,
            CreatedAt = DateTime.UtcNow
        };

        db.Notifications.Add(notification);
        await db.SaveChangesAsync(ct);
    }

    public Task<PagedResult<Notification>> GetNotificationsAsync(Guid userId, PaginationParams pagination, bool unreadOnly, CancellationToken ct)
        => mediator.Send(new GetNotificationsQuery(userId, pagination, unreadOnly), ct);

    public Task<bool> MarkReadAsync(Guid notificationId, Guid userId, CancellationToken ct)
        => mediator.Send(new MarkNotificationReadCommand(notificationId, userId), ct);
}
