namespace ByteAI.Core.Entities;

public sealed class NotificationType
{
    public string Key { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string? IconName { get; set; }

    public ICollection<Notification> Notifications { get; set; } = [];
}
