using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace ByteAI.Core.Infrastructure.Cache;

/// <summary>
/// Optional Redis wrapper for feed materialisation.
/// Registered only when a Redis connection string is configured.
/// </summary>
public sealed class RedisFeedCache(IDistributedCache cache, ILogger<RedisFeedCache> logger)
{
    private static readonly DistributedCacheEntryOptions FeedTtl =
        new() { AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5) };

    private static string FeedKey(Guid userId, string filter) => $"feed:{userId}:{filter}";

    public async Task<T?> GetAsync<T>(Guid userId, string filter, CancellationToken ct = default)
    {
        try
        {
            var bytes = await cache.GetAsync(FeedKey(userId, filter), ct);
            return bytes is null ? default : JsonSerializer.Deserialize<T>(bytes);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Redis GET failed for feed:{UserId}:{Filter}", userId, filter);
            return default;
        }
    }

    public async Task SetAsync<T>(Guid userId, string filter, T value, CancellationToken ct = default)
    {
        try
        {
            var bytes = JsonSerializer.SerializeToUtf8Bytes(value);
            await cache.SetAsync(FeedKey(userId, filter), bytes, FeedTtl, ct);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Redis SET failed for feed:{UserId}:{Filter}", userId, filter);
        }
    }

    public async Task InvalidateAsync(Guid userId, CancellationToken ct = default)
    {
        foreach (var filter in new[] { "for_you", "following", "trending" })
        {
            try { await cache.RemoveAsync(FeedKey(userId, filter), ct); }
            catch (Exception ex) { logger.LogWarning(ex, "Redis REMOVE failed for feed:{UserId}:{Filter}", userId, filter); }
        }
    }
}
