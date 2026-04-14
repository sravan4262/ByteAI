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
    public Vector? InterestEmbedding { get; set; }
    public bool IsVerified { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // FK to lookup tables (added via migration 001)
    public Guid? SeniorityId { get; set; }
    public Guid? DomainId { get; set; }
    public Guid? LevelTypeId { get; set; }

    // Navigation
    public SeniorityType? SeniorityType { get; set; }
    public Domain? DomainNav { get; set; }
    public LevelType? LevelType { get; set; }
    public ICollection<Byte> Bytes { get; set; } = [];
    public ICollection<Comment> Comments { get; set; } = [];
    public ICollection<UserLike> UserLikes { get; set; } = [];
    public ICollection<UserBookmark> UserBookmarks { get; set; } = [];
    public ICollection<UserFollowing> Following { get; set; } = [];
    public ICollection<UserFollower> Followers { get; set; } = [];
    public ICollection<Notification> Notifications { get; set; } = [];
    public ICollection<UserBadge> UserBadges { get; set; } = [];
    public ICollection<Draft> Drafts { get; set; } = [];
    public ICollection<UserTechStack> UserTechStacks { get; set; } = [];
    public ICollection<UserFeedPreference> UserFeedPreferences { get; set; } = [];
    public ICollection<UserRole> UserRoles { get; set; } = [];
    public ICollection<UserFeatureFlag> UserFeatureFlags { get; set; } = [];
    public ICollection<Social> Socials { get; set; } = [];
    public ICollection<Interview> Interviews { get; set; } = [];
}
