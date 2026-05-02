namespace ByteAI.Core.Entities;

/// <summary>
/// Active or scheduled ban for a user. One row per banned user (user_id is the PK).
/// Lives in the moderation schema (see migration 009_moderation.sql).
/// NULL expires_at = permanent ban.
/// </summary>
public sealed class UserBan
{
    public Guid UserId { get; set; }
    public string Reason { get; set; } = string.Empty;
    public DateTime BannedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ExpiresAt { get; set; }
    public Guid? BannedBy { get; set; }

    public User? User { get; set; }
}
