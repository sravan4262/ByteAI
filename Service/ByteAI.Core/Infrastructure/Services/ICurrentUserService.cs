using ByteAI.Core.Entities;

namespace ByteAI.Core.Infrastructure.Services;

/// <summary>
/// Resolves the currently authenticated user from their Supabase user ID (JWT sub claim = auth.users.id).
/// </summary>
public interface ICurrentUserService
{
    /// <summary>Returns the user entity for the given supabase_user_id, or null if not found.</summary>
    Task<User?> GetCurrentUserAsync(string supabaseUserId, CancellationToken ct = default);

    /// <summary>Returns the user's UUID (users.id) for the given supabase_user_id, or null.</summary>
    Task<Guid?> GetCurrentUserIdAsync(string supabaseUserId, CancellationToken ct = default);
}
