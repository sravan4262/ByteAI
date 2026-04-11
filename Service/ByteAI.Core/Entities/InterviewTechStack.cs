namespace ByteAI.Core.Entities;

public sealed class InterviewTechStack
{
    public Guid InterviewId { get; set; }
    public Guid TechStackId { get; set; }

    // Navigation
    public Interview Interview { get; set; } = null!;
    public TechStack TechStack { get; set; } = null!;
}
