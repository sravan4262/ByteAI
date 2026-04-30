namespace ByteAI.Core.Entities;

/// <summary>
/// One row per (user, device) push registration. The <see cref="Token"/> is
/// unique app-wide so the same physical device transferring between accounts
/// is handled via UPSERT on the token, replacing the prior <see cref="UserId"/>.
/// </summary>
public sealed class DeviceToken
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    /// <summary>"ios" | "android" | "web"</summary>
    public string Platform { get; set; } = "ios";
    /// <summary>Hex APNs token (iOS) or FCM token (Android/web).</summary>
    public string Token { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    /// <summary>Bumped on every register call so an APNs sender can prune
    /// tokens that haven't checked in for N days.</summary>
    public DateTime LastSeenAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
}
