using System.ComponentModel.DataAnnotations.Schema;

namespace ByteAI.Core.Entities;

[Table("feedback", Schema = "support")]
public sealed class Feedback
{
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Column("user_id")]
    public Guid? UserId { get; set; }

    [Column("type")]
    public string Type { get; set; } = string.Empty;

    [Column("message")]
    public string Message { get; set; } = string.Empty;

    [Column("page_context")]
    public string? PageContext { get; set; }

    [Column("status")]
    public string Status { get; set; } = "open";

    [Column("admin_note")]
    public string? AdminNote { get; set; }

    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    [Column("updated_at")]
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public User? User { get; set; }
}
