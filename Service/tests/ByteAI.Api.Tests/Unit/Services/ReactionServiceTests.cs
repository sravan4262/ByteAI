using ByteAI.Core.Commands.Reactions;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Services.Reactions;
using MediatR;

namespace ByteAI.Api.Tests.Unit.Services;

/// <summary>
/// ReactionService is a pure delegate — every method forwards to IMediator.
/// Tests verify the correct command/query is sent with the right arguments.
/// </summary>
public sealed class ReactionServiceTests
{
    private readonly Mock<IMediator> _mediator = new();
    private readonly ReactionService _sut;

    private readonly Guid _byteId = Guid.NewGuid();
    private readonly Guid _userId = Guid.NewGuid();

    public ReactionServiceTests()
    {
        _sut = new ReactionService(_mediator.Object);
    }

    // ── GetReactionsAsync ─────────────────────────────────────────────────────

    [Fact]
    public async Task GetReactions_SendsGetByteReactionsQuery()
    {
        _mediator.Setup(m => m.Send(It.IsAny<GetByteReactionsQuery>(), default))
                 .ReturnsAsync(new ReactionsCount(_byteId, 5, 5));

        var result = await _sut.GetReactionsAsync(_byteId, default);

        _mediator.Verify(m => m.Send(It.Is<GetByteReactionsQuery>(q => q.ByteId == _byteId), default), Times.Once);
        Assert.Equal(5, result.LikeCount);
    }

    // ── ToggleReactionAsync ───────────────────────────────────────────────────

    [Fact]
    public async Task ToggleReaction_SendsCreateReactionCommand()
    {
        var expected = new ToggleLikeResult(_byteId, _userId, IsLiked: true);
        _mediator.Setup(m => m.Send(It.IsAny<CreateReactionCommand>(), default))
                 .ReturnsAsync(expected);

        var result = await _sut.ToggleReactionAsync(_byteId, _userId, "like", default);

        _mediator.Verify(m => m.Send(
            It.Is<CreateReactionCommand>(c => c.ByteId == _byteId && c.UserId == _userId && c.Type == "like"),
            default), Times.Once);
        Assert.True(result.IsLiked);
    }

    // ── DeleteReactionAsync ───────────────────────────────────────────────────

    [Fact]
    public async Task DeleteReaction_SendsDeleteReactionCommand()
    {
        _mediator.Setup(m => m.Send(It.IsAny<DeleteReactionCommand>(), default))
                 .ReturnsAsync(true);

        var result = await _sut.DeleteReactionAsync(_byteId, _userId, default);

        _mediator.Verify(m => m.Send(
            It.Is<DeleteReactionCommand>(c => c.ByteId == _byteId && c.UserId == _userId),
            default), Times.Once);
        Assert.True(result);
    }

    // ── GetLikersAsync ────────────────────────────────────────────────────────

    [Fact]
    public async Task GetLikers_SendsGetByteLikersQuery()
    {
        var likers = new List<LikerInfo> { new(Guid.NewGuid(), "alice", "Alice", false) };
        _mediator.Setup(m => m.Send(It.IsAny<GetByteLikersQuery>(), default))
                 .ReturnsAsync(likers);

        var result = await _sut.GetLikersAsync(_byteId, default);

        _mediator.Verify(m => m.Send(It.Is<GetByteLikersQuery>(q => q.ByteId == _byteId), default), Times.Once);
        Assert.Single(result);
        Assert.Equal("alice", result[0].Username);
    }
}
