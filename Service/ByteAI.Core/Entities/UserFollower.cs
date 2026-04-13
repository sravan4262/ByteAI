namespace ByteAI.Core.Entities;

/// <summary>Row in users.followers — user_id is followed by follower_id.</summary>
public sealed class UserFollower
{
    public Guid UserId { get; set; }      // the person being followed
    public Guid FollowerId { get; set; }  // the person doing the following
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
    public User Follower { get; set; } = null!;
}
