using ByteAI.Api.Tests.Helpers;
using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Services.Notifications;

namespace ByteAI.Api.Tests.Unit.Services;

public sealed class NotificationServiceTests : IDisposable
{
    private readonly ByteAI.Core.Infrastructure.Persistence.AppDbContext _db;
    private readonly NotificationService _sut;
    private readonly Guid _userId = Guid.NewGuid();

    public NotificationServiceTests()
    {
        _db = DbContextFactory.Create();
        _sut = new NotificationService(_db);

        _db.Users.Add(new User { Id = _userId, ClerkId = "n1", Username = "notifuser", DisplayName = "Notif User" });
        _db.SaveChanges();
    }

    public void Dispose() => _db.Dispose();

    private async Task<Notification> SeedNotification(bool read = false)
    {
        await _sut.CreateAsync(_userId, "like", new { foo = "bar" }, default);
        var n = _db.Notifications.First(x => x.UserId == _userId);
        if (read) { n.Read = true; await _db.SaveChangesAsync(); }
        return n;
    }

    // ── CreateAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task Create_PersistsNotificationWithCorrectType()
    {
        await _sut.CreateAsync(_userId, "follow", new { actor = "alice" }, default);

        var n = _db.Notifications.Single(x => x.UserId == _userId);
        Assert.Equal("follow", n.Type);
        Assert.False(n.Read);
    }

    // ── GetNotificationsAsync ─────────────────────────────────────────────────

    [Fact]
    public async Task GetNotifications_AllUnread_ReturnsBoth()
    {
        await _sut.CreateAsync(_userId, "like",   new { }, default);
        await _sut.CreateAsync(_userId, "follow", new { }, default);

        var result = await _sut.GetNotificationsAsync(_userId, new PaginationParams(1, 20), false, default);

        Assert.Equal(2, result.Total);
    }

    [Fact]
    public async Task GetNotifications_UnreadOnly_FiltersReadOnes()
    {
        await SeedNotification(read: true);
        await _sut.CreateAsync(_userId, "follow", new { }, default);

        var result = await _sut.GetNotificationsAsync(_userId, new PaginationParams(1, 20), true, default);

        Assert.Equal(1, result.Total);
    }

    // ── MarkReadAsync ─────────────────────────────────────────────────────────

    [Fact]
    public async Task MarkRead_OwnNotification_SetsReadTrueAndReturnsTrue()
    {
        var n = await SeedNotification();

        var result = await _sut.MarkReadAsync(n.Id, _userId, default);

        Assert.True(result);
        Assert.True((await _db.Notifications.FindAsync([n.Id]))!.Read);
    }

    [Fact]
    public async Task MarkRead_NotFound_ReturnsFalse()
    {
        var result = await _sut.MarkReadAsync(Guid.NewGuid(), _userId, default);
        Assert.False(result);
    }

    [Fact]
    public async Task MarkRead_WrongUser_ReturnsFalse()
    {
        var n = await SeedNotification();

        var result = await _sut.MarkReadAsync(n.Id, Guid.NewGuid(), default);

        Assert.False(result);
    }

    // ── MarkAllReadAsync ──────────────────────────────────────────────────────

    // ExecuteUpdateAsync (bulk update) is not supported by the InMemory provider.
    // The method is tested indirectly via integration tests; skipped here.
    [Fact(Skip = "ExecuteUpdateAsync not supported by EF Core InMemory provider")]
    public async Task MarkAllRead_SetsAllUnreadToRead()
    {
        await _sut.CreateAsync(_userId, "a", new { }, default);
        await _sut.CreateAsync(_userId, "b", new { }, default);

        await _sut.MarkAllReadAsync(_userId, default);

        Assert.All(_db.Notifications.Where(n => n.UserId == _userId), n => Assert.True(n.Read));
    }

    // ── GetUnreadCountAsync ───────────────────────────────────────────────────

    [Fact]
    public async Task GetUnreadCount_ReturnsCorrectCount()
    {
        await SeedNotification(read: true);
        await _sut.CreateAsync(_userId, "b", new { }, default);
        await _sut.CreateAsync(_userId, "c", new { }, default);

        var count = await _sut.GetUnreadCountAsync(_userId, default);

        Assert.Equal(2, count);
    }

    // ── DeleteAsync ───────────────────────────────────────────────────────────

    [Fact]
    public async Task Delete_OwnNotification_RemovesAndReturnsTrue()
    {
        var n = await SeedNotification();

        var result = await _sut.DeleteAsync(n.Id, _userId, default);

        Assert.True(result);
        Assert.Null(await _db.Notifications.FindAsync([n.Id]));
    }

    [Fact]
    public async Task Delete_WrongUser_ReturnsFalse()
    {
        var n = await SeedNotification();

        var result = await _sut.DeleteAsync(n.Id, Guid.NewGuid(), default);

        Assert.False(result);
        Assert.NotNull(await _db.Notifications.FindAsync([n.Id]));
    }

    [Fact]
    public async Task Delete_NotFound_ReturnsFalse()
    {
        var result = await _sut.DeleteAsync(Guid.NewGuid(), _userId, default);
        Assert.False(result);
    }
}
