namespace ByteAI.Core.Entities;

public sealed class UserPreferences
{
    public Guid UserId { get; set; }
    public string Theme { get; set; } = "dark";
    public string Visibility { get; set; } = "public";
    public bool NotifReactions { get; set; } = true;
    public bool NotifComments { get; set; } = true;
    public bool NotifFollowers { get; set; } = true;
    public bool NotifUnfollows { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
}
