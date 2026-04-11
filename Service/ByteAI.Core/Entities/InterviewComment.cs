namespace ByteAI.Core.Entities;

public sealed class InterviewComment
{
    public Guid Id { get; set; }
    public Guid InterviewId { get; set; }
    public Guid AuthorId { get; set; }
    public Guid? ParentId { get; set; }
    public string Body { get; set; } = string.Empty;
    public int VoteCount { get; set; }
    public DateTime CreatedAt { get; set; }

    // Navigation
    public Interview Interview { get; set; } = null!;
    public User Author { get; set; } = null!;
    public InterviewComment? Parent { get; set; }
    public ICollection<InterviewComment> Replies { get; set; } = [];
}
