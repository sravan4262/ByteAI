namespace ByteAI.Core.Entities;

public sealed class InterviewRole
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
