using ByteAI.Core.Commands.Follow;
using MediatR;

namespace ByteAI.Core.Services.Follow;

public sealed class FollowService(IMediator mediator) : IFollowService
{
    public Task<bool> FollowUserAsync(Guid followerId, Guid targetUserId, CancellationToken ct)
    {
        if (followerId == targetUserId)
            throw new InvalidOperationException("Cannot follow yourself");
        return mediator.Send(new FollowUserCommand(followerId, targetUserId), ct);
    }

    public Task<bool> UnfollowUserAsync(Guid followerId, Guid targetUserId, CancellationToken ct)
        => mediator.Send(new UnfollowUserCommand(followerId, targetUserId), ct);
}
