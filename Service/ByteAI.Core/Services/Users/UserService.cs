using ByteAI.Core.Commands.Users;
using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using MediatR;

namespace ByteAI.Core.Services.Users;

public sealed class UserService(IMediator mediator) : IUserService
{
    public Task<User?> GetByIdAsync(Guid userId, CancellationToken ct)
        => mediator.Send(new GetUserByIdQuery(userId), ct);

    public Task<User?> GetByUsernameAsync(string username, CancellationToken ct)
        => mediator.Send(new GetUserByUsernameQuery(username), ct);

    public Task<PagedResult<User>> GetFollowersAsync(Guid userId, PaginationParams pagination, CancellationToken ct)
        => mediator.Send(new GetFollowersQuery(userId, pagination), ct);

    public Task<PagedResult<User>> GetFollowingAsync(Guid userId, PaginationParams pagination, CancellationToken ct)
        => mediator.Send(new GetFollowingQuery(userId, pagination), ct);

    public Task<User> UpdateProfileAsync(Guid userId, string? displayName, string? bio, CancellationToken ct)
        => mediator.Send(new UpdateProfileCommand(userId, displayName, bio), ct);
}
