using MediatR;

namespace ByteAI.Core.Commands.Follow;

public sealed record FollowUserCommand(Guid FollowerId, Guid FollowingId) : IRequest<bool>;
public sealed record UnfollowUserCommand(Guid FollowerId, Guid UnfollowingId) : IRequest<bool>;
