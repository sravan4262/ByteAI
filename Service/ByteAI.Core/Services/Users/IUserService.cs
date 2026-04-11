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

    /// <summary>Update the current user's full profile including seniority, domain, and tech stack.</summary>
    Task<User> UpdateMyProfileAsync(
        Guid userId,
        string? displayName,
        string? bio,
        string? company,
        string? roleTitle,
        string? seniority,
        string? domain,
        List<string>? techStack,
        CancellationToken ct);

    /// <summary>Insert or update a user record from a Clerk webhook payload. Returns the user and whether it was newly created.</summary>
    Task<(User user, bool wasCreated)> UpsertByClerkAsync(string clerkId, string displayName, string? avatarUrl, CancellationToken ct);

    /// <summary>Hard-delete a user by Clerk ID. Returns false if no matching record was found.</summary>
    Task<bool> DeleteByClerkIdAsync(string clerkId, CancellationToken ct);

    Task<List<Social>> GetUserSocialsAsync(Guid userId, CancellationToken ct);
    Task UpsertUserSocialsAsync(Guid userId, List<(string Platform, string Url, string? Label)> socials, CancellationToken ct);
}
