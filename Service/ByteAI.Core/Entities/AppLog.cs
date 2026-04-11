namespace ByteAI.Core.Entities;

public sealed class AppLog
{
    public Guid Id { get; set; }
    public string Level { get; set; } = "error";
    public string Message { get; set; } = string.Empty;
    public string? Exception { get; set; }
    public string? Source { get; set; }
    public Guid? UserId { get; set; }
    public string? RequestPath { get; set; }
    public string? Properties { get; set; } // JSON string
    public DateTime CreatedAt { get; set; }
}
