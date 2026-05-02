namespace ByteAI.Core.Entities;

/// <summary>
/// Audit log of bytes/interviews hidden by a ban event. Append-only on ban,
/// consumed-and-deleted on unban so we know which content rows to flip back to
/// IsHidden=false. Comments are NOT tracked here — a ban hard-deletes them and
/// they have no restore path.
/// Lives in the moderation schema (see migration 012_ban_cascade.sql).
/// </summary>
public sealed class BanHiddenContent
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>Internal user ID of the banned user whose content was hidden.</summary>
    public Guid UserId { get; set; }

    /// <summary>'byte' | 'interview'</summary>
    public string ContentType { get; set; } = string.Empty;

    /// <summary>ID of the row in its source table (bytes.bytes / interviews.interviews).</summary>
    public Guid ContentId { get; set; }

    public DateTime HiddenAt { get; set; } = DateTime.UtcNow;
}
