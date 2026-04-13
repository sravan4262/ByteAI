using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;

namespace ByteAI.Core.Business.Interfaces;

public interface INotificationsBusiness
{
    Task<PagedResult<Notification>> GetNotificationsAsync(string clerkId, int page, int pageSize, bool unreadOnly, CancellationToken ct);
    Task<bool> MarkReadAsync(string clerkId, Guid notificationId, CancellationToken ct);
    Task MarkAllReadAsync(string clerkId, CancellationToken ct);
    Task<int> GetUnreadCountAsync(string clerkId, CancellationToken ct);
    Task<bool> DeleteAsync(string clerkId, Guid notificationId, CancellationToken ct);
}
