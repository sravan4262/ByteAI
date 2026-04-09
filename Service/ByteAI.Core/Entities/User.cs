using Pgvector;

namespace ByteAI.Core.Entities;

public sealed class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string ClerkId { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? Bio { get; set; }
    public string? RoleTitle { get; set; }
    public string? Company { get; set; }
    public string? AvatarUrl { get; set; }
    public int Level { get; set; } = 1;
    public int Xp { get; set; } = 0;
    public int Streak { get; set; } = 0;
    public string? Domain { get; set; }
    public string? Seniority { get; set; }
    public List<string> TechStack { get; set; } = [];
    public List<string> FeedPreferences { get; set; } = [];
    public Vector? InterestEmbedding { get; set; }
    public bool IsVerified { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Byte> Bytes { get; set; } = [];
    public ICollection<Comment> Comments { get; set; } = [];
    public ICollection<Reaction> Reactions { get; set; } = [];
    public ICollection<Bookmark> Bookmarks { get; set; } = [];
    public ICollection<Follow> Following { get; set; } = [];
    public ICollection<Follow> Followers { get; set; } = [];
    public ICollection<Notification> Notifications { get; set; } = [];
    public ICollection<Badge> Badges { get; set; } = [];
    public ICollection<Draft> Drafts { get; set; } = [];
}
