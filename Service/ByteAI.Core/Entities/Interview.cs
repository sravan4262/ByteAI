namespace ByteAI.Core.Entities;

public sealed class Interview
{
    public Guid Id { get; set; }
    public Guid AuthorId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string? CodeSnippet { get; set; }
    public string? Language { get; set; }
    public string? Company { get; set; }
    public string? Role { get; set; }
    public string Difficulty { get; set; } = "medium";
    public Pgvector.Vector? Embedding { get; set; }
    public string Type { get; set; } = "interview";
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Navigation
    public User Author { get; set; } = null!;
    public ICollection<InterviewComment> Comments { get; set; } = [];
    public ICollection<InterviewLike> InterviewLikes { get; set; } = [];
    public ICollection<InterviewBookmark> Bookmarks { get; set; } = [];
    public ICollection<InterviewView> InterviewViews { get; set; } = [];
    public ICollection<InterviewTechStack> InterviewTechStacks { get; set; } = [];
    public ICollection<InterviewQuestion> Questions { get; set; } = [];
}
