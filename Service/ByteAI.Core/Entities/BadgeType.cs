namespace ByteAI.Core.Entities;

public sealed class BadgeType
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string Icon { get; set; } = "🏅";
    public string? Description { get; set; }

    // Navigation
    public ICollection<UserBadge> UserBadges { get; set; } = [];
}
