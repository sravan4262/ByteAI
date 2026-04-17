using ByteAI.Core.Business;
using ByteAI.Core.Infrastructure.Services;
using ByteAI.Core.Services.Follow;

namespace ByteAI.Api.Tests.Unit.Business;

public sealed class FollowBusinessTests
{
    private readonly Mock<IFollowService> _followService = new();
    private readonly Mock<ICurrentUserService> _currentUser = new();
    private readonly FollowBusiness _sut;

    private readonly Guid _userId = Guid.NewGuid();
    private readonly Guid _targetId = Guid.NewGuid();
    private const string SupabaseUserId = "clerk_follow";

    public FollowBusinessTests()
    {
        _sut = new FollowBusiness(_followService.Object, _currentUser.Object);
    }

    // ── Auth guards ───────────────────────────────────────────────────────────

    [Fact]
    public async Task Follow_UnknownClerkId_ThrowsUnauthorized()
    {
        _currentUser.Setup(s => s.GetCurrentUserIdAsync(ClerkId, default)).ReturnsAsync((Guid?)null);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _sut.FollowUserAsync(ClerkId, _targetId, default));
    }

    [Fact]
    public async Task Unfollow_UnknownClerkId_ThrowsUnauthorized()
    {
        _currentUser.Setup(s => s.GetCurrentUserIdAsync(ClerkId, default)).ReturnsAsync((Guid?)null);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _sut.UnfollowUserAsync(ClerkId, _targetId, default));
    }

    // ── FollowUserAsync ───────────────────────────────────────────────────────

    [Fact]
    public async Task Follow_ValidUser_DelegatesToService()
    {
        _currentUser.Setup(s => s.GetCurrentUserIdAsync(ClerkId, default)).ReturnsAsync(_userId);
        _followService.Setup(s => s.FollowUserAsync(_userId, _targetId, default)).ReturnsAsync(true);

        var result = await _sut.FollowUserAsync(ClerkId, _targetId, default);

        Assert.True(result);
        _followService.Verify(s => s.FollowUserAsync(_userId, _targetId, default), Times.Once);
    }

    [Fact]
    public async Task Follow_ServiceReturnsFalse_ReturnsFalse()
    {
        _currentUser.Setup(s => s.GetCurrentUserIdAsync(ClerkId, default)).ReturnsAsync(_userId);
        _followService.Setup(s => s.FollowUserAsync(_userId, _targetId, default)).ReturnsAsync(false);

        var result = await _sut.FollowUserAsync(ClerkId, _targetId, default);

        Assert.False(result);
    }

    // ── UnfollowUserAsync ─────────────────────────────────────────────────────

    [Fact]
    public async Task Unfollow_ValidUser_DelegatesToService()
    {
        _currentUser.Setup(s => s.GetCurrentUserIdAsync(ClerkId, default)).ReturnsAsync(_userId);
        _followService.Setup(s => s.UnfollowUserAsync(_userId, _targetId, default)).ReturnsAsync(true);

        var result = await _sut.UnfollowUserAsync(ClerkId, _targetId, default);

        Assert.True(result);
        _followService.Verify(s => s.UnfollowUserAsync(_userId, _targetId, default), Times.Once);
    }
}
