namespace ByteAI.Core.Entities;

/// <summary>
/// Audit log of every XP award. Used to enforce one-time and daily caps
/// without adding flag columns to the User entity.
/// </summary>
public sealed class UserXpLog
{
    public Guid     Id         { get; set; }
    public Guid     UserId     { get; set; }

    /// <summary>Matches XpActionType.Name, e.g. "post_byte".</summary>
    public string   ActionName { get; set; } = string.Empty;

    public int      XpAmount   { get; set; }
    public DateTime AwardedAt  { get; set; }

    // Navigation
    public User User { get; set; } = null!;
}
