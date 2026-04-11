using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;

namespace ByteAI.Core.Business.Interfaces;

public interface IUsersBusiness
{
    Task<User?> GetUserByIdAsync(Guid userId, CancellationToken ct);
    Task<User?> GetUserByUsernameAsync(string username, CancellationToken ct);
    Task<User?> GetCurrentUserAsync(string clerkId, CancellationToken ct);
    Task<PagedResult<User>> GetFollowersAsync(Guid userId, int page, int pageSize, CancellationToken ct);
    Task<PagedResult<User>> GetFollowingAsync(Guid userId, int page, int pageSize, CancellationToken ct);
    Task<User> UpdateProfileAsync(string clerkId, Guid userId, string? displayName, string? bio, CancellationToken ct);
}
