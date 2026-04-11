namespace ByteAI.Core.Entities;

public sealed class InterviewBookmark
{
    public Guid InterviewId { get; set; }
    public Guid UserId { get; set; }
    public DateTime CreatedAt { get; set; }

    // Navigation
    public Interview Interview { get; set; } = null!;
    public User User { get; set; } = null!;
}
