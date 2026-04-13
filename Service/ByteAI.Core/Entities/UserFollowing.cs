namespace ByteAI.Core.Entities;

/// <summary>Row in users.following — user_id follows following_id.</summary>
public sealed class UserFollowing
{
    public Guid UserId { get; set; }       // the person who is following
    public Guid FollowingId { get; set; }  // the person being followed
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
    public User Following { get; set; } = null!;
}
