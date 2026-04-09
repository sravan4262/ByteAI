using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure.Persistence;
using System.Text.Json;

namespace ByteAI.Core.Services.Notifications;

public sealed class NotificationService(AppDbContext db) : INotificationService
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
}
