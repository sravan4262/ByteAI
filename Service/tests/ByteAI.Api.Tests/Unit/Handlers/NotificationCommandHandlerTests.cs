using ByteAI.Api.Tests.Helpers;
using ByteAI.Core.Commands.Notifications;
using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;

namespace ByteAI.Api.Tests.Unit.Handlers;

public sealed class NotificationCommandHandlerTests : IDisposable
{
    private readonly ByteAI.Core.Infrastructure.Persistence.AppDbContext _db;

    private readonly Guid _userId  = Guid.NewGuid();
    private readonly Guid _userId2 = Guid.NewGuid();
    private Guid _notifId;

    public NotificationCommandHandlerTests()
    {
        _db = DbContextFactory.Create();

        _db.Users.AddRange(
            new User { Id = _userId,  ClerkId = "n1", Username = "nu1", DisplayName = "N1" },
            new User { Id = _userId2, ClerkId = "n2", Username = "nu2", DisplayName = "N2" });

        var notif = new Notification { UserId = _userId, Type = "follow", Read = false };
        _db.Notifications.Add(notif);
        _db.SaveChanges();

        _notifId = notif.Id;
    }

    public void Dispose() => _db.Dispose();

    // ── GetNotificationsQueryHandler ──────────────────────────────────────────

    [Fact]
    public async Task GetNotifications_All_ReturnsBothReadAndUnread()
    {
        // Add a read notification
        _db.Notifications.Add(new Notification { UserId = _userId, Type = "like", Read = true });
        await _db.SaveChangesAsync();

        var handler = new GetNotificationsQueryHandler(_db);
        var result  = await handler.Handle(new GetNotificationsQuery(_userId, new PaginationParams(1, 20)), default);

        Assert.Equal(2, result.Total);
    }

    [Fact]
    public async Task GetNotifications_UnreadOnly_ReturnsOnlyUnread()
    {
        _db.Notifications.Add(new Notification { UserId = _userId, Type = "like", Read = true });
        await _db.SaveChangesAsync();

        var handler = new GetNotificationsQueryHandler(_db);
        var result  = await handler.Handle(
            new GetNotificationsQuery(_userId, new PaginationParams(1, 20), UnreadOnly: true), default);

        Assert.Equal(1, result.Total);
        Assert.All(result.Items, n => Assert.False(n.Read));
    }

    [Fact]
    public async Task GetNotifications_FiltersByUserId()
    {
        _db.Notifications.Add(new Notification { UserId = _userId2, Type = "follow" });
        await _db.SaveChangesAsync();

        var handler = new GetNotificationsQueryHandler(_db);
        var result  = await handler.Handle(new GetNotificationsQuery(_userId, new PaginationParams(1, 20)), default);

        Assert.Equal(1, result.Total);
        Assert.All(result.Items, n => Assert.Equal(_userId, n.UserId));
    }

    [Fact]
    public async Task GetNotifications_PaginationSkipsAndLimits()
    {
        // Add 4 more, total 5 for _userId
        for (var i = 0; i < 4; i++)
            _db.Notifications.Add(new Notification { UserId = _userId, Type = "like" });
        await _db.SaveChangesAsync();

        var handler = new GetNotificationsQueryHandler(_db);
        var result  = await handler.Handle(
            new GetNotificationsQuery(_userId, new PaginationParams(2, 2)), default);

        Assert.Equal(5, result.Total);
        Assert.Equal(2, result.Items.Count);
    }

    // ── MarkNotificationReadCommandHandler ────────────────────────────────────

    [Fact]
    public async Task MarkRead_OwnNotification_ReturnsTrue()
    {
        var handler = new MarkNotificationReadCommandHandler(_db);
        var result  = await handler.Handle(new MarkNotificationReadCommand(_notifId, _userId), default);

        Assert.True(result);
        Assert.True((await _db.Notifications.FindAsync([_notifId]))!.Read);
    }

    [Fact]
    public async Task MarkRead_NotFound_ReturnsFalse()
    {
        var handler = new MarkNotificationReadCommandHandler(_db);
        var result  = await handler.Handle(new MarkNotificationReadCommand(Guid.NewGuid(), _userId), default);

        Assert.False(result);
    }

    [Fact]
    public async Task MarkRead_WrongUser_ReturnsFalse()
    {
        var handler = new MarkNotificationReadCommandHandler(_db);
        var result  = await handler.Handle(new MarkNotificationReadCommand(_notifId, _userId2), default);

        Assert.False(result);
        // Notification remains unread
        Assert.False((await _db.Notifications.FindAsync([_notifId]))!.Read);
    }
}
