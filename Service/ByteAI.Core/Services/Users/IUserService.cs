using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;

namespace ByteAI.Core.Services.Users;



public interface IUserService
{
    Task<User?> GetByIdAsync(Guid userId, CancellationToken ct);
    Task<User?> GetByUsernameAsync(string username, CancellationToken ct);
    Task<PagedResult<User>> GetFollowersAsync(Guid userId, PaginationParams pagination, CancellationToken ct, Guid? requesterId = null);
    Task<PagedResult<User>> GetFollowingAsync(Guid userId, PaginationParams pagination, CancellationToken ct, Guid? requesterId = null);
    Task<User> UpdateProfileAsync(Guid userId, string? displayName, string? bio, CancellationToken ct);

    /// <summary>Update the current user's full profile including seniority, domain, and tech stack.</summary>
    Task<User> UpdateMyProfileAsync(
        Guid userId,
        string? username,
        string? displayName,
        string? bio,
        string? company,
        string? roleTitle,
        string? seniority,
        string? domain,
        List<string>? techStack,
        string? customAvatarUrl,
        CancellationToken ct);

    /// <summary>Provision a user after Supabase OAuth — creates if not found, returns existing if already provisioned. Returns the user and whether it was newly created.</summary>
    Task<(User user, bool wasCreated)> ProvisionAsync(string supabaseUserId, string displayName, string? avatarUrl, string? email, CancellationToken ct);

    /// <summary>Hard-delete a user by Supabase user ID. Returns the deleted user, or null if not found.</summary>
    Task<User?> DeleteBySupabaseUserIdAsync(string supabaseUserId, CancellationToken ct);

    Task<List<Social>> GetUserSocialsAsync(Guid userId, CancellationToken ct);
    Task UpsertUserSocialsAsync(Guid userId, List<(string Platform, string Url, string? Label)> socials, CancellationToken ct);

    /// <summary>Get bytes, followers, and following counts for a user in a single query.</summary>
    Task<(int BytesCount, int FollowersCount, int FollowingCount)> GetUserStatsAsync(Guid userId, CancellationToken ct);

    /// <summary>Check whether followerId is currently following targetUserId.</summary>
    Task<bool> IsFollowingAsync(Guid followerId, Guid targetUserId, CancellationToken ct);
}
