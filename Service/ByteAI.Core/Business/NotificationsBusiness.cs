using ByteAI.Core.Business.Interfaces;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Services;
using ByteAI.Core.Services.Notifications;

namespace ByteAI.Core.Business;

public sealed class NotificationsBusiness(INotificationService notificationService, ICurrentUserService currentUserService) : INotificationsBusiness
{
    public async Task<PagedResult<NotificationWithActor>> GetNotificationsAsync(string supabaseUserId, int page, int pageSize, bool unreadOnly, CancellationToken ct)
    {
        var userId = await ResolveUserIdAsync(supabaseUserId, ct);
        return await notificationService.GetNotificationsAsync(userId, new PaginationParams(page, Math.Min(pageSize, 50)), unreadOnly, ct);
    }

    public async Task<bool> MarkReadAsync(string supabaseUserId, Guid notificationId, CancellationToken ct)
    {
        var userId = await ResolveUserIdAsync(supabaseUserId, ct);
        return await notificationService.MarkReadAsync(notificationId, userId, ct);
    }

    public async Task MarkAllReadAsync(string supabaseUserId, CancellationToken ct)
    {
        var userId = await ResolveUserIdAsync(supabaseUserId, ct);
        await notificationService.MarkAllReadAsync(userId, ct);
    }

    public async Task<int> GetUnreadCountAsync(string supabaseUserId, CancellationToken ct)
    {
        var userId = await ResolveUserIdAsync(supabaseUserId, ct);
        return await notificationService.GetUnreadCountAsync(userId, ct);
    }

    public async Task<bool> DeleteAsync(string supabaseUserId, Guid notificationId, CancellationToken ct)
    {
        var userId = await ResolveUserIdAsync(supabaseUserId, ct);
        return await notificationService.DeleteAsync(notificationId, userId, ct);
    }

    private async Task<Guid> ResolveUserIdAsync(string supabaseUserId, CancellationToken ct)
    {
        var userId = await currentUserService.GetCurrentUserIdAsync(supabaseUserId, ct);
        if (userId is null) throw new UnauthorizedAccessException("User not found.");
        return userId.Value;
    }
}
