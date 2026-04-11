namespace ByteAI.Core.Entities;

/// <summary>
/// A comment on a single interview question/answer.
/// Users can comment on any question within an interview.
/// </summary>
public sealed class InterviewQuestionComment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid QuestionId { get; set; }
    public Guid AuthorId { get; set; }
    public string Body { get; set; } = string.Empty;
    public Guid? ParentId { get; set; }
    public int VoteCount { get; set; } = 0;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public InterviewQuestion Question { get; set; } = null!;
    public User Author { get; set; } = null!;
    public InterviewQuestionComment? Parent { get; set; }
    public ICollection<InterviewQuestionComment> Replies { get; set; } = [];
}
