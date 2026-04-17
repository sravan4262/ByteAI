using ByteAI.Core.Business;
using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Services;
using ByteAI.Core.Services.Badges;
using ByteAI.Core.Services.Users;

namespace ByteAI.Api.Tests.Unit.Business;

public sealed class UsersBusinessTests
{
    private readonly Mock<IUserService> _userService = new();
    private readonly Mock<ICurrentUserService> _currentUser = new();
    private readonly Mock<IBadgeService> _badgeService = new();
    private readonly UsersBusiness _sut;

    private readonly Guid _userId = Guid.NewGuid();
    private const string SupabaseUserId = "supabase_user";

    public UsersBusinessTests()
    {
        _sut = new UsersBusiness(_userService.Object, _currentUser.Object, _badgeService.Object);
    }

    // ── GetUserByIdAsync ──────────────────────────────────────────────────────

    [Fact]
    public async Task GetUserById_Found_ReturnsUser()
    {
        var user = new User { Id = _userId, Username = "alice" };
        _userService.Setup(s => s.GetByIdAsync(_userId, default)).ReturnsAsync(user);

        var result = await _sut.GetUserByIdAsync(_userId, default);

        Assert.NotNull(result);
        Assert.Equal("alice", result.Username);
    }

    [Fact]
    public async Task GetUserById_NotFound_ReturnsNull()
    {
        _userService.Setup(s => s.GetByIdAsync(_userId, default)).ReturnsAsync((User?)null);

        var result = await _sut.GetUserByIdAsync(_userId, default);

        Assert.Null(result);
    }

    // ── GetUserByUsernameAsync ────────────────────────────────────────────────

    [Fact]
    public async Task GetUserByUsername_Found_ReturnsUser()
    {
        var user = new User { Id = _userId, Username = "alice" };
        _userService.Setup(s => s.GetByUsernameAsync("alice", default)).ReturnsAsync(user);

        var result = await _sut.GetUserByUsernameAsync("alice", default);

        Assert.NotNull(result);
    }

    // ── GetCurrentUserAsync ───────────────────────────────────────────────────

    [Fact]
    public async Task GetCurrentUser_DelegatesToCurrentUserService()
    {
        var user = new User { Id = _userId, Username = "me" };
        _currentUser.Setup(s => s.GetCurrentUserAsync(SupabaseUserId, default)).ReturnsAsync(user);

        var result = await _sut.GetCurrentUserAsync(SupabaseUserId, default);

        Assert.NotNull(result);
        Assert.Equal("me", result.Username);
    }

    // ── UpdateProfileAsync ────────────────────────────────────────────────────

    [Fact]
    public async Task UpdateProfile_OtherUsersId_ThrowsUnauthorized()
    {
        var otherUserId = Guid.NewGuid();
        _currentUser.Setup(s => s.GetCurrentUserIdAsync(SupabaseUserId, default)).ReturnsAsync(_userId);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _sut.UpdateProfileAsync(SupabaseUserId, otherUserId, "New Name", null, default));
    }

    [Fact]
    public async Task UpdateProfile_UnknownUserId_ThrowsUnauthorized()
    {
        _currentUser.Setup(s => s.GetCurrentUserIdAsync(SupabaseUserId, default)).ReturnsAsync((Guid?)null);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _sut.UpdateProfileAsync(SupabaseUserId, _userId, "New Name", null, default));
    }

    [Fact]
    public async Task UpdateProfile_OwnProfile_DelegatesToService()
    {
        var updated = new User { Id = _userId, DisplayName = "New Name" };
        _currentUser.Setup(s => s.GetCurrentUserIdAsync(SupabaseUserId, default)).ReturnsAsync(_userId);
        _userService.Setup(s => s.UpdateProfileAsync(_userId, "New Name", null, default)).ReturnsAsync(updated);

        var result = await _sut.UpdateProfileAsync(SupabaseUserId, _userId, "New Name", null, default);

        Assert.Equal("New Name", result.DisplayName);
    }

    // ── ProvisionUserAsync ────────────────────────────────────────────────────

    [Fact]
    public async Task ProvisionUser_NewUser_AwardsBadge()
    {
        var user = new User { Id = _userId, Username = "newuser" };
        _userService.Setup(s => s.ProvisionAsync(SupabaseUserId, "New User", null, null, default))
                    .ReturnsAsync((user, true)); // wasCreated = true

        _badgeService.Setup(s => s.CheckAndAwardAsync(_userId, BadgeTrigger.UserRegistered, default))
                     .ReturnsAsync([]);

        var result = await _sut.ProvisionUserAsync(SupabaseUserId, "New User", null, null, default);

        Assert.Equal(user.Id, result.Id);
        _badgeService.Verify(s => s.CheckAndAwardAsync(_userId, BadgeTrigger.UserRegistered, default), Times.Once);
    }

    [Fact]
    public async Task ProvisionUser_ExistingUser_DoesNotAwardBadge()
    {
        var user = new User { Id = _userId };
        _userService.Setup(s => s.ProvisionAsync(SupabaseUserId, "Alice", null, null, default))
                    .ReturnsAsync((user, false)); // wasCreated = false

        await _sut.ProvisionUserAsync(SupabaseUserId, "Alice", null, null, default);

        _badgeService.Verify(s => s.CheckAndAwardAsync(It.IsAny<Guid>(), It.IsAny<BadgeTrigger>(), default), Times.Never);
    }

    // ── UpdateMyProfileAsync ──────────────────────────────────────────────────

    [Fact]
    public async Task UpdateMyProfile_UnknownUserId_ThrowsUnauthorized()
    {
        _currentUser.Setup(s => s.GetCurrentUserIdAsync(SupabaseUserId, default)).ReturnsAsync((Guid?)null);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _sut.UpdateMyProfileAsync(SupabaseUserId, null, null, null, null, null, null, null, null, null, default));
    }

    [Fact]
    public async Task UpdateMyProfile_ValidUser_DelegatesToService()
    {
        _currentUser.Setup(s => s.GetCurrentUserIdAsync(SupabaseUserId, default)).ReturnsAsync(_userId);
        var updated = new User { Id = _userId, Username = "alice_new" };
        _userService
            .Setup(s => s.UpdateMyProfileAsync(_userId, "alice_new", null, null, null, null, null, null, null, null, default))
            .ReturnsAsync(updated);

        var result = await _sut.UpdateMyProfileAsync(SupabaseUserId, "alice_new", null, null, null, null, null, null, null, null, default);

        Assert.Equal("alice_new", result.Username);
    }

    // ── GetFollowersAsync / GetFollowingAsync ─────────────────────────────────

    [Fact]
    public async Task GetFollowers_PageSizeCappedAt100()
    {
        _userService
            .Setup(s => s.GetFollowersAsync(_userId, It.Is<PaginationParams>(p => p.PageSize == 100), default))
            .ReturnsAsync(new PagedResult<User>([], 0, 1, 100));

        await _sut.GetFollowersAsync(_userId, 1, 999, default);

        _userService.Verify(s =>
            s.GetFollowersAsync(_userId, It.Is<PaginationParams>(p => p.PageSize == 100), default),
            Times.Once);
    }

    [Fact]
    public async Task IsFollowing_DelegatesToService()
    {
        _userService.Setup(s => s.IsFollowingAsync(_userId, Guid.Empty, default)).ReturnsAsync(false);

        var result = await _sut.IsFollowingAsync(_userId, Guid.Empty, default);

        Assert.False(result);
    }
}
