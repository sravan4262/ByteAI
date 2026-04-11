namespace ByteAI.Core.Entities;

public sealed class Social
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Platform { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string? Label { get; set; }
    public DateTime CreatedAt { get; set; }

    // Navigation
    public User User { get; set; } = null!;
}
