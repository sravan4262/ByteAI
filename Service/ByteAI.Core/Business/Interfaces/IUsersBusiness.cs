using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure;

namespace ByteAI.Core.Business.Interfaces;

public interface IUsersBusiness
{
    Task<User?> GetUserByIdAsync(Guid userId, CancellationToken ct);
    Task<User?> GetUserByUsernameAsync(string username, CancellationToken ct);
    Task<User?> GetCurrentUserAsync(string supabaseUserId, CancellationToken ct);
    Task<PagedResult<User>> GetFollowersAsync(Guid userId, int page, int pageSize, CancellationToken ct);
    Task<PagedResult<User>> GetFollowingAsync(Guid userId, int page, int pageSize, CancellationToken ct);
    Task<User> UpdateProfileAsync(string supabaseUserId, Guid userId, string? displayName, string? bio, CancellationToken ct);

    /// <summary>Provision a user after Supabase OAuth — creates on first call, idempotent on subsequent calls.</summary>
    Task<User> ProvisionUserAsync(string supabaseUserId, string displayName, string? avatarUrl, string? email, CancellationToken ct);

    /// <summary>Hard-delete the user's app profile. Returns false if not found.</summary>
    Task<bool> DeleteUserAsync(string supabaseUserId, CancellationToken ct);

    /// <summary>Update the current authenticated user's profile fields.</summary>
    Task<User> UpdateMyProfileAsync(
        string supabaseUserId,
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

    Task<List<Social>> GetMySocialsAsync(string supabaseUserId, CancellationToken ct);
    Task UpsertMySocialsAsync(string supabaseUserId, List<(string Platform, string Url, string? Label)> socials, CancellationToken ct);

    Task<(int BytesCount, int FollowersCount, int FollowingCount)> GetUserStatsAsync(Guid userId, CancellationToken ct);
    Task<bool> IsFollowingAsync(Guid followerId, Guid targetUserId, CancellationToken ct);
}
