namespace ByteAI.Core.Entities;

public sealed class UserBadge
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Guid BadgeTypeId { get; set; }
    public DateTime EarnedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
    public BadgeType BadgeTypeNav { get; set; } = null!;
}
