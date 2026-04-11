namespace ByteAI.Core.Entities;

public sealed class TrendingEvent
{
    public Guid Id { get; set; }
    public Guid ContentId { get; set; }
    public string ContentType { get; set; } = string.Empty; // "byte" | "interview"
    public Guid? UserId { get; set; }
    public DateTime ClickedAt { get; set; }
}
