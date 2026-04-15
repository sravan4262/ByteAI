using ByteAI.Api.Tests.Helpers;
using ByteAI.Core.Commands.Users;
using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;

namespace ByteAI.Api.Tests.Unit.Handlers;

public sealed class UserCommandHandlerTests : IDisposable
{
    private readonly ByteAI.Core.Infrastructure.Persistence.AppDbContext _db;

    private readonly Guid _userId  = Guid.NewGuid();
    private readonly Guid _userId2 = Guid.NewGuid();

    public UserCommandHandlerTests()
    {
        _db = DbContextFactory.Create();

        _db.Users.AddRange(
            new User { Id = _userId,  ClerkId = "c1", Username = "alice", DisplayName = "Alice" },
            new User { Id = _userId2, ClerkId = "c2", Username = "bob",   DisplayName = "Bob" });
        _db.SaveChanges();
    }

    public void Dispose() => _db.Dispose();

    // ── GetUserByIdQueryHandler ───────────────────────────────────────────────

    [Fact]
    public async Task GetUserById_Existing_ReturnsUser()
    {
        var handler = new GetUserByIdQueryHandler(_db);
        var result  = await handler.Handle(new GetUserByIdQuery(_userId), default);

        Assert.NotNull(result);
        Assert.Equal("alice", result.Username);
    }

    [Fact]
    public async Task GetUserById_NotFound_ReturnsNull()
    {
        var handler = new GetUserByIdQueryHandler(_db);
        var result  = await handler.Handle(new GetUserByIdQuery(Guid.NewGuid()), default);

        Assert.Null(result);
    }

    // ── GetUserByUsernameQueryHandler ─────────────────────────────────────────

    [Fact]
    public async Task GetUserByUsername_Existing_ReturnsUser()
    {
        var handler = new GetUserByUsernameQueryHandler(_db);
        var result  = await handler.Handle(new GetUserByUsernameQuery("bob"), default);

        Assert.NotNull(result);
        Assert.Equal(_userId2, result.Id);
    }

    [Fact]
    public async Task GetUserByUsername_NotFound_ReturnsNull()
    {
        var handler = new GetUserByUsernameQueryHandler(_db);
        var result  = await handler.Handle(new GetUserByUsernameQuery("nobody"), default);

        Assert.Null(result);
    }

    // ── UpdateProfileCommandHandler ───────────────────────────────────────────

    [Fact]
    public async Task UpdateProfile_ValidUser_UpdatesDisplayNameAndBio()
    {
        var handler = new UpdateProfileCommandHandler(_db);
        var result  = await handler.Handle(new UpdateProfileCommand(_userId, "Alice Updated", "New bio"), default);

        Assert.Equal("Alice Updated", result.DisplayName);
        Assert.Equal("New bio", result.Bio);
    }

    [Fact]
    public async Task UpdateProfile_NullDisplayName_PreservesExisting()
    {
        var handler = new UpdateProfileCommandHandler(_db);
        var result  = await handler.Handle(new UpdateProfileCommand(_userId, null, "Only bio"), default);

        // DisplayName not overwritten when null/empty
        Assert.Equal("Alice", result.DisplayName);
        Assert.Equal("Only bio", result.Bio);
    }

    [Fact]
    public async Task UpdateProfile_NotFound_ThrowsInvalidOperation()
    {
        var handler = new UpdateProfileCommandHandler(_db);

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => handler.Handle(new UpdateProfileCommand(Guid.NewGuid(), "X", null), default));
    }

    // ── GetFollowersQueryHandler ──────────────────────────────────────────────

    [Fact]
    public async Task GetFollowers_ReturnsFollowers()
    {
        // userId2 follows userId
        _db.UserFollowers.Add(new UserFollower { UserId = _userId, FollowerId = _userId2 });
        await _db.SaveChangesAsync();

        var handler = new GetFollowersQueryHandler(_db);
        var result  = await handler.Handle(new GetFollowersQuery(_userId, new PaginationParams(1, 20)), default);

        Assert.Equal(1, result.Total);
        Assert.Equal(_userId2, result.Items[0].Id);
    }

    [Fact]
    public async Task GetFollowers_None_ReturnsEmpty()
    {
        var handler = new GetFollowersQueryHandler(_db);
        var result  = await handler.Handle(new GetFollowersQuery(_userId, new PaginationParams(1, 20)), default);

        Assert.Equal(0, result.Total);
        Assert.Empty(result.Items);
    }

    // ── GetFollowingQueryHandler ──────────────────────────────────────────────

    [Fact]
    public async Task GetFollowing_ReturnsFollowing()
    {
        // userId follows userId2
        _db.UserFollowings.Add(new UserFollowing { UserId = _userId, FollowingId = _userId2 });
        await _db.SaveChangesAsync();

        var handler = new GetFollowingQueryHandler(_db);
        var result  = await handler.Handle(new GetFollowingQuery(_userId, new PaginationParams(1, 20)), default);

        Assert.Equal(1, result.Total);
        Assert.Equal(_userId2, result.Items[0].Id);
    }

    [Fact]
    public async Task GetFollowing_None_ReturnsEmpty()
    {
        var handler = new GetFollowingQueryHandler(_db);
        var result  = await handler.Handle(new GetFollowingQuery(_userId, new PaginationParams(1, 20)), default);

        Assert.Equal(0, result.Total);
        Assert.Empty(result.Items);
    }
}
