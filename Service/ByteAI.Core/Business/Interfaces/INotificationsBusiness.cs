using ByteAI.Core.Infrastructure;
using ByteAI.Core.Services.Notifications;

namespace ByteAI.Core.Business.Interfaces;

public interface INotificationsBusiness
{
    Task<PagedResult<NotificationWithActor>> GetNotificationsAsync(string supabaseUserId, int page, int pageSize, bool unreadOnly, CancellationToken ct);
    Task<bool> MarkReadAsync(string supabaseUserId, Guid notificationId, CancellationToken ct);
    Task MarkAllReadAsync(string supabaseUserId, CancellationToken ct);
    Task<int> GetUnreadCountAsync(string supabaseUserId, CancellationToken ct);
    Task<bool> DeleteAsync(string supabaseUserId, Guid notificationId, CancellationToken ct);
}
