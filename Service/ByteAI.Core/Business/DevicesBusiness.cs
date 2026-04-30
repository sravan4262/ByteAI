using ByteAI.Core.Business.Interfaces;
using ByteAI.Core.Entities;
using ByteAI.Core.Infrastructure.Persistence;
using ByteAI.Core.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;

namespace ByteAI.Core.Business;

public sealed class DevicesBusiness(AppDbContext db, ICurrentUserService currentUserService) : IDevicesBusiness
{
    private static readonly HashSet<string> ValidPlatforms = new(StringComparer.OrdinalIgnoreCase)
    {
        "ios", "android", "web"
    };

    public async Task RegisterAsync(string supabaseUserId, string platform, string token, CancellationToken ct)
    {
        var userId = await ResolveUserIdAsync(supabaseUserId, ct);
        var trimmedToken = token?.Trim() ?? string.Empty;
        if (trimmedToken.Length == 0) throw new ArgumentException("Token must not be empty.", nameof(token));
        var resolvedPlatform = ValidPlatforms.Contains(platform) ? platform.ToLowerInvariant() : "ios";

        // UPSERT semantics: token is unique app-wide. If the same physical
        // device transferred between accounts, replace the prior owner; if the
        // same user re-registers, just bump LastSeenAt.
        var existing = await db.DeviceTokens
            .FirstOrDefaultAsync(d => d.Token == trimmedToken, ct);

        if (existing is null)
        {
            db.DeviceTokens.Add(new DeviceToken
            {
                UserId = userId,
                Platform = resolvedPlatform,
                Token = trimmedToken,
            });
        }
        else
        {
            existing.UserId = userId;
            existing.Platform = resolvedPlatform;
            existing.LastSeenAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync(ct);
    }

    public async Task UnregisterAsync(string supabaseUserId, string token, CancellationToken ct)
    {
        var userId = await ResolveUserIdAsync(supabaseUserId, ct);
        var trimmedToken = token?.Trim() ?? string.Empty;
        if (trimmedToken.Length == 0) return;

        // Only delete tokens owned by the calling user — defends against a
        // signed-in user accidentally (or maliciously) deleting somebody
        // else's registration via a guessed token.
        await db.DeviceTokens
            .Where(d => d.Token == trimmedToken && d.UserId == userId)
            .ExecuteDeleteAsync(ct);
    }

    private async Task<Guid> ResolveUserIdAsync(string supabaseUserId, CancellationToken ct)
    {
        var userId = await currentUserService.GetCurrentUserIdAsync(supabaseUserId, ct);
        if (userId is null) throw new UnauthorizedAccessException("User not found.");
        return userId.Value;
    }
}
