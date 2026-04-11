namespace ByteAI.Core.Entities;

public sealed class ByteTechStack
{
    public Guid ByteId { get; set; }
    public Guid TechStackId { get; set; }

    // Navigation
    public Byte Byte { get; set; } = null!;
    public TechStack TechStack { get; set; } = null!;
}
