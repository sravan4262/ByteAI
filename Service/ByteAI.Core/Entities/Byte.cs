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
    public List<string> Tags { get; set; } = [];
    public int LikeCount { get; set; } = 0;
    public int CommentCount { get; set; } = 0;
    public int BookmarkCount { get; set; } = 0;
    public int ViewCount { get; set; } = 0;
    public Vector? Embedding { get; set; }
    public NpgsqlTsVector? SearchVector { get; set; }
    public string Type { get; set; } = "article";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public User Author { get; set; } = null!;
    public ICollection<Comment> Comments { get; set; } = [];
    public ICollection<Reaction> Reactions { get; set; } = [];
    public ICollection<Bookmark> Bookmarks { get; set; } = [];
}
