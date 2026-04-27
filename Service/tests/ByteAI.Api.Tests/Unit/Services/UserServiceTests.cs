using ByteAI.Api.Tests.Helpers;
using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Services.Users;
using Microsoft.Extensions.Logging.Abstractions;
using ByteEntity = ByteAI.Core.Entities.Byte;

namespace ByteAI.Api.Tests.Unit.Services;

public sealed class UserServiceTests : IDisposable
{
    private readonly ByteAI.Core.Infrastructure.Persistence.AppDbContext _db;
    private readonly UserService _sut;
    private readonly Guid _userId = Guid.NewGuid();

    public UserServiceTests()
    {
        _db = DbContextFactory.Create();
        _sut = new UserService(_db, NullLogger<UserService>.Instance);

        _db.Users.Add(new User { Id = _userId, SupabaseUserId = "u1", Username = "testuser", DisplayName = "Test User" });
        // Seed role types for ProvisionAsync
        _db.RoleTypes.AddRange(
            new RoleType { Id = Guid.NewGuid(), Name = "user",  Label = "User" },
            new RoleType { Id = Guid.NewGuid(), Name = "admin", Label = "Admin" });
        _db.SaveChanges();
    }

    public void Dispose() => _db.Dispose();

    // ── GetByIdAsync ──────────────────────────────────────────────────────────

    [Fact]
    public async Task GetById_Existing_ReturnsUser()
    {
        var result = await _sut.GetByIdAsync(_userId, default);
        Assert.NotNull(result);
        Assert.Equal("testuser", result.Username);
    }

    [Fact]
    public async Task GetById_NotFound_ReturnsNull()
    {
        var result = await _sut.GetByIdAsync(Guid.NewGuid(), default);
        Assert.Null(result);
    }

    // ── GetByUsernameAsync ────────────────────────────────────────────────────

    [Fact]
    public async Task GetByUsername_Existing_ReturnsUser()
    {
        var result = await _sut.GetByUsernameAsync("testuser", default);
        Assert.NotNull(result);
        Assert.Equal(_userId, result.Id);
    }

    [Fact]
    public async Task GetByUsername_NotFound_ReturnsNull()
    {
        var result = await _sut.GetByUsernameAsync("nobody", default);
        Assert.Null(result);
    }

    // ── UpdateProfileAsync ────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateProfile_UpdatesDisplayNameAndBio()
    {
        var result = await _sut.UpdateProfileAsync(_userId, "New Name", "My bio", default);

        Assert.Equal("New Name", result.DisplayName);
        Assert.Equal("My bio", result.Bio);
    }

    [Fact]
    public async Task UpdateProfile_NullDisplayName_DoesNotOverwrite()
    {
        var result = await _sut.UpdateProfileAsync(_userId, null, "bio only", default);

        Assert.Equal("Test User", result.DisplayName); // unchanged
        Assert.Equal("bio only", result.Bio);
    }

