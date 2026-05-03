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

    public async Task<PagedResult<NotificationWithActor>> GetNotificationsAsync(Guid userId, PaginationParams pagination, bool unreadOnly, CancellationToken ct)
    {
        var query = db.Notifications
            .AsNoTracking()
            .Where(n => n.UserId == userId);

        if (unreadOnly)
            query = query.Where(n => !n.Read);

        var total = await query.CountAsync(CancellationToken.None);
        var items = await query
            .OrderByDescending(n => n.CreatedAt)
            .Skip(pagination.Skip)
            .Take(pagination.PageSize)
            .ToListAsync(CancellationToken.None);

        // Pull actor IDs out of the payloads, then join Users in one query so each
        // notification renders with the actor's *current* username/displayName/avatarUrl
        // rather than the snapshot frozen at write time.
        var actorIds = items
            .Select(n => TryGetActorId(n.Payload))
            .OfType<Guid>()
            .Distinct()
            .ToList();

        // Filter out actors blocked by, or who blocked, the recipient. The actor lives
        // in JSON payload so we filter post-fetch rather than via ExcludeBlockedFor.
        var blockedActorIds = actorIds.Count == 0
            ? new HashSet<Guid>()
            : (await db.UserBlocks.AsNoTracking()
                .Where(b => (b.BlockerId == userId && actorIds.Contains(b.BlockedId))
                         || (b.BlockedId == userId && actorIds.Contains(b.BlockerId)))
                .Select(b => b.BlockerId == userId ? b.BlockedId : b.BlockerId)
                .ToListAsync(ct))
                .ToHashSet();

        var actorMap = actorIds.Count == 0
            ? new Dictionary<Guid, NotificationActor>()
            : await db.Users
                .AsNoTracking()
                .Where(u => actorIds.Contains(u.Id))
                .Select(u => new { u.Id, Actor = new NotificationActor(u.Username, u.DisplayName, u.AvatarUrl) })
                .ToDictionaryAsync(x => x.Id, x => x.Actor, ct);

        var paired = items
            .Where(n =>
            {
                var id = TryGetActorId(n.Payload);
                return !id.HasValue || !blockedActorIds.Contains(id.Value);
            })
            .Select(n =>
            {
                var id = TryGetActorId(n.Payload);
                NotificationActor? actor = id.HasValue && actorMap.TryGetValue(id.Value, out var a) ? a : null;
                return new NotificationWithActor(n, actor);
            })
            .ToList();

        return new PagedResult<NotificationWithActor>(paired, total, pagination.Page, pagination.PageSize);
    }

    private static Guid? TryGetActorId(JsonDocument? payload)
    {
        if (payload is null) return null;
        if (payload.RootElement.ValueKind != JsonValueKind.Object) return null;
        if (!payload.RootElement.TryGetProperty("actorId", out var a)) return null;
        if (a.ValueKind != JsonValueKind.String) return null;
        return Guid.TryParse(a.GetString(), out var id) ? id : null;
    }

    public async Task<bool> MarkReadAsync(Guid notificationId, Guid userId, CancellationToken ct)
    {
        var notification = await db.Notifications.FindAsync([notificationId], CancellationToken.None);
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

    public async Task<bool> DeleteAsync(Guid notificationId, Guid userId, CancellationToken ct)
    {
        var notification = await db.Notifications.FindAsync([notificationId], CancellationToken.None);
        if (notification is null || notification.UserId != userId) return false;

        db.Notifications.Remove(notification);
        await db.SaveChangesAsync(ct);
        return true;
    }
}
