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

    /// <summary>Sync a Clerk user.created or user.updated event into the users table.</summary>
    Task<User> SyncClerkUserAsync(string clerkId, string displayName, string? avatarUrl, CancellationToken ct);

    /// <summary>Remove a user triggered by a Clerk user.deleted event. Returns false if not found.</summary>
    Task<bool> DeleteClerkUserAsync(string clerkId, CancellationToken ct);

    /// <summary>Update the current authenticated user's profile fields.</summary>
    Task<User> UpdateMyProfileAsync(
        string clerkId,
        string? displayName,
        string? bio,
        string? company,
        string? roleTitle,
        string? seniority,
        string? domain,
        List<string>? techStack,
        CancellationToken ct);

    Task<List<Social>> GetMySocialsAsync(string clerkId, CancellationToken ct);
    Task UpsertMySocialsAsync(string clerkId, List<(string Platform, string Url, string? Label)> socials, CancellationToken ct);
}
