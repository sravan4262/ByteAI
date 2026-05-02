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

    /// <summary>
    /// Sets <c>auth.users.banned_until</c> via Supabase admin API. While
    /// <c>banned_until &gt; now()</c>, every sign-in / token-refresh attempt at the
    /// Supabase Auth layer is rejected with <c>user_banned</c>, so banned users
    /// cannot get a fresh JWT even after our local <c>SignOutAllSessionsAsync</c>
    /// revokes their refresh tokens.
    ///
    /// <paramref name="duration"/> semantics:
    /// <list type="bullet">
    ///   <item><description><c>null</c> → "none" — clears the ban (used by unban).</description></item>
    ///   <item><description>positive <see cref="TimeSpan"/> → "{hours}h" — temporary ban.</description></item>
    /// </list>
    /// </summary>
    Task SetAuthUserBanAsync(string supabaseUserId, TimeSpan? duration, CancellationToken ct = default);
}
