namespace ByteAI.Core.Entities;

public sealed class UserFeedPreference
{
    public Guid UserId { get; set; }
    public Guid TechStackId { get; set; }
    public DateTime CreatedAt { get; set; }

    // Navigation
    public User User { get; set; } = null!;
    public TechStack TechStack { get; set; } = null!;
}
