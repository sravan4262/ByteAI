namespace ByteAI.Core.Entities;

public sealed class InterviewView
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid InterviewId { get; set; }
    public Guid? UserId { get; set; }
    public DateTime ViewedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Interview Interview { get; set; } = null!;
    public User? User { get; set; }
}
