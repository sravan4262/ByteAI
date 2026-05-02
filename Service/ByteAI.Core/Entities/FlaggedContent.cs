namespace ByteAI.Core.Entities;

/// <summary>
/// One row per flagged piece of content. Source is either:
///   - System auto-flag from the moderation pipeline (Medium severity), or
///   - User report via POST /api/moderation/reports.
/// Lives in the moderation schema (see migration 009_moderation.sql).
/// </summary>
public sealed class FlaggedContent
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>'byte' | 'comment' | 'interview' | 'chat' | 'support' | 'profile'</summary>
    public string ContentType { get; set; } = string.Empty;

    /// <summary>ID of the offending row in its source table. Use Guid.Empty when not applicable
    /// (e.g. content rejected before it was persisted).</summary>
    public Guid ContentId { get; set; }

    /// <summary>Null when the system flagged the content automatically.</summary>
    public Guid? ReporterUserId { get; set; }

    /// <summary>'TOXICITY' | 'PROFANITY' | 'PII' | 'SPAM' | 'GIBBERISH' | 'USER_REPORT'</summary>
    public string ReasonCode { get; set; } = string.Empty;

    public string? ReasonMessage { get; set; }

    /// <summary>'low' | 'medium' | 'high'</summary>
    public string Severity { get; set; } = "medium";

    /// <summary>'open' | 'reviewing' | 'removed' | 'dismissed'</summary>
    public string Status { get; set; } = "open";

    public double? Score { get; set; }

    /// <summary>Free-form JSON for additional debug info (model name, raw text excerpt, etc.).</summary>
    public string? Metadata { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvedAt { get; set; }
    public Guid? ResolvedBy { get; set; }
}
