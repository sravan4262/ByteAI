namespace ByteAI.Core.Business.Interfaces;

public interface IDevicesBusiness
{
    Task RegisterAsync(string supabaseUserId, string platform, string token, CancellationToken ct);
    Task UnregisterAsync(string supabaseUserId, string token, CancellationToken ct);
}
