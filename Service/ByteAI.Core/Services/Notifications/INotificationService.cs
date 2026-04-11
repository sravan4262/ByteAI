using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;

namespace ByteAI.Core.Services.Notifications;

public interface INotificationService
{
    Task CreateAsync(Guid userId, string type, object payload, CancellationToken ct = default);
    Task<PagedResult<Notification>> GetNotificationsAsync(Guid userId, PaginationParams pagination, bool unreadOnly, CancellationToken ct);
    Task<bool> MarkReadAsync(Guid notificationId, Guid userId, CancellationToken ct);
    Task MarkAllReadAsync(Guid userId, CancellationToken ct);
    Task<int> GetUnreadCountAsync(Guid userId, CancellationToken ct);
}
