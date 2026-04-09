namespace ByteAI.Core.Entities;

public sealed class Draft
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid AuthorId { get; set; }
    public string? Title { get; set; }
    public string? Body { get; set; }
    public string? CodeSnippet { get; set; }
    public string? Language { get; set; }
    public List<string> Tags { get; set; } = [];
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public User Author { get; set; } = null!;
}
