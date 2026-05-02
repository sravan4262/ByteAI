using NpgsqlTypes;
using Pgvector;

namespace ByteAI.Core.Entities;

public sealed class Byte
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid AuthorId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string? CodeSnippet { get; set; }
    public string? Language { get; set; }
    public Vector? Embedding { get; set; }
    public NpgsqlTsVector? SearchVector { get; set; }
    public string Type { get; set; } = "article";
    public bool IsActive { get; set; } = true;
    /// <summary>True when hidden by moderation/ban. Distinct from IsActive (user soft-delete).
    /// A global EF query filter excludes IsHidden rows from all reads.</summary>
    public bool IsHidden { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public User Author { get; set; } = null!;
    public ICollection<Comment> Comments { get; set; } = [];
    public ICollection<UserLike> UserLikes { get; set; } = [];
    public ICollection<UserBookmark> UserBookmarks { get; set; } = [];
    public ICollection<UserView> UserViews { get; set; } = [];
    public ICollection<ByteTechStack> ByteTechStacks { get; set; } = [];
}