    [Fact]
    public async Task UpdateProfile_NotFound_ThrowsInvalidOperation()
    {
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _sut.UpdateProfileAsync(Guid.NewGuid(), "X", null, default));
    }

    // ── GetFollowersAsync / GetFollowingAsync ─────────────────────────────────

    [Fact]
    public async Task GetFollowers_ReturnsFollowers()
    {
        var followerId = Guid.NewGuid();
        _db.Users.Add(new User { Id = followerId, SupabaseUserId = "f1", Username = "follower", DisplayName = "F" });
        _db.UserFollowers.Add(new UserFollower { UserId = _userId, FollowerId = followerId });
        await _db.SaveChangesAsync();

        var result = await _sut.GetFollowersAsync(_userId, new PaginationParams(1, 20), default);

        Assert.Equal(1, result.Total);
    }

    [Fact]
    public async Task GetFollowing_ReturnsFollowing()
    {
        var targetId = Guid.NewGuid();
        _db.Users.Add(new User { Id = targetId, SupabaseUserId = "t1", Username = "target", DisplayName = "T" });
        _db.UserFollowings.Add(new UserFollowing { UserId = _userId, FollowingId = targetId });
        await _db.SaveChangesAsync();

        var result = await _sut.GetFollowingAsync(_userId, new PaginationParams(1, 20), default);

        Assert.Equal(1, result.Total);
    }

    // ── IsFollowingAsync ──────────────────────────────────────────────────────

    [Fact]
    public async Task IsFollowing_WhenFollowing_ReturnsTrue()
    {
        var targetId = Guid.NewGuid();
        _db.Users.Add(new User { Id = targetId, SupabaseUserId = "t2", Username = "t2", DisplayName = "T2" });
        _db.UserFollowings.Add(new UserFollowing { UserId = _userId, FollowingId = targetId });
        await _db.SaveChangesAsync();

        Assert.True(await _sut.IsFollowingAsync(_userId, targetId, default));
    }

    [Fact]
    public async Task IsFollowing_WhenNotFollowing_ReturnsFalse()
    {
        Assert.False(await _sut.IsFollowingAsync(_userId, Guid.NewGuid(), default));
    }

    // ── GetUserStatsAsync ─────────────────────────────────────────────────────

    [Fact]
    public async Task GetUserStats_ReturnsCorrectCounts()
    {
        var f1 = Guid.NewGuid();
        var t1 = Guid.NewGuid();
        _db.Users.AddRange(
            new User { Id = f1, SupabaseUserId = "f2", Username = "f2", DisplayName = "F2" },
            new User { Id = t1, SupabaseUserId = "t3", Username = "t3", DisplayName = "T3" });
        _db.Bytes.Add(new ByteEntity { AuthorId = _userId, Title = "X", Body = "x", Type = "article", IsActive = true });
        _db.UserFollowers.Add(new UserFollower { UserId = _userId, FollowerId = f1 });
        _db.UserFollowings.Add(new UserFollowing { UserId = _userId, FollowingId = t1 });
        await _db.SaveChangesAsync();

        var (bytes, followers, following) = await _sut.GetUserStatsAsync(_userId, default);

        Assert.Equal(1, bytes);
        Assert.Equal(1, followers);
        Assert.Equal(1, following);
    }

    // ── ProvisionAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task Provision_NewUser_CreatesUserAndReturnsWasCreatedTrue()
    {
        var (user, wasCreated) = await _sut.ProvisionAsync("new_supabase_id", "New Person", null, null, default);

        Assert.True(wasCreated);
        Assert.NotNull(user);
        Assert.Equal("new_supabase_id", user.SupabaseUserId);
    }

    [Fact]
    public async Task Provision_ExistingUser_IsIdempotentAndReturnsWasCreatedFalse()
    {
        // ProvisionAsync is idempotent — existing users are not mutated on re-provision
        var (user, wasCreated) = await _sut.ProvisionAsync("u1", "Updated Name", null, null, default);

        Assert.False(wasCreated);
        Assert.Equal("Test User", user.DisplayName);
    }

    [Fact]
    public async Task Provision_NewUser_AssignsUserRole()
    {
        var (user, _) = await _sut.ProvisionAsync("supabase_new2", "Person2", null, null, default);

        Assert.True(_db.UserRoles.Any(r => r.UserId == user.Id));
    }

    // ── DeleteBySupabaseUserIdAsync ───────────────────────────────────────────

    [Fact]
    public async Task DeleteBySupabaseUserId_Existing_RemovesAndReturnsUser()
    {
        var result = await _sut.DeleteBySupabaseUserIdAsync("u1", default);

        Assert.NotNull(result);
        Assert.Equal(_userId, result.Id);
        Assert.Null(await _db.Users.FindAsync([_userId]));
    }

    [Fact]
    public async Task DeleteBySupabaseUserId_NotFound_ReturnsNull()
    {
        var result = await _sut.DeleteBySupabaseUserIdAsync("nobody", default);
        Assert.Null(result);
    }

    // ── UpdateMyProfileAsync ──────────────────────────────────────────────────

    [Fact]
    public async Task UpdateMyProfile_UsernameTaken_ThrowsInvalidOperation()
    {
        var otherId = Guid.NewGuid();
        _db.Users.Add(new User { Id = otherId, SupabaseUserId = "o1", Username = "taken", DisplayName = "O" });
        await _db.SaveChangesAsync();

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _sut.UpdateMyProfileAsync(_userId, "taken", null, null, null, null, null, null, null, null, default));
    }

    [Fact]
    public async Task UpdateMyProfile_UniqueUsername_UpdatesUsername()
    {
        var result = await _sut.UpdateMyProfileAsync(_userId, "newname", null, null, null, null, null, null, null, null, default);

        Assert.Equal("newname", result.Username);
    }
}
