namespace ByteAI.Core.Services.Supabase;

public interface ISupabaseAdminService
{
    /// <summary>
    /// Immediately invalidates all active sessions for the user. Call before
    /// deleting so existing JWTs are rejected without waiting for the auth row removal.
    /// Non-fatal: deletion will invalidate sessions regardless.
    /// </summary>
    Task SignOutAllSessionsAsync(string supabaseUserId, CancellationToken ct = default);

    /// <summary>
    /// Permanently deletes the Supabase auth.users record for the given user ID.
    /// Must be called after the app's users.users row is deleted so that the user
    /// cannot re-provision a new profile with the same Supabase identity.
    /// </summary>
    Task DeleteAuthUserAsync(string supabaseUserId, CancellationToken ct = default);
}
