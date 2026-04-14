namespace ByteAI.Core.Entities;

/// <summary>
/// Lookup table that defines how much XP each platform action awards.
/// Centralises XP economy config — change values here without touching handler code.
/// </summary>
public sealed class XpActionType
{
    public Guid   Id             { get; set; }

    /// <summary>Machine key, e.g. "post_byte". Used in event handlers to look up the reward.</summary>
    public string Name          { get; set; } = string.Empty;

    /// <summary>Human-readable label shown in the UI.</summary>
    public string Label         { get; set; } = string.Empty;

    /// <summary>Short description of when/why XP is awarded.</summary>
    public string? Description  { get; set; }

    /// <summary>Base XP awarded per occurrence.</summary>
    public int    XpAmount      { get; set; }

    /// <summary>Maximum times this action can award XP per day (null = unlimited).</summary>
    public int?   MaxPerDay     { get; set; }

    /// <summary>Whether this action can only ever fire once per user lifetime.</summary>
    public bool   IsOneTime     { get; set; }

    /// <summary>Emoji icon shown in the XP history / leaderboard UI.</summary>
    public string Icon          { get; set; } = "⚡";

    /// <summary>Toggle to disable an XP source without deleting the row.</summary>
    public bool   IsActive      { get; set; } = true;

    public DateTime CreatedAt   { get; set; }
    public DateTime UpdatedAt   { get; set; }
}
