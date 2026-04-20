namespace ByteAI.Core.Entities;

public sealed class UserView
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ByteId { get; set; }
    public Guid? UserId { get; set; }
    public DateTime ViewedAt { get; set; } = DateTime.UtcNow;
    public int? DwellMs { get; set; }

    public Byte Byte { get; set; } = null!;
    public User? User { get; set; }
}
