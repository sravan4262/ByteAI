namespace ByteAI.Core.Entities;

public sealed class LoggedInTodayUser
{
    public Guid UserId { get; set; }
    public string DisplayName { get; set; } = default!;
    public string Username { get; set; } = default!;
    public string? AvatarUrl { get; set; }
    public string Email { get; set; } = default!;
    public DateTimeOffset ActivityAt { get; set; }
}
