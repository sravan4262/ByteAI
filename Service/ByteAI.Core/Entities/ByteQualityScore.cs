namespace ByteAI.Core.Entities;

public sealed class ByteQualityScore
{
    public Guid ByteId { get; set; }
    public int Clarity { get; set; }
    public int Specificity { get; set; }
    public int Relevance { get; set; }
    public int Overall { get; set; }
    public DateTime ComputedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public Byte Byte { get; set; } = null!;
}
