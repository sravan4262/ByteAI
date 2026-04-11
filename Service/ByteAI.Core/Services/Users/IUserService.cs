using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;

namespace ByteAI.Core.Services.Users;

public interface IUserService
{
    Task<User?> GetByIdAsync(Guid userId, CancellationToken ct);
    Task<User?> GetByUsernameAsync(string username, CancellationToken ct);
    Task<PagedResult<User>> GetFollowersAsync(Guid userId, PaginationParams pagination, CancellationToken ct);
    Task<PagedResult<User>> GetFollowingAsync(Guid userId, PaginationParams pagination, CancellationToken ct);
    Task<User> UpdateProfileAsync(Guid userId, string? displayName, string? bio, CancellationToken ct);
}
