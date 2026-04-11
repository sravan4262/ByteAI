using ByteAI.Core.Infrastructure.Persistence;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Pgvector;

namespace ByteAI.Core.Events;

/// <summary>
/// Updates User.InterestEmbedding using an exponential moving average:
///   new = L2Normalize(0.85 * current + 0.15 * byte_embedding)
///
/// This gradually steers the user's interest vector toward content they engage with.
/// Fire-and-forget — failures are logged but never surface to the caller.
/// Uses IServiceScopeFactory to avoid ObjectDisposedException when called from fire-and-forget contexts.
/// </summary>
public sealed class UserEngagedWithByteEventHandler(
    IServiceScopeFactory scopeFactory,
    ILogger<UserEngagedWithByteEventHandler> logger)
    : INotificationHandler<UserEngagedWithByteEvent>
{
    private const float Alpha = 0.85f;   // weight for existing interest
    private const float Beta  = 0.15f;   // weight for new content

    public async Task Handle(UserEngagedWithByteEvent notification, CancellationToken cancellationToken)
    {
        try
        {
            using var scope = scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            var byteEmbedding = await db.Bytes
                .AsNoTracking()
                .Where(b => b.Id == notification.ByteId && b.Embedding != null)
                .Select(b => b.Embedding)
                .FirstOrDefaultAsync(CancellationToken.None);

            if (byteEmbedding is null) return;

            var user = await db.Users.FindAsync([notification.UserId], CancellationToken.None);
            if (user is null) return;

            var contentVec = byteEmbedding.ToArray();

            float[] updated;
            if (user.InterestEmbedding is null)
            {
                updated = contentVec;
            }
            else
            {
                var current = user.InterestEmbedding.ToArray();
                updated = new float[current.Length];
                for (int i = 0; i < current.Length; i++)
                    updated[i] = Alpha * current[i] + Beta * contentVec[i];
            }

            user.InterestEmbedding = new Vector(NormalizeL2(updated));
            await db.SaveChangesAsync(CancellationToken.None);

            logger.LogDebug("Updated interest embedding for user {UserId} after engaging with byte {ByteId}",
                notification.UserId, notification.ByteId);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to update interest embedding for user {UserId}", notification.UserId);
        }
    }

    private static float[] NormalizeL2(float[] v)
    {
        float norm = (float)Math.Sqrt(v.Sum(x => x * x));
        if (norm > 1e-9f)
            for (int i = 0; i < v.Length; i++)
                v[i] /= norm;
        return v;
    }
}
