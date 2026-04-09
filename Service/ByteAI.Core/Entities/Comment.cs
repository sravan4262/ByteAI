namespace ByteAI.Core.Entities;

public sealed class Comment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ByteId { get; set; }
    public Guid AuthorId { get; set; }
    public Guid? ParentId { get; set; }
    public string Body { get; set; } = string.Empty;
    public int VoteCount { get; set; } = 0;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Byte Byte { get; set; } = null!;
    public User Author { get; set; } = null!;
    public Comment? Parent { get; set; }
    public ICollection<Comment> Replies { get; set; } = [];
}
