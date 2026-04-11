namespace ByteAI.Core.Entities;

/// <summary>
/// A single Q&A pair belonging to an interview byte.
/// One interview → many questions (1:N).
/// </summary>
public sealed class InterviewQuestion
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid InterviewId { get; set; }
    public string Question { get; set; } = string.Empty;
    public string Answer { get; set; } = string.Empty;
    public int OrderIndex { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Interview Interview { get; set; } = null!;
    public ICollection<InterviewQuestionComment> Comments { get; set; } = [];
    public ICollection<InterviewQuestionLike> Likes { get; set; } = [];
}
