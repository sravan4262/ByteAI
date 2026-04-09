namespace ByteAI.Core.Services.Notifications;

public interface INotificationService
{
    Task CreateAsync(Guid userId, string type, object payload, CancellationToken ct = default);
}
