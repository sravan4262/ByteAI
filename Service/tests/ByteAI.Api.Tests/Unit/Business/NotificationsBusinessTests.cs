using ByteAI.Core.Business;
using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Services;
using ByteAI.Core.Services.Notifications;

namespace ByteAI.Api.Tests.Unit.Business;

public sealed class NotificationsBusinessTests
{
    private readonly Mock<INotificationService> _notificationService = new();
    private readonly Mock<ICurrentUserService> _currentUser = new();
    private readonly NotificationsBusiness _sut;

    private readonly Guid _userId = Guid.NewGuid();
    private const string ClerkId = "clerk_notif";

    public NotificationsBusinessTests()
    {
        _sut = new NotificationsBusiness(_notificationService.Object, _currentUser.Object);
    }

    // ── Auth guards ───────────────────────────────────────────────────────────

    [Theory]
    [MemberData(nameof(AuthGuardedMethods))]
    public async Task AnyWrite_UnknownClerkId_ThrowsUnauthorized(Func<NotificationsBusiness, Task> act)
    {
        _currentUser.Setup(s => s.GetCurrentUserIdAsync(ClerkId, default)).ReturnsAsync((Guid?)null);
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => act(_sut));
    }

    public static TheoryData<Func<NotificationsBusiness, Task>> AuthGuardedMethods => new()
    {
        b => b.GetNotificationsAsync(ClerkId, 1, 20, false, default),
        b => b.MarkReadAsync(ClerkId, Guid.NewGuid(), default),
        b => b.MarkAllReadAsync(ClerkId, default),
        b => b.GetUnreadCountAsync(ClerkId, default),
        b => b.DeleteAsync(ClerkId, Guid.NewGuid(), default),
    };

    // ── GetNotificationsAsync ─────────────────────────────────────────────────

    [Fact]
    public async Task GetNotifications_ValidUser_DelegatesToService()
    {
        _currentUser.Setup(s => s.GetCurrentUserIdAsync(ClerkId, default)).ReturnsAsync(_userId);
        var expected = new PagedResult<Notification>([], 0, 1, 20);
        _notificationService
            .Setup(s => s.GetNotificationsAsync(_userId, It.IsAny<PaginationParams>(), false, default))
            .ReturnsAsync(expected);

        var result = await _sut.GetNotificationsAsync(ClerkId, 1, 20, false, default);

        Assert.Equal(expected, result);
    }

    [Fact]
    public async Task GetNotifications_PageSizeCappedAt50()
    {
        _currentUser.Setup(s => s.GetCurrentUserIdAsync(ClerkId, default)).ReturnsAsync(_userId);
        _notificationService
            .Setup(s => s.GetNotificationsAsync(_userId, It.Is<PaginationParams>(p => p.PageSize == 50), false, default))
            .ReturnsAsync(new PagedResult<Notification>([], 0, 1, 50));

        await _sut.GetNotificationsAsync(ClerkId, 1, 999, false, default);

        _notificationService.Verify(s =>
            s.GetNotificationsAsync(_userId, It.Is<PaginationParams>(p => p.PageSize == 50), false, default),
            Times.Once);
    }

    // ── MarkReadAsync ─────────────────────────────────────────────────────────

    [Fact]
    public async Task MarkRead_ValidUser_DelegatesToService()
    {
        var notifId = Guid.NewGuid();
        _currentUser.Setup(s => s.GetCurrentUserIdAsync(ClerkId, default)).ReturnsAsync(_userId);
        _notificationService.Setup(s => s.MarkReadAsync(notifId, _userId, default)).ReturnsAsync(true);

        var result = await _sut.MarkReadAsync(ClerkId, notifId, default);

        Assert.True(result);
    }

    // ── MarkAllReadAsync ──────────────────────────────────────────────────────

    [Fact]
    public async Task MarkAllRead_ValidUser_DelegatesToService()
    {
        _currentUser.Setup(s => s.GetCurrentUserIdAsync(ClerkId, default)).ReturnsAsync(_userId);
        _notificationService.Setup(s => s.MarkAllReadAsync(_userId, default)).Returns(Task.CompletedTask);

        await _sut.MarkAllReadAsync(ClerkId, default);

        _notificationService.Verify(s => s.MarkAllReadAsync(_userId, default), Times.Once);
    }

    // ── GetUnreadCountAsync ───────────────────────────────────────────────────

    [Fact]
    public async Task GetUnreadCount_ValidUser_ReturnsCount()
    {
        _currentUser.Setup(s => s.GetCurrentUserIdAsync(ClerkId, default)).ReturnsAsync(_userId);
        _notificationService.Setup(s => s.GetUnreadCountAsync(_userId, default)).ReturnsAsync(7);

        var result = await _sut.GetUnreadCountAsync(ClerkId, default);

        Assert.Equal(7, result);
    }

    // ── DeleteAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task Delete_ValidUser_DelegatesToService()
    {
        var notifId = Guid.NewGuid();
        _currentUser.Setup(s => s.GetCurrentUserIdAsync(ClerkId, default)).ReturnsAsync(_userId);
        _notificationService.Setup(s => s.DeleteAsync(notifId, _userId, default)).ReturnsAsync(true);

        var result = await _sut.DeleteAsync(ClerkId, notifId, default);

        Assert.True(result);
    }
}
