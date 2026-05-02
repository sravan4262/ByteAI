namespace ByteAI.Core.Entities;

/// <summary>
/// Append-only audit log of ban events. Each ban inserts a new row; unban / re-ban
/// closes the prior open row by setting <see cref="LiftedAt"/> + <see cref="LiftedBy"/>.
/// Lives in the moderation schema (see migration 013_user_ban_history.sql).
///
/// Distinct from <see cref="UserBan"/>, which is a "currently-active ban" projection
/// keyed on user_id and used by the middleware for fast lookup. This table is the
/// source of truth for compliance / dispute / pattern review.
/// </summary>
public sealed class UserBanHistory
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }
    public string Reason { get; set; } = string.Empty;
    public DateTime BannedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ExpiresAt { get; set; }
    public Guid? BannedBy { get; set; }

    /// <summary>NULL while the ban is active. Set on unban or re-ban.</summary>
    public DateTime? LiftedAt { get; set; }
    public Guid? LiftedBy { get; set; }
}
