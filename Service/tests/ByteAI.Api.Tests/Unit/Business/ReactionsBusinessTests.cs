using ByteAI.Core.Business;
using ByteAI.Core.Commands.Reactions;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Services;
using ByteAI.Core.Services.Reactions;

namespace ByteAI.Api.Tests.Unit.Business;

public sealed class ReactionsBusinessTests
{
    private readonly Mock<IReactionService> _reactionService = new();
    private readonly Mock<ICurrentUserService> _currentUser = new();
    private readonly ReactionsBusiness _sut;

    private readonly Guid _userId = Guid.NewGuid();
    private readonly Guid _byteId = Guid.NewGuid();
    private const string SupabaseUserId = "supabase_react";

    public ReactionsBusinessTests()
    {
        _sut = new ReactionsBusiness(_reactionService.Object, _currentUser.Object);
    }

    // ── Auth guards ───────────────────────────────────────────────────────────

    [Fact]
    public async Task ToggleReaction_UnknownUserId_ThrowsUnauthorized()
    {
        _currentUser.Setup(s => s.GetCurrentUserIdAsync(SupabaseUserId, default)).ReturnsAsync((Guid?)null);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _sut.ToggleReactionAsync(SupabaseUserId, _byteId, "like", default));
    }

    [Fact]
    public async Task DeleteReaction_UnknownUserId_ThrowsUnauthorized()
    {
        _currentUser.Setup(s => s.GetCurrentUserIdAsync(SupabaseUserId, default)).ReturnsAsync((Guid?)null);

        await Assert.ThrowsAsync<UnauthorizedAccessException>(
            () => _sut.DeleteReactionAsync(SupabaseUserId, _byteId, default));
    }

    // ── GetReactionsAsync ─────────────────────────────────────────────────────

    [Fact]
    public async Task GetReactions_NeedsNoAuth_DelegatesToService()
    {
        var expected = new ReactionsCount(_byteId, 10, 10);
        _reactionService.Setup(s => s.GetReactionsAsync(_byteId, default)).ReturnsAsync(expected);

        var result = await _sut.GetReactionsAsync(_byteId, default);

        Assert.Equal(expected, result);
    }

    // ── ToggleReactionAsync ───────────────────────────────────────────────────

    [Fact]
    public async Task ToggleReaction_ValidUser_DelegatesToService()
    {
        _currentUser.Setup(s => s.GetCurrentUserIdAsync(SupabaseUserId, default)).ReturnsAsync(_userId);
        var expected = new ToggleLikeResult(_byteId, _userId, true);
        _reactionService.Setup(s => s.ToggleReactionAsync(_byteId, _userId, "like", default)).ReturnsAsync(expected);

        var result = await _sut.ToggleReactionAsync(SupabaseUserId, _byteId, "like", default);

        Assert.Equal(expected, result);
        Assert.True(result.IsLiked);
    }

    // ── DeleteReactionAsync ───────────────────────────────────────────────────

    [Fact]
    public async Task DeleteReaction_ValidUser_DelegatesToService()
    {
        _currentUser.Setup(s => s.GetCurrentUserIdAsync(SupabaseUserId, default)).ReturnsAsync(_userId);
        _reactionService.Setup(s => s.DeleteReactionAsync(_byteId, _userId, default)).ReturnsAsync(true);

        var result = await _sut.DeleteReactionAsync(SupabaseUserId, _byteId, default);

        Assert.True(result);
    }

    // ── GetLikersAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task GetLikers_NeedsNoAuth_DelegatesToService()
    {
        var likers = new List<LikerInfo> { new(Guid.NewGuid(), "alice", "Alice", false) };
        _reactionService.Setup(s => s.GetLikersAsync(_byteId, default, It.IsAny<Guid?>())).ReturnsAsync(likers);

        var result = await _sut.GetLikersAsync(_byteId, default);

        Assert.Single(result);
        Assert.Equal("alice", result[0].Username);
    }
}
