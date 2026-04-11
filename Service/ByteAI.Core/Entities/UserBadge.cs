namespace ByteAI.Core.Entities;

public sealed class UserBadge
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Guid? BadgeTypeId { get; set; }    // nullable — ON DELETE SET NULL in DB
    public string BadgeType { get; set; } = string.Empty; // name slug e.g. "first_byte"
    public DateTime EarnedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
    public BadgeType? BadgeTypeNav { get; set; } // nullable because FK can be SET NULL
}
