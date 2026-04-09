namespace ByteAI.Core.Entities;

public sealed class Follow
{
    public Guid FollowerId { get; set; }
    public Guid FollowingId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User Follower { get; set; } = null!;
    public User Following { get; set; } = null!;
}
