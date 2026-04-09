namespace ByteAI.Core.Entities;

public sealed class Bookmark
{
    public Guid ByteId { get; set; }
    public Guid UserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Byte Byte { get; set; } = null!;
    public User User { get; set; } = null!;
}
