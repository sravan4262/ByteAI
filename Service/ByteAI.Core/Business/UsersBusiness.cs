using ByteAI.Core.Business.Interfaces;
using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;
using ByteAI.Core.Infrastructure.Services;
using ByteAI.Core.Services.Users;

namespace ByteAI.Core.Business;

public sealed class UsersBusiness(IUserService userService, ICurrentUserService currentUserService) : IUsersBusiness
{
    public async Task<User?> GetUserByIdAsync(Guid userId, CancellationToken ct) =>
        await userService.GetByIdAsync(userId, ct);

    public async Task<User?> GetUserByUsernameAsync(string username, CancellationToken ct) =>
        await userService.GetByUsernameAsync(username, ct);

    public async Task<User?> GetCurrentUserAsync(string clerkId, CancellationToken ct) =>
        await currentUserService.GetCurrentUserAsync(clerkId, ct);

    public async Task<PagedResult<User>> GetFollowersAsync(Guid userId, int page, int pageSize, CancellationToken ct) =>
        await userService.GetFollowersAsync(userId, new PaginationParams(page, Math.Min(pageSize, 100)), ct);

    public async Task<PagedResult<User>> GetFollowingAsync(Guid userId, int page, int pageSize, CancellationToken ct) =>
        await userService.GetFollowingAsync(userId, new PaginationParams(page, Math.Min(pageSize, 100)), ct);

    public async Task<User> UpdateProfileAsync(string clerkId, Guid userId, string? displayName, string? bio, CancellationToken ct)
    {
        var requestingId = await currentUserService.GetCurrentUserIdAsync(clerkId, ct);
        if (requestingId is null || requestingId != userId)
            throw new UnauthorizedAccessException("You may only update your own profile.");
        return await userService.UpdateProfileAsync(userId, displayName, bio, ct);
    }
}
