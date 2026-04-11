using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
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

    public async Task<PagedResult<Notification>> GetNotificationsAsync(Guid userId, PaginationParams pagination, bool unreadOnly, CancellationToken ct)
    {
        var query = db.Notifications
            .AsNoTracking()
            .Where(n => n.UserId == userId);

        if (unreadOnly)
            query = query.Where(n => !n.Read);

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(n => n.CreatedAt)
            .Skip(pagination.Skip)
            .Take(pagination.PageSize)
            .ToListAsync(ct);

        return new PagedResult<Notification>(items, total, pagination.Page, pagination.PageSize);
    }

    public async Task<bool> MarkReadAsync(Guid notificationId, Guid userId, CancellationToken ct)
    {
        var notification = await db.Notifications.FindAsync([notificationId], ct);
        if (notification is null || notification.UserId != userId) return false;

        notification.Read = true;
        await db.SaveChangesAsync(ct);
        return true;
    }

    public async Task MarkAllReadAsync(Guid userId, CancellationToken ct)
    {
        await db.Notifications
            .Where(n => n.UserId == userId && !n.Read)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.Read, true), ct);
    }

    public async Task<int> GetUnreadCountAsync(Guid userId, CancellationToken ct) =>
        await db.Notifications.CountAsync(n => n.UserId == userId && !n.Read, ct);
}
