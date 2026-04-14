namespace ByteAI.Core.Entities;

public sealed class UserRole
{
    public Guid UserId { get; set; }
    public Guid RoleTypeId { get; set; }
    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
    public RoleType RoleType { get; set; } = null!;
}
