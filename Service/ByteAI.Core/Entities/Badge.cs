namespace ByteAI.Core.Entities;

public sealed class Badge
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string BadgeType { get; set; } = string.Empty;
    public DateTime EarnedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
}
