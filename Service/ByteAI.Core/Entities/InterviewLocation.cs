namespace ByteAI.Core.Entities;

public sealed class InterviewLocation
{
    public Guid InterviewId { get; set; }
    public Guid LocationId { get; set; }

    // Navigation
    public Interview Interview { get; set; } = null!;
    public Location Location { get; set; } = null!;
}
