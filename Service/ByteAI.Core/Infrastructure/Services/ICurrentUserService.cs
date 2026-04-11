using ByteAI.Core.Entities;

namespace ByteAI.Core.Infrastructure.Services;

/// <summary>
/// Resolves the currently authenticated user from their Clerk ID (JWT sub claim).
/// Avoids the anti-pattern of trying to parse Clerk IDs as GUIDs.
/// </summary>
public interface ICurrentUserService
{
    /// <summary>Returns the user entity for the given clerk_id, or null if not found.</summary>
    Task<User?> GetCurrentUserAsync(string clerkId, CancellationToken ct = default);

    /// <summary>Returns the user's UUID (users.id) for the given clerk_id, or null.</summary>
    Task<Guid?> GetCurrentUserIdAsync(string clerkId, CancellationToken ct = default);
}
