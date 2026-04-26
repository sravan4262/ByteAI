using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;

namespace ByteAI.Core.Services.Notifications;

/// <summary>Live actor profile data joined onto a notification at read time.</summary>
public sealed record NotificationActor(string Username, string? DisplayName, string? AvatarUrl);

/// <summary>A notification paired with its actor's current profile data (null if no actor / actor deleted).</summary>
public sealed record NotificationWithActor(Notification Notification, NotificationActor? Actor);

public interface INotificationService
{
    Task CreateAsync(Guid userId, string type, object payload, CancellationToken ct = default);
    Task<PagedResult<NotificationWithActor>> GetNotificationsAsync(Guid userId, PaginationParams pagination, bool unreadOnly, CancellationToken ct);
    Task<bool> MarkReadAsync(Guid notificationId, Guid userId, CancellationToken ct);
    Task MarkAllReadAsync(Guid userId, CancellationToken ct);
    Task<int> GetUnreadCountAsync(Guid userId, CancellationToken ct);
    Task<bool> DeleteAsync(Guid notificationId, Guid userId, CancellationToken ct);
}
