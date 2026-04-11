namespace ByteAI.Core.Entities;

/// <summary>
/// A like on a specific interview question/answer pair.
/// Composite PK (QuestionId, UserId) ensures one like per user per question.
/// </summary>
public sealed class InterviewQuestionLike
{
    public Guid QuestionId { get; set; }
    public Guid UserId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public InterviewQuestion Question { get; set; } = null!;
    public User User { get; set; } = null!;
}
