using ByteAI.Core.Business.Interfaces;
using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Services;
using ByteAI.Core.Services.Notifications;

namespace ByteAI.Core.Business;

public sealed class NotificationsBusiness(INotificationService notificationService, ICurrentUserService currentUserService) : INotificationsBusiness
{
    public async Task<PagedResult<Notification>> GetNotificationsAsync(string clerkId, int page, int pageSize, bool unreadOnly, CancellationToken ct)
    {
        var userId = await ResolveUserIdAsync(clerkId, ct);
        return await notificationService.GetNotificationsAsync(userId, new PaginationParams(page, Math.Min(pageSize, 50)), unreadOnly, ct);
    }

    public async Task<bool> MarkReadAsync(string clerkId, Guid notificationId, CancellationToken ct)
    {
        var userId = await ResolveUserIdAsync(clerkId, ct);
        return await notificationService.MarkReadAsync(notificationId, userId, ct);
    }

    public async Task MarkAllReadAsync(string clerkId, CancellationToken ct)
    {
        var userId = await ResolveUserIdAsync(clerkId, ct);
        await notificationService.MarkAllReadAsync(userId, ct);
    }

    public async Task<int> GetUnreadCountAsync(string clerkId, CancellationToken ct)
    {
        var userId = await ResolveUserIdAsync(clerkId, ct);
        return await notificationService.GetUnreadCountAsync(userId, ct);
    }

    public async Task<bool> DeleteAsync(string clerkId, Guid notificationId, CancellationToken ct)
    {
        var userId = await ResolveUserIdAsync(clerkId, ct);
        return await notificationService.DeleteAsync(notificationId, userId, ct);
    }

    private async Task<Guid> ResolveUserIdAsync(string clerkId, CancellationToken ct)
    {
        var userId = await currentUserService.GetCurrentUserIdAsync(clerkId, ct);
        if (userId is null) throw new UnauthorizedAccessException("User not found for the given Clerk ID.");
        return userId.Value;
    }
}
